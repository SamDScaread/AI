// 示例玩法：取石子 (Nim)。
// A demo game that exercises the whole netcode end to end. It is intentionally
// tiny and theme-neutral.  When the real game design is locked, write a new
// module with the same four exported functions and point server.mjs at it —
// nothing in lib/ needs to change.
//
// 规则：桌上 21 颗石子，轮流取 1~3 颗，取到最后一颗的人输。
const START_STONES = 21;
const MAX_TAKE = 3;

export default {
  id: 'nim',
  name: '取石子 / Nim',
  minPlayers: 2,
  maxPlayers: 8,

  // 开局状态（这是服务器私有的"真相"）。
  createInitialState(players) {
    return {
      pile: START_STONES,
      maxTake: MAX_TAKE,
      players: players.map((p) => ({ id: p.id, name: p.name })),
      turn: 0,          // 轮到 players[turn] 行动
      lastTake: null,   // 最近一次取了多少
      loserId: null,    // 取到最后一颗的人
    };
  },

  // 校验并应用一次操作。非法时 throw {code, message}，引擎会转成 ERROR 回给玩家。
  applyAction(state, playerId, action) {
    const current = state.players[state.turn];
    if (current.id !== playerId) throw { code: 'not_your_turn', message: '还没轮到你。' };
    const limit = Math.min(state.maxTake, state.pile);
    const take = Number(action && action.take);
    if (!Number.isInteger(take) || take < 1 || take > limit) {
      throw { code: 'bad_take', message: `只能取 1~${limit} 颗。` };
    }
    const next = { ...state, players: [...state.players] };
    next.pile -= take;
    next.lastTake = { by: playerId, take };
    const events = [{ kind: 'take', by: current.name, take, left: next.pile }];
    if (next.pile <= 0) {
      next.loserId = playerId;                              // 取到最后一颗 -> 输
    } else {
      next.turn = (state.turn + 1) % state.players.length;  // 交给下一个人
    }
    return { state: next, events };
  },

  // Nim 没有隐藏信息，所有人看到同样的视图。
  // （真正的霰弹枪玩法会在这里隐藏弹仓顺序——这正是这个函数存在的意义。）
  viewFor(state /* , playerId */) {
    return {
      pile: state.pile,
      maxTake: state.maxTake,
      players: state.players,
      turnId: state.players[state.turn]?.id ?? null,
      lastTake: state.lastTake,
      loserId: state.loserId,
    };
  },

  result(state) {
    if (state.loserId == null) return { over: false };
    const idx = state.players.findIndex((p) => p.id === state.loserId);
    const winner = state.players[(idx + 1) % state.players.length]; // 下一位算赢家(多人时为简化处理)
    return { over: true, winnerId: winner ? winner.id : null };
  },
};
