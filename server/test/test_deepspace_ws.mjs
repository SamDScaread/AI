// 真实 socket 集成测试：两名玩家完整走过深空轮盘的建房、加入、准备、开局和第一步操作。
// 除了验证联机链路，也确保服务器下发的玩家视图不泄露私有弹序或随机状态。
import assert from 'node:assert/strict';
import net from 'node:net';
import { createHash } from 'node:crypto';
import { createWsServer } from '../lib/ws.mjs';
import { RoomManager } from '../lib/rooms.mjs';
import { attach } from '../lib/engine.mjs';
import game from '../games/deepspace.mjs';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function clientFrame(message) {
  const payload = Buffer.from(JSON.stringify(message));
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  let header;
  if (payload.length < 126) header = Buffer.from([0x81, 0x80 | payload.length]);
  else {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2);
  }
  const masked = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

function parseFrames(buf) {
  const messages = [];
  let rest = buf;
  while (rest.length >= 2) {
    const opcode = rest[0] & 0x0f;
    let len = rest[1] & 0x7f;
    let offset = 2;
    if (len === 126) { if (rest.length < 4) break; len = rest.readUInt16BE(2); offset = 4; }
    else if (len === 127) { if (rest.length < 10) break; len = rest.readUInt32BE(2) * 2 ** 32 + rest.readUInt32BE(6); offset = 10; }
    if (rest.length < offset + len) break;
    if (opcode === 0x1) {
      try { messages.push(JSON.parse(rest.subarray(offset, offset + len).toString('utf8'))); } catch { /* ignore malformed payload */ }
    }
    rest = rest.subarray(offset + len);
  }
  return { messages, rest };
}

class WsClient {
  constructor(port) {
    this.port = port;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.upgraded = false;
    this.messages = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.port, '127.0.0.1');
      this.socket.once('error', reject);
      this.socket.on('connect', () => {
        const key = Buffer.from(`client-${this.port}-${Math.random()}`).toString('base64');
        this.expectedAccept = createHash('sha1').update(key + GUID).digest('base64');
        this.socket.write(
          'GET / HTTP/1.1\r\n' +
          'Host: localhost\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\n` +
          'Sec-WebSocket-Version: 13\r\n\r\n',
        );
      });
      this.socket.on('data', (data) => {
        this.buffer = Buffer.concat([this.buffer, data]);
        if (!this.upgraded) {
          const headerEnd = this.buffer.indexOf('\r\n\r\n');
          if (headerEnd < 0) return;
          const header = this.buffer.subarray(0, headerEnd).toString();
          try {
            assert.match(header, /101 Switching Protocols/);
            assert.ok(header.includes(this.expectedAccept), 'WebSocket 握手应返回正确的 accept key');
          } catch (error) { reject(error); return; }
          this.upgraded = true;
          this.buffer = this.buffer.subarray(headerEnd + 4);
          resolve();
        }
        const parsed = parseFrames(this.buffer);
        this.buffer = parsed.rest;
        parsed.messages.forEach((message) => this.deliver(message));
      });
    });
  }

  deliver(message) {
    const index = this.messages.push(message) - 1;
    for (const waiter of [...this.waiters]) {
      if (index >= waiter.after && waiter.type === message.type && waiter.predicate(message)) {
        clearTimeout(waiter.timer);
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    }
  }

  waitFor(type, predicate = () => true, timeoutMs = 1500, after = 0) {
    const existing = this.messages.slice(after).find((message) => message.type === type && predicate(message));
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { type, predicate, resolve, reject, timer: null, after };
      waiter.timer = setTimeout(() => {
        const i = this.waiters.indexOf(waiter);
        if (i >= 0) this.waiters.splice(i, 1);
        reject(new Error(`等待服务器消息超时：${type}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  send(message) { this.socket.write(clientFrame(message)); }
  close() { this.socket?.destroy(); }
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

function close(server, clients) {
  clients.forEach((client) => client.close());
  server.close();
}

const manager = new RoomManager(game);
const server = createWsServer({ onConnection: (conn) => attach(manager, conn) });
const port = await listen(server);
const host = new WsClient(port);
const guest = new WsClient(port);

try {
  await Promise.all([host.connect(), guest.connect()]);

  host.send({ type: 'create', name: 'Host' });
  const hostJoined = await host.waitFor('joined');
  guest.send({ type: 'join', room: hostJoined.room, name: 'Guest' });
  const guestJoined = await guest.waitFor('joined');
  assert.equal(guestJoined.room, hostJoined.room, '双方应进入同一房间');

  await Promise.all([
    host.waitFor('lobby', (m) => m.players.length === 2),
    guest.waitFor('lobby', (m) => m.players.length === 2),
  ]);
  guest.send({ type: 'ready', ready: true });
  await Promise.all([
    host.waitFor('lobby', (m) => m.players.length === 2 && m.players.find((p) => p.id === guestJoined.playerId)?.ready),
    guest.waitFor('lobby', (m) => m.players.length === 2 && m.players.find((p) => p.id === guestJoined.playerId)?.ready),
  ]);

  host.send({ type: 'start' });
  const [hostState, guestState] = await Promise.all([host.waitFor('state'), guest.waitFor('state')]);
  assert.equal(hostState.view.you, hostJoined.playerId);
  assert.equal(guestState.view.you, guestJoined.playerId);
  assert.equal(hostState.view.opponent, guestJoined.playerId);
  assert.equal(guestState.view.opponent, hostJoined.playerId);
  for (const { view } of [hostState, guestState]) {
    assert.deepEqual(Object.keys(view.mag).sort(), ['blankLeft', 'fired', 'liveLeft', 'total']);
    assert.ok(!JSON.stringify(view).includes('rngState'), '玩家视图不应泄露随机状态');
    assert.ok(!JSON.stringify(view).includes('"seq"'), '玩家视图不应泄露弹序');
  }

  const shooter = hostState.view.turnId === hostJoined.playerId ? host : guest;
  shooter.send({ type: 'action', action: { type: 'shoot', target: 'opponent' } });
  const [hostEvent, guestEvent] = await Promise.all([
    host.waitFor('event', (m) => m.event.kind === 'shoot'),
    guest.waitFor('event', (m) => m.event.kind === 'shoot'),
  ]);
  assert.equal(hostEvent.event.target, 'opponent');
  assert.deepEqual(hostEvent.event, guestEvent.event, '双方应收到同一场公开事件');
  const [hostNext, guestNext] = await Promise.all([host.waitFor('state', (m) => m.view.mag.fired === 1), guest.waitFor('state', (m) => m.view.mag.fired === 1)]);
  assert.equal(hostNext.view.mag.total, 4);
  assert.equal(guestNext.view.mag.total, 4);

  // 将当前对局推进到“怜悯抉择”，再由胜者拒绝怜悯，真实走到 OVER。
  const room = manager.get(hostJoined.room);
  const finisherId = room.state.players[room.state.turn].id;
  const loserId = room.state.players.find((p) => p.id !== finisherId).id;
  room.state.roundWins[finisherId] = 1;
  room.state.hp[loserId] = 1;
  room.state.shield[loserId] = false;
  room.state.mag.seq[room.state.mag.idx] = true;
  const finisher = finisherId === hostJoined.playerId ? host : guest;
  const hostMercyMark = host.messages.length;
  const guestMercyMark = guest.messages.length;
  finisher.send({ type: 'action', action: { type: 'shoot', target: 'opponent' } });
  await Promise.all([
    host.waitFor('state', (m) => m.view.phase === 'mercy_choice', 1500, hostMercyMark),
    guest.waitFor('state', (m) => m.view.phase === 'mercy_choice', 1500, guestMercyMark),
  ]);
  const hostOverMark = host.messages.length;
  const guestOverMark = guest.messages.length;
  finisher.send({ type: 'action', action: { type: 'mercy', choice: 'decline' } });
  await Promise.all([
    host.waitFor('over', () => true, 1500, hostOverMark),
    guest.waitFor('over', () => true, 1500, guestOverMark),
  ]);

  // 双方确认后，服务器应在同一房间自动生成全新的对局状态。
  const hostRematchMark = host.messages.length;
  const guestRematchMark = guest.messages.length;
  host.send({ type: 'rematch', ready: true });
  const pending = await host.waitFor('rematch', (m) => m.players.find((p) => p.id === hostJoined.playerId)?.rematch === true, 1500, hostRematchMark);
  assert.equal(pending.players.find((p) => p.id === guestJoined.playerId)?.rematch, false, '单方确认只能等待');
  assert.equal(room.phase, 'over', '单方确认不能提前开局');
  guest.send({ type: 'rematch', ready: true });
  const [hostRematchState, guestRematchState] = await Promise.all([
    host.waitFor('state', (m) => m.view.matchRound === 1 && m.view.mag.fired === 0, 1500, hostRematchMark),
    guest.waitFor('state', (m) => m.view.matchRound === 1 && m.view.mag.fired === 0, 1500, guestRematchMark),
  ]);
  assert.equal(room.phase, 'playing');
  assert.equal(hostRematchState.view.you, hostJoined.playerId, '再战保持原玩家身份');
  assert.equal(guestRematchState.view.you, guestJoined.playerId, '再战保持原玩家身份');
  assert.equal(hostRematchState.view.roundWins[hostJoined.playerId], 0, '新局清空战绩');
  assert.equal(guestRematchState.view.roundWins[guestJoined.playerId], 0, '新局清空战绩');
  console.log('  ✓ 深空轮盘双客户端：建房/加入/准备/开局/行动/同房再战 + 弹序保密');
} finally {
  close(server, [host, guest]);
}
