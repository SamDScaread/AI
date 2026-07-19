// 冒烟测试：用一个真实 TCP 连接验证手写的 WebSocket 握手与收发是否正确。
// Smoke test: open a real socket, do the WS handshake, send a CREATE frame,
// and assert a JOINED frame comes back. Exercises lib/ws.mjs for real.
import assert from 'assert';
import net from 'net';
import { createHash } from 'crypto';
import { createWsServer } from '../lib/ws.mjs';
import { RoomManager } from '../lib/rooms.mjs';
import { attach } from '../lib/engine.mjs';
import game from '../games/nim.mjs';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const PORT = 34567;

const manager = new RoomManager(game);
const server = createWsServer({ onConnection: (c) => attach(manager, c) });

// 客户端帧必须加掩码 / browser & RFC require client frames to be masked.
function clientFrame(str) {
  const payload = Buffer.from(str);
  const len = payload.length;
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const head = len < 126
    ? Buffer.from([0x81, 0x80 | len])
    : (() => { const h = Buffer.alloc(4); h[0] = 0x81; h[1] = 0x80 | 126; h.writeUInt16BE(len, 2); return h; })();
  const masked = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
  return Buffer.concat([head, mask, masked]);
}

// 从缓冲区里解析出服务器发来的（不加掩码的）文本帧。
function parseFrames(buf) {
  const out = [];
  let b = buf;
  while (b.length >= 2) {
    const opcode = b[0] & 0x0f;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) { if (b.length < 4) break; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) break;
    if (b.length < off + len) break;
    if (opcode === 0x1) out.push(b.subarray(off, off + len).toString('utf8'));
    b = b.subarray(off + len);
  }
  return { messages: out, rest: b };
}

server.listen(PORT, () => {
  const key = Buffer.from('0123456789abcdef').toString('base64');
  const expectAccept = createHash('sha1').update(key + GUID).digest('base64');
  const sock = net.connect(PORT, '127.0.0.1', () => {
    sock.write(
      'GET / HTTP/1.1\r\n' +
      'Host: localhost\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Key: ${key}\r\n` +
      'Sec-WebSocket-Version: 13\r\n\r\n',
    );
  });

  let upgraded = false;
  let acc = Buffer.alloc(0);
  const msgs = [];

  sock.on('data', (d) => {
    acc = Buffer.concat([acc, d]);
    if (!upgraded) {
      const idx = acc.indexOf('\r\n\r\n');
      if (idx < 0) return;
      const header = acc.slice(0, idx).toString();
      assert.ok(/101 Switching Protocols/.test(header), '收到 101 握手响应');
      assert.ok(header.includes(expectAccept), 'Sec-WebSocket-Accept 正确');
      upgraded = true;
      acc = acc.subarray(idx + 4);
      sock.write(clientFrame(JSON.stringify({ type: 'create', name: 'Smoke' })));
    }
    const { messages, rest } = parseFrames(acc);
    acc = rest;
    msgs.push(...messages);
  });

  setTimeout(() => {
    const parsed = msgs.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const joined = parsed.find((m) => m.type === 'joined');
    assert.ok(joined, '通过真实 socket 收到了 JOINED');
    assert.ok(joined.playerId, 'JOINED 带有 playerId');
    console.log('  ✓ WebSocket 握手 + 真实 socket 收发 JOINED');
    sock.end();
    server.close();
    console.log('\nWebSocket 冒烟测试通过。');
    process.exit(0);
  }, 300);
});

server.on('error', (e) => { console.error('smoke server error', e); process.exit(1); });
