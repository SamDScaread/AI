// 房间与玩家管理 / Rooms and players.
// 这里不碰 socket：每个玩家只持有一个有 .send() 方法的 conn，因此可单元测试。
import { PHASE } from '../../shared/protocol.mjs';

// 去掉易混淆字符(0/O/1/I) 的房间码字符集。
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = (n = 4) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

let nextPlayerId = 1;

export class Room {
  constructor(code, game) {
    this.code = code;
    this.game = game;            // 当前房间使用的玩法模块
    this.players = new Map();    // id -> {id, name, ready, host, conn}
    this.phase = PHASE.LOBBY;
    this.state = null;           // 开局后保存游戏真实状态
  }
  get list() { return [...this.players.values()]; }
  get hostId() { return this.list.find((p) => p.host)?.id ?? null; }

  add(name, conn) {
    const id = nextPlayerId++;
    const host = this.players.size === 0;            // 第一个进来的人当房主
    const clean = String(name || `Player${id}`).slice(0, 20);
    const player = { id, name: clean, ready: false, host, conn };
    this.players.set(id, player);
    return player;
  }
  remove(id) {
    const wasHost = this.players.get(id)?.host;
    this.players.delete(id);
    if (wasHost) { const next = this.list[0]; if (next) next.host = true; } // 房主走了顺位继承
  }
  isFull() { return this.players.size >= this.game.maxPlayers; }
  broadcast(msg) { for (const p of this.players.values()) p.conn.send(msg); }
}

export class RoomManager {
  constructor(game) { this.game = game; this.rooms = new Map(); }
  create() {
    let code;
    do { code = makeCode(); } while (this.rooms.has(code));
    const room = new Room(code, this.game);
    this.rooms.set(code, room);
    return room;
  }
  get(code) { return this.rooms.get(String(code || '').toUpperCase()); }
  destroyIfEmpty(room) { if (room.players.size === 0) this.rooms.delete(room.code); }
}
