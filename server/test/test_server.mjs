// 房间 + 引擎 + 玩法的单元测试（无需真实网络，用假连接驱动）。
// Unit tests for rooms + engine + game module, driven by fake connections.
import assert from 'assert';
import { RoomManager } from '../lib/rooms.mjs';
import { attach } from '../lib/engine.mjs';
import { C2S, S2C } from '../../shared/protocol.mjs';
import game from '../games/nim.mjs';

// 一个最小的"连接"替身：记录收到的消息，并能模拟客户端发来的消息。
function fakeConn() {
  return {
    sent: [],
    _h: {},
    on(ev, fn) { (this._h[ev] ||= []).push(fn); },
    emit(ev, ...a) { (this._h[ev] || []).forEach((fn) => fn(...a)); },
    send(msg) { this.sent.push(msg); },
    recv(type) { return [...this.sent].reverse().find((m) => m.type === type); },
  };
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓', name); }

test('建房 + 加入 = 一个两人大厅', () => {
  const m = new RoomManager(game);
  const a = fakeConn(); attach(m, a);
  a.emit('message', { type: C2S.CREATE, name: 'Alice' });
  const joined = a.recv(S2C.JOINED);
  assert.ok(joined && joined.room, '房主收到 JOINED 和房间码');

  const b = fakeConn(); attach(m, b);
  b.emit('message', { type: C2S.JOIN, room: joined.room, name: 'Bob' });
  const lobby = b.recv(S2C.LOBBY);
  assert.equal(lobby.players.length, 2, '大厅里有两个人');
  assert.equal(lobby.players[0].host, true, '第一个人是房主');
  assert.equal(lobby.players[1].host, false);
});

test('只有房主能开始，且需要全员准备', () => {
  const m = new RoomManager(game);
  const a = fakeConn(); attach(m, a);
  a.emit('message', { type: C2S.CREATE, name: 'A' });
  const code = a.recv(S2C.JOINED).room;
  const b = fakeConn(); attach(m, b);
  b.emit('message', { type: C2S.JOIN, room: code, name: 'B' });

  b.emit('message', { type: C2S.START });
  assert.equal(b.recv(S2C.ERROR).code, 'not_host', '非房主开始 -> not_host');

  a.emit('message', { type: C2S.START });
  assert.equal(a.recv(S2C.ERROR).code, 'not_ready', 'B 未准备 -> not_ready');

  b.emit('message', { type: C2S.READY, ready: true });
  a.emit('message', { type: C2S.START });
  assert.equal(a.recv(S2C.STATE).view.pile, 21, '开局后下发初始状态');
});

test('找不到的房间 / 满员 的报错', () => {
  const m = new RoomManager(game);
  const x = fakeConn(); attach(m, x);
  x.emit('message', { type: C2S.JOIN, room: 'ZZZZ', name: 'X' });
  assert.equal(x.recv(S2C.ERROR).code, 'no_room');
});

test('完整跑一局 Nim 直到分出胜负', () => {
  const m = new RoomManager(game);
  const a = fakeConn(); attach(m, a);
  a.emit('message', { type: C2S.CREATE, name: 'A' });
  const code = a.recv(S2C.JOINED).room;
  const aId = a.recv(S2C.JOINED).playerId;
  const b = fakeConn(); attach(m, b);
  b.emit('message', { type: C2S.JOIN, room: code, name: 'B' });
  const bId = b.recv(S2C.JOINED).playerId;
  b.emit('message', { type: C2S.READY, ready: true });
  a.emit('message', { type: C2S.START });

  const latestView = () => (a.recv(S2C.STATE) || b.recv(S2C.STATE)).view;
  const over = () => a.recv(S2C.OVER) || b.recv(S2C.OVER);
  let guard = 0;
  while (!over() && guard++ < 100) {
    const v = latestView();
    const conn = v.turnId === aId ? a : b;
    conn.emit('message', { type: C2S.ACTION, action: { take: 1 } }); // 每次取 1 颗
  }
  const result = over();
  assert.ok(result, '对局正常结束');
  assert.ok(result.winnerId === aId || result.winnerId === bId, '产生了一个赢家');
});

test('双方确认后可在同一房间自动再战', () => {
  const m = new RoomManager(game);
  const a = fakeConn(); attach(m, a);
  a.emit('message', { type: C2S.CREATE, name: 'A' });
  const joinedA = a.recv(S2C.JOINED);
  const code = joinedA.room;
  const aId = joinedA.playerId;
  const b = fakeConn(); attach(m, b);
  b.emit('message', { type: C2S.JOIN, room: code, name: 'B' });
  const bId = b.recv(S2C.JOINED).playerId;
  b.emit('message', { type: C2S.READY, ready: true });
  a.emit('message', { type: C2S.START });

  let guard = 0;
  while (!(a.recv(S2C.OVER) || b.recv(S2C.OVER)) && guard++ < 100) {
    const view = a.recv(S2C.STATE).view;
    (view.turnId === aId ? a : b).emit('message', { type: C2S.ACTION, action: { take: 1 } });
  }
  assert.ok(a.recv(S2C.OVER) || b.recv(S2C.OVER), '第一局正常结束');

  a.emit('message', { type: C2S.REMATCH, ready: true });
  let pending = a.recv(S2C.REMATCH);
  assert.equal(pending.room, code, '再战留在原房间');
  assert.equal(pending.players.find((p) => p.id === aId).rematch, true);
  assert.equal(pending.players.find((p) => p.id === bId).rematch, false);
  assert.equal(m.get(code).phase, 'over', '单方确认不能提前开始');

  b.emit('message', { type: C2S.REMATCH, ready: true });
  const room = m.get(code);
  assert.equal(room.phase, 'playing', '双方确认后服务器自动开启新局');
  assert.equal(room.state.pile, 21, '新局恢复初始状态');
  assert.equal(room.list.find((p) => p.id === aId).rematch, false, '确认状态不泄漏到下一局');
  assert.equal(room.list.find((p) => p.id === bId).rematch, false);
  assert.equal(a.recv(S2C.STATE).view.pile, 21);
  assert.equal(b.recv(S2C.STATE).view.pile, 21);
});

test('非法操作被拒绝（没轮到 / 取太多）', () => {
  const m = new RoomManager(game);
  const a = fakeConn(); attach(m, a);
  a.emit('message', { type: C2S.CREATE, name: 'A' });
  const code = a.recv(S2C.JOINED).room;
  const aId = a.recv(S2C.JOINED).playerId;
  const b = fakeConn(); attach(m, b);
  b.emit('message', { type: C2S.JOIN, room: code, name: 'B' });
  b.emit('message', { type: C2S.READY, ready: true });
  a.emit('message', { type: C2S.START });

  a.emit('message', { type: C2S.REMATCH, ready: true });
  assert.equal(a.recv(S2C.ERROR).code, 'not_over', '未结束的对局不能请求再战');

  // 开局轮到 A。B 抢着操作 -> not_your_turn
  b.emit('message', { type: C2S.ACTION, action: { take: 1 } });
  assert.equal(b.recv(S2C.ERROR).code, 'not_your_turn');
  // A 一次取 4 颗 -> bad_take
  a.emit('message', { type: C2S.ACTION, action: { take: 4 } });
  assert.equal(a.recv(S2C.ERROR).code, 'bad_take');
  void aId;
});

console.log(`\n房间/引擎/玩法测试全部通过 (${passed}).`);
