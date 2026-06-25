// 玩法：《深空轮盘》/ Deep-Space Standoff
// ----------------------------------------------------------------------------
// 实弹/空弹轮流对决（机制通用，主题/命名/剧情原创）。本模块是**纯函数式**规则引擎，
// 不依赖任何 Node API，因此既能跑在 server/ 上做真人联机，也能直接 import 进浏览器
// 跑「单人 vs AI」。它实现 games/*.mjs 的契约：
//   createInitialState(players[, opts]) -> state   (服务器私有"真相"，含隐藏弹序)
//   applyAction(state, playerId, action) -> { state, events }
//   viewFor(state, playerId) -> view               (裁掉对手不该看到的弹序)
//   result(state) -> { over, winnerId? }
//
// 赛制（见 docs/game-design.md）：
//   · 三局递减血量：第1局4血 / 第2局3血 / 决胜局2血，先赢两局者拿下整场。
//   · 弹仓递增压迫：首轮1实4空，每次重新装填实弹+1、空弹-1，直到只剩1发空弹。
//   · 道具分阶段开放：第1局仅扫描仪+过载芯且量少，越往后种类/数量越多，怜悯局最多。
//   · 怜悯决战：胜者可赦免败者复活终极对决，胜者再赢得双倍奖励、若输则双倍惩罚。

// ---- 可调参数 ----------------------------------------------------------------
const HP_BY_ROUND = { 1: 4, 2: 3, 3: 2 }; // 每局初始血量
const MERCY_HP = 2;                        // 怜悯决战双方血量
const ROUNDS_TO_WIN = 2;                   // 三局两胜
const INV_CAP = 4;                         // 手持道具上限
const MAG_TOTAL = 5;                       // 每个弹仓总弹数（实弹随进程递增、空弹递减）
const REWARD = 1;                          // 普通胜利的奖励（怜悯翻倍）

// 道具池随阶段开放（phaseKey: 1 | 2 | 3 | 'mercy'）
const ITEM_POOL = {
  1: ['scanner', 'overload'],
  2: ['scanner', 'overload', 'smoke', 'ejector'],
  3: ['scanner', 'overload', 'smoke', 'ejector', 'maglock'],
  mercy: ['scanner', 'overload', 'smoke', 'ejector', 'maglock'],
};
// 每次装填发给每人的道具数
const ITEMS_PER_RELOAD = { 1: 1, 2: 1, 3: 2, mercy: 2 };

export const ITEM_META = {
  smoke:    { label: '万宝路牌香烟', icon: '🚬', desc: '立即回 1 点血（不超过本局上限）' },
  scanner:  { label: '扫描仪',       icon: '🔍', desc: '偷看当前这一发是实是空（只有你看到）' },
  ejector:  { label: '退弹器',       icon: '⏏️', desc: '退掉当前这一发、不开枪（会当众暴露）' },
  maglock:  { label: '磁锁',         icon: '🔒', desc: '跳过对手的下一个回合' },
  overload: { label: '过载芯',       icon: '⚡', desc: '本回合这一枪若命中，伤害 ×2' },
};

// ---- 内部工具 ----------------------------------------------------------------
// 确定性 RNG（mulberry32），把随机种子作为可序列化的 number 存进 state，
// 这样 structuredClone 不会丢状态、测试也能复现。
function nextRandom(state) {
  state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (state, n) => Math.floor(nextRandom(state) * n);

const nameOf = (state, id) => state.players.find((p) => p.id === id)?.name ?? id;
const otherId = (state, id) => state.players.find((p) => p.id !== id).id;
const phaseKey = (state) => (state.phase === 'mercy_duel' ? 'mercy' : state.matchRound);
const roundHpMax = (state) => (state.phase === 'mercy_duel' ? MERCY_HP : HP_BY_ROUND[state.matchRound]);

// 本次装填的实/空配比：实弹随装填次数递增，最少留 1 发空弹。
function rollMagazine(reloadCount) {
  const live = Math.min(reloadCount + 1, MAG_TOTAL - 1);
  return { live, blank: MAG_TOTAL - live, total: MAG_TOTAL };
}

// 装填一个新弹仓（顺序打乱，存进服务器私有 state，客户端永远拿不到顺序）。
function reload(state, events, { grant = true } = {}) {
  const m = rollMagazine(state.reloadCount);
  const seq = [];
  for (let i = 0; i < m.live; i++) seq.push(true);
  for (let i = 0; i < m.blank; i++) seq.push(false);
  for (let i = seq.length - 1; i > 0; i--) {
    const j = randInt(state, i + 1);
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  state.mag = { seq, idx: 0, live: m.live, blank: m.blank, total: m.total };
  state.scanned = {};
  state.reloadCount += 1;
  if (grant) grantItems(state);
  if (events) events.push({ kind: 'reload', live: m.live, blank: m.blank, total: m.total });
}

function grantItems(state) {
  const key = phaseKey(state);
  const pool = ITEM_POOL[key];
  const n = ITEMS_PER_RELOAD[key];
  for (const p of state.players) {
    const inv = state.items[p.id];
    for (let i = 0; i < n && inv.length < INV_CAP; i++) inv.push(pool[randInt(state, pool.length)]);
  }
}

function startRound(state, roundNo, starterId, events) {
  state.phase = 'duel';
  state.matchRound = roundNo;
  for (const p of state.players) {
    state.hp[p.id] = HP_BY_ROUND[roundNo];
    state.items[p.id] = [];
    state.skipNext[p.id] = false;
    state.buff[p.id] = 1;
  }
  state.scanned = {};
  state.turn = state.players.findIndex((p) => p.id === starterId);
  reload(state, null); // 本局第一仓静默装填（计数走 view，不广播事件）
  if (events) events.push({ kind: 'round_start', round: roundNo, hp: { ...state.hp }, live: state.mag.live, blank: state.mag.blank });
}

function startMercyDuel(state, events) {
  state.phase = 'mercy_duel';
  for (const p of state.players) {
    state.hp[p.id] = MERCY_HP;
    state.items[p.id] = [];
    state.skipNext[p.id] = false;
    state.buff[p.id] = 1;
  }
  state.scanned = {};
  state.turn = state.players.findIndex((p) => p.id === state.mercyTakerId); // 被赦免者先手
  reload(state, events);
}

// 交还回合（处理磁锁：若对手被锁则跳过、回合留在原地）。
function passTurn(state, events) {
  const cur = state.players[state.turn].id;
  const nxt = otherId(state, cur);
  if (state.skipNext[nxt]) {
    state.skipNext[nxt] = false;
    events.push({ kind: 'skip', who: nameOf(state, nxt) });
    return; // 回合留在 cur
  }
  state.turn = state.players.findIndex((p) => p.id === nxt);
}

// 一局/一场结束的收尾。
function endRound(state, loserId, events) {
  const winnerId = otherId(state, loserId);

  if (state.phase === 'mercy_duel') {
    state.phase = 'finished';
    state.winnerId = winnerId;
    const giver = state.mercyGiverId;
    if (winnerId === giver) {
      state.credits[giver] += 2 * REWARD; // 赦免后仍胜 -> 双倍奖励
    } else {
      state.credits[giver] -= 2 * REWARD; // 赦免后落败 -> 双倍惩罚
      state.credits[winnerId] += REWARD;  // 濒死翻盘者的奖励
    }
    events.push({ kind: 'match_end', winner: nameOf(state, winnerId), winnerId, viaMercy: true, credits: { ...state.credits } });
    return;
  }

  state.roundWins[winnerId] += 1;
  events.push({
    kind: 'round_end', round: state.matchRound,
    winner: nameOf(state, winnerId), loser: nameOf(state, loserId),
    roundWins: { ...state.roundWins },
  });

  if (state.roundWins[winnerId] >= ROUNDS_TO_WIN) {
    state.matchWinnerId = winnerId;
    state.matchLoserId = loserId;
    state.phase = 'mercy_choice';
    events.push({ kind: 'mercy_offer', winner: nameOf(state, winnerId), winnerId });
  } else {
    startRound(state, state.matchRound + 1, loserId, events); // 败者先手，给翻盘机会
  }
}

// 开一枪：返回 { isLive, keepTurn, victimId }，不负责回合/结算（交给调用方）。
function fire(state, shooterId, target, events) {
  const isLive = state.mag.seq[state.mag.idx] === true;
  state.mag.idx += 1;
  state.scanned = {}; // 这一发已离膛，所有扫描结果作废
  const victimId = target === 'self' ? shooterId : otherId(state, shooterId);
  const buff = state.buff[shooterId] || 1;
  let damage = 0;
  if (isLive) {
    damage = buff;
    state.hp[victimId] = Math.max(0, state.hp[victimId] - damage);
  }
  state.buff[shooterId] = 1; // 过载芯只作用这一枪
  events.push({
    kind: 'shoot', by: nameOf(state, shooterId), byId: shooterId, target,
    shell: isLive ? 'live' : 'blank', damage,
    victim: nameOf(state, victimId), victimId, hp: { ...state.hp },
  });
  return { isLive, keepTurn: target === 'self' && !isLive, victimId };
}

// ---- 契约实现 ----------------------------------------------------------------
const game = {
  id: 'deepspace',
  name: '深空轮盘 / Deep-Space Standoff',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(players, opts = {}) {
    const state = {
      players: players.map((p) => ({ id: p.id, name: p.name })),
      phase: 'duel',
      matchRound: 1,
      hp: {}, roundWins: {}, credits: {}, items: {}, skipNext: {}, buff: {}, scanned: {},
      reloadCount: 0, mag: null, turn: 0,
      matchWinnerId: null, matchLoserId: null, mercyGiverId: null, mercyTakerId: null,
      winnerId: null,
      rngState: (opts.seed >>> 0) || (Math.floor(Math.random() * 0x100000000) >>> 0),
      log: [],
    };
    for (const p of state.players) {
      state.roundWins[p.id] = 0;
      state.credits[p.id] = 0;
    }
    const starter = state.players[randInt(state, state.players.length)].id;
    startRound(state, 1, starter, null);
    return state;
  },

  applyAction(state, playerId, action) {
    const next = structuredClone(state);
    const events = [];
    const a = action || {};

    // —— 怜悯抉择阶段：只有整场胜者能决定赦免/处决 ——
    if (next.phase === 'mercy_choice') {
      if (a.type !== 'mercy') throw { code: 'mercy_phase', message: '现在是怜悯抉择阶段。' };
      if (playerId !== next.matchWinnerId) throw { code: 'not_winner', message: '只有胜者能做出抉择。' };
      if (a.choice === 'grant') {
        next.mercyGiverId = next.matchWinnerId;
        next.mercyTakerId = next.matchLoserId;
        events.push({ kind: 'mercy_grant', giver: nameOf(next, next.mercyGiverId), taker: nameOf(next, next.mercyTakerId) });
        startMercyDuel(next, events);
      } else {
        next.phase = 'finished';
        next.winnerId = next.matchWinnerId;
        next.credits[next.matchWinnerId] += REWARD;
        events.push({ kind: 'match_end', winner: nameOf(next, next.winnerId), winnerId: next.winnerId, viaMercy: false, credits: { ...next.credits } });
      }
      next.log = [...next.log, ...events].slice(-40);
      return { state: next, events };
    }

    if (next.phase === 'finished') throw { code: 'over', message: '本场已经结束了。' };

    // —— 对决/怜悯决战阶段 ——
    if (next.players[next.turn].id !== playerId) throw { code: 'not_your_turn', message: '还没轮到你。' };

    if (a.type === 'item') {
      const inv = next.items[playerId];
      const at = inv.indexOf(a.item);
      if (at < 0) throw { code: 'no_item', message: '你没有这个道具。' };
      applyItem(next, playerId, a.item, events);
      next.items[playerId].splice(at, 1);
    } else if (a.type === 'shoot') {
      if (a.target !== 'self' && a.target !== 'opponent') throw { code: 'bad_target', message: '开枪目标只能是 self / opponent。' };
      const { keepTurn, victimId } = fire(next, playerId, a.target, events);
      if (next.hp[victimId] <= 0) {
        endRound(next, victimId, events);
      } else {
        if (!keepTurn) passTurn(next, events);
        if (next.mag.idx >= next.mag.seq.length) reload(next, events); // 弹仓打空 -> 重新装填
      }
    } else {
      throw { code: 'bad_action', message: '未知操作。' };
    }

    next.log = [...next.log, ...events].slice(-40);
    return { state: next, events };
  },

  viewFor(state, playerId) {
    const remaining = state.mag ? state.mag.seq.slice(state.mag.idx) : [];
    const liveLeft = remaining.filter(Boolean).length;
    const scanned = state.scanned[playerId];
    return {
      you: playerId,
      opponent: state.players.find((p) => p.id !== playerId)?.id ?? null,
      players: state.players,
      phase: state.phase,
      matchRound: state.matchRound,
      phaseKey: phaseKey(state),
      hp: { ...state.hp },
      hpMax: roundHpMax(state),
      roundWins: { ...state.roundWins },
      credits: { ...state.credits },
      turnId: state.players[state.turn]?.id ?? null,
      mag: { total: remaining.length, liveLeft, blankLeft: remaining.length - liveLeft, fired: state.mag ? state.mag.idx : 0 },
      currentShell: scanned === true ? 'live' : scanned === false ? 'blank' : null, // 仅扫描过才知道
      items: { ...state.items },
      itemPool: ITEM_POOL[phaseKey(state)],
      skipNext: { ...state.skipNext },
      buff: { ...state.buff },
      mercyChoiceFor: state.phase === 'mercy_choice' ? state.matchWinnerId : null,
      mercyGiverId: state.mercyGiverId,
      winnerId: state.winnerId,
      log: state.log.slice(-12),
    };
  },

  result(state) {
    return state.phase === 'finished'
      ? { over: true, winnerId: state.winnerId }
      : { over: false };
  },
};

function applyItem(state, playerId, item, events) {
  switch (item) {
    case 'smoke':
      state.hp[playerId] = Math.min(roundHpMax(state), state.hp[playerId] + 1);
      events.push({ kind: 'item', by: nameOf(state, playerId), item, hp: { ...state.hp } });
      break;
    case 'scanner':
      state.scanned[playerId] = state.mag.seq[state.mag.idx]; // 结果只进 scanned，不进广播事件
      events.push({ kind: 'item', by: nameOf(state, playerId), item }); // 对手只知道"用了扫描仪"
      break;
    case 'ejector': {
      const isLive = state.mag.seq[state.mag.idx] === true;
      state.mag.idx += 1;
      state.scanned = {};
      events.push({ kind: 'item', by: nameOf(state, playerId), item, shell: isLive ? 'live' : 'blank' }); // 退出的弹当众暴露
      if (state.mag.idx >= state.mag.seq.length) reload(state, events);
      break;
    }
    case 'maglock':
      state.skipNext[otherId(state, playerId)] = true;
      events.push({ kind: 'item', by: nameOf(state, playerId), item });
      break;
    case 'overload':
      state.buff[playerId] = 2;
      events.push({ kind: 'item', by: nameOf(state, playerId), item });
      break;
    default:
      throw { code: 'bad_item', message: '未知道具。' };
  }
}

export default game;
