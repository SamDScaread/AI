// 引擎：把"网络消息"翻译成"对房间/玩法的操作"。
// The engine wires incoming protocol messages to room + game-module actions.
// 它对具体玩法一无所知，只依赖 games/*.mjs 暴露的契约：
//   createInitialState(players) -> state
//   applyAction(state, playerId, action) -> { state, events }   (非法操作请 throw {code,message})
//   viewFor(state, playerId) -> view        (隐藏其他人不该看到的信息)
//   result(state) -> { over:Boolean, winnerId? }
import { C2S, S2C, PHASE } from '../../shared/protocol.mjs';

export const lobbyMsg = (room) => ({
  type: S2C.LOBBY,
  room: room.code,
  phase: room.phase,
  players: room.list.map((p) => ({ id: p.id, name: p.name, ready: p.ready, host: p.host })),
});

// 按每个玩家各自的视角下发状态（关键：隐藏信息在这里被裁剪）。
export function sendState(room) {
  for (const p of room.players.values()) {
    p.conn.send({ type: S2C.STATE, view: room.game.viewFor(room.state, p.id) });
  }
}

export function startGame(room) {
  room.state = room.game.createInitialState(room.list.map((p) => ({ id: p.id, name: p.name })));
  room.phase = PHASE.PLAYING;
  room.broadcast(lobbyMsg(room));
  sendState(room);
}

// 为一个新连接挂上消息处理。每个连接有自己的 ctx(当前房间/玩家)。
export function attach(manager, conn) {
  const ctx = { room: null, player: null };
  const fail = (code, message) => conn.send({ type: S2C.ERROR, code, message });

  function cleanup() {
    const { room, player } = ctx;
    if (!room || !player) return;
    room.remove(player.id);
    ctx.room = null; ctx.player = null;
    if (room.players.size === 0) { manager.destroyIfEmpty(room); return; }
    room.broadcast(lobbyMsg(room));
    // 对局中人数掉到下限以下：直接判定剩下的人获胜并结束。
    if (room.phase === PHASE.PLAYING && room.players.size < room.game.minPlayers) {
      room.phase = PHASE.OVER;
      room.broadcast({ type: S2C.OVER, winnerId: room.list[0]?.id ?? null, view: null });
    }
  }

  conn.on('message', (msg) => {
    try {
      switch (msg && msg.type) {
        case C2S.PING:
          conn.send({ type: S2C.PONG });
          break;

        case C2S.CREATE: {
          if (ctx.room) return fail('already_in_room', '你已经在一个房间里了。');
          const room = manager.create();
          ctx.room = room;
          ctx.player = room.add(msg.name, conn);
          conn.send({ type: S2C.JOINED, room: room.code, playerId: ctx.player.id });
          room.broadcast(lobbyMsg(room));
          break;
        }

        case C2S.JOIN: {
          if (ctx.room) return fail('already_in_room', '你已经在一个房间里了。');
          const room = manager.get(msg.room);
          if (!room) return fail('no_room', '找不到这个房间。');
          if (room.phase !== PHASE.LOBBY) return fail('in_progress', '该房间的对局已经开始了。');
          if (room.isFull()) return fail('full', '房间已满。');
          ctx.room = room;
          ctx.player = room.add(msg.name, conn);
          conn.send({ type: S2C.JOINED, room: room.code, playerId: ctx.player.id });
          room.broadcast(lobbyMsg(room));
          break;
        }

        case C2S.READY: {
          if (!ctx.player) return fail('no_room', '请先加入一个房间。');
          ctx.player.ready = !!msg.ready;
          ctx.room.broadcast(lobbyMsg(ctx.room));
          break;
        }

        case C2S.START: {
          const room = ctx.room;
          if (!room) return fail('no_room', '请先加入一个房间。');
          if (!ctx.player.host) return fail('not_host', '只有房主能开始游戏。');
          if (room.phase !== PHASE.LOBBY) return fail('in_progress', '对局已经开始了。');
          if (room.players.size < room.game.minPlayers) return fail('too_few', `至少需要 ${room.game.minPlayers} 名玩家。`);
          if (!room.list.every((p) => p.ready || p.host)) return fail('not_ready', '所有人都准备好才能开始。');
          startGame(room);
          break;
        }

        case C2S.ACTION: {
          const room = ctx.room;
          if (!room || room.phase !== PHASE.PLAYING) return fail('not_playing', '当前没有进行中的对局。');
          let res;
          try {
            res = room.game.applyAction(room.state, ctx.player.id, msg.action);
          } catch (e) {
            return fail(e.code || 'bad_action', e.message || '无效操作。');
          }
          room.state = res.state;
          for (const ev of res.events || []) room.broadcast({ type: S2C.EVENT, event: ev });
          const outcome = room.game.result(room.state);
          if (outcome.over) {
            room.phase = PHASE.OVER;
            for (const p of room.players.values()) {
              p.conn.send({ type: S2C.OVER, winnerId: outcome.winnerId, view: room.game.viewFor(room.state, p.id) });
            }
          } else {
            sendState(room);
          }
          break;
        }

        case C2S.LEAVE:
          cleanup();
          break;

        default:
          fail('unknown', '未知的消息类型。');
      }
    } catch {
      fail('server_error', '服务器出错了。');
    }
  });

  conn.on('close', cleanup);
}
