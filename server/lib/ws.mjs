// 一个不依赖任何 npm 包的最小 WebSocket 服务器。
// A minimal, dependency-free WebSocket server (RFC 6455, the subset we need:
// text frames, ping/pong, close, and message fragmentation).
//
// 它只做"传输层"：把字节流变成一条条 JSON 消息，再把对象编码成帧发回去。
// 房间/游戏逻辑完全不碰 socket，因此可以脱离网络单元测试（见 test/）。
import { createServer } from 'http';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const acceptKey = (key) => createHash('sha1').update(key + GUID).digest('base64');

// 服务器发给客户端的帧不加掩码 / server->client frames are never masked.
function encodeText(str) {
  const payload = Buffer.from(str);
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127;
    header.writeUInt32BE(Math.floor(len / 2 ** 32), 2);
    header.writeUInt32BE(len >>> 0, 6);
  }
  return Buffer.concat([header, payload]);
}
const encodeClose = (code = 1000) => {
  const p = Buffer.alloc(2); p.writeUInt16BE(code, 0);
  return Buffer.concat([Buffer.from([0x88, 2]), p]);
};
const encodePong = (payload) =>
  Buffer.concat([Buffer.from([0x8a, payload.length]), payload]);

// 单个连接：对外暴露 send(obj) / close() / on('message'|'close')。
class Conn extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.alive = true;
    this._buf = Buffer.alloc(0);
    this._fragOpcode = null;
    this._fragChunks = [];
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => { this.alive = false; this.emit('close'); });
    socket.on('error', () => { /* 客户端断线时静默处理 */ });
  }
  _sendRaw(buf) { if (this.alive) { try { this.socket.write(buf); } catch { /* ignore */ } } }
  send(obj) { this._sendRaw(encodeText(typeof obj === 'string' ? obj : JSON.stringify(obj))); }
  close(code = 1000) { try { this.socket.write(encodeClose(code)); this.socket.end(); } catch { /* ignore */ } this.alive = false; }

  _onData(d) {
    this._buf = Buffer.concat([this._buf, d]);
    let frame;
    while ((frame = this._parse())) this._handleFrame(frame);
  }
  // 解析出一个完整帧；数据不够则返回 null 等待更多字节。
  _parse() {
    const b = this._buf;
    if (b.length < 2) return null;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let offset = 2;
    if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); offset = 4; }
    else if (len === 127) { if (b.length < 10) return null; len = b.readUInt32BE(2) * 2 ** 32 + b.readUInt32BE(6); offset = 10; }
    let maskKey;
    if (masked) { if (b.length < offset + 4) return null; maskKey = b.subarray(offset, offset + 4); offset += 4; }
    if (b.length < offset + len) return null;
    let payload = b.subarray(offset, offset + len);
    if (masked) {
      const out = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) out[i] = payload[i] ^ maskKey[i & 3];
      payload = out;
    }
    this._buf = b.subarray(offset + len);
    return { fin, opcode, payload };
  }
  _handleFrame(f) {
    switch (f.opcode) {
      case 0x8: this.close(); break;                       // close
      case 0x9: this._sendRaw(encodePong(f.payload)); break; // ping -> pong
      case 0xa: break;                                      // pong (ignore)
      case 0x0:                                             // continuation
        this._fragChunks.push(f.payload);
        if (f.fin) { this._deliver(this._fragOpcode, Buffer.concat(this._fragChunks)); this._fragOpcode = null; this._fragChunks = []; }
        break;
      case 0x1: case 0x2:                                   // text / binary
        if (f.fin) this._deliver(f.opcode, f.payload);
        else { this._fragOpcode = f.opcode; this._fragChunks = [f.payload]; }
        break;
      default: break;
    }
  }
  _deliver(opcode, payload) {
    if (opcode !== 0x1) return;                             // 我们只用文本(JSON)
    let msg;
    try { msg = JSON.parse(payload.toString('utf8')); } catch { return; }
    this.emit('message', msg);
  }
}

// 启动一个同时支持 HTTP 健康检查和 WebSocket 升级的服务器。
// 免费托管平台(Render/Railway/Fly) 会定期请求 healthPath 判断服务是否存活。
export function createWsServer({ onConnection, healthPath = '/healthz' }) {
  const server = createServer((req, res) => {
    if (req.url === healthPath || req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok');
    } else {
      res.writeHead(426, { 'content-type': 'text/plain' }); res.end('Upgrade Required');
    }
  });
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    onConnection(new Conn(socket));
  });
  return server;
}
