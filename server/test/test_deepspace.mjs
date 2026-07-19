// 《深空轮盘》规则引擎单元测试。直接驱动模块（确定性种子 + 可读取的私有弹序），
// 覆盖开枪/道具/装填递增/三局递减血量/怜悯决战/隐藏弹序/非法操作。
import assert from 'assert';
import game, { ITEM_META } from '../games/deepspace.mjs';
import { decideAction, decideMercy, decideActionHard, decideMercyHard } from '../../js/ai/deepspace-ai.mjs';

const PLAYERS = [{ id: 'A', name: '阿尔法' }, { id: 'B', name: '贝塔' }];
const fresh = (seed = 1) => game.createInitialState(PLAYERS, { seed });
const act = (s, id, action) => game.applyAction(s, id, action); // -> { state, events }
const cur = (s) => s.mag.seq[s.mag.idx]; // 当前膛内是否实弹（测试可读私有真相）
const aiView = ({ items = [], live = 2, blank = 3, myHp = 4, oppHp = 4,
  shell = null, shield = false, buff = 1, locked = false } = {}) => ({
  you: 'A', opponent: 'B',
  items: { A: items, B: [] },
  mag: { liveLeft: live, blankLeft: blank },
  hp: { A: myHp, B: oppHp }, hpMax: 4,
  shield: { A: shield, B: false },
  buff: { A: buff, B: 1 },
  skipNext: { A: false, B: locked },
  currentShell: shell,
  roundWins: { A: 2, B: 0 },
});

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓', name); }
function throws(fn, code) {
  try { fn(); } catch (e) { assert.equal(e.code, code, `应抛 ${code}，实际 ${e.code}`); return; }
  assert.fail(`期望抛出 ${code}，但没有抛`);
}

test('开局：第一局每人 4 血，弹仓 1 实 4 空', () => {
  const s = fresh();
  assert.equal(s.phase, 'duel');
  assert.equal(s.matchRound, 1);
  assert.equal(s.hp.A, 4);
  assert.equal(s.hp.B, 4);
  assert.equal(s.mag.live, 1);
  assert.equal(s.mag.blank, 4);
  assert.equal(s.mag.seq.length, 5);
  assert.ok(s.turn === 0 || s.turn === 1, '有人先手');
  // 第一局只发 scanner/overload，且每人 1 个
  for (const id of ['A', 'B']) {
    assert.equal(s.items[id].length, 1);
    assert.ok(['scanner', 'overload'].includes(s.items[id][0]));
  }
});

test('朝自己开空弹保留回合；实弹则扣血并交回合', () => {
  let s = fresh();
  s.turn = 0; s.mag.seq = [false, true, false, false, false]; s.mag.idx = 0;
  ({ state: s } = act(s, 'A', { type: 'shoot', target: 'self' }));
  assert.equal(s.hp.A, 4, '空弹不扣血');
  assert.equal(s.players[s.turn].id, 'A', '空弹自射保留回合');
  assert.equal(s.mag.idx, 1, '消耗一发');
  ({ state: s } = act(s, 'A', { type: 'shoot', target: 'self' })); // 现在是实弹
  assert.equal(s.hp.A, 3, '实弹自射扣 1 血');
  assert.equal(s.players[s.turn].id, 'B', '实弹自射交回合');
});

test('朝对手开枪：无论实空都交回合，实弹才扣血', () => {
  let s = fresh();
  s.turn = 0; s.mag.seq = [false, true, false, false, false]; s.mag.idx = 0;
  ({ state: s } = act(s, 'A', { type: 'shoot', target: 'opponent' }));
  assert.equal(s.hp.B, 4, '空弹打对手不扣血');
  assert.equal(s.players[s.turn].id, 'B', '打对手必交回合');
  s.turn = 0; // 轮回 A，现在膛内实弹
  ({ state: s } = act(s, 'A', { type: 'shoot', target: 'opponent' }));
  assert.equal(s.hp.B, 3, '实弹打对手扣血');
});

test('过载芯让命中伤害翻倍', () => {
  let s = fresh();
  s.turn = 0; s.items.A = ['overload']; s.hp.B = 4;
  s.mag.seq = [true, false, false, false, false]; s.mag.idx = 0;
  ({ state: s } = act(s, 'A', { type: 'item', item: 'overload' }));
  assert.equal(s.buff.A, 2, '过载已就绪');
  assert.equal(s.players[s.turn].id, 'A', '用道具不交回合');
  ({ state: s } = act(s, 'A', { type: 'shoot', target: 'opponent' }));
  assert.equal(s.hp.B, 2, '实弹 + 过载 = 扣 2');
  assert.equal(s.buff.A, 1, '过载用完即清');
});

test('磁锁跳过对手的下一回合', () => {
  let s = fresh();
  s.turn = 0; s.items.A = ['maglock'];
  s.mag.seq = [false, false, false, false, false]; s.mag.idx = 0; // 全空，避免误伤
  ({ state: s } = act(s, 'A', { type: 'item', item: 'maglock' }));
  assert.equal(s.skipNext.B, true);
  ({ state: s } = act(s, 'A', { type: 'shoot', target: 'opponent' })); // 本该交给 B
  assert.equal(s.players[s.turn].id, 'A', 'B 被跳过，回合回到 A');
  assert.equal(s.skipNext.B, false, '磁锁一次性消耗');
});

test('扫描仪只让使用者看到当前弹', () => {
  let s = fresh();
  s.turn = 0; s.items.A = ['scanner'];
  s.mag.seq = [true, false, false, false, false]; s.mag.idx = 0;
  let events;
  ({ state: s, events } = act(s, 'A', { type: 'item', item: 'scanner' }));
  assert.equal(game.viewFor(s, 'A').currentShell, 'live', 'A 看得到');
  assert.equal(game.viewFor(s, 'B').currentShell, null, 'B 看不到');
  const ev = events.find((e) => e.item === 'scanner');
  assert.equal(ev.shell, undefined, '广播事件不泄露扫描结果');
});

test('退弹器退掉当前弹并当众暴露', () => {
  let s = fresh();
  s.turn = 0; s.items.A = ['ejector'];
  s.mag.seq = [true, false, false, false, false]; s.mag.idx = 0;
  let events;
  ({ state: s, events } = act(s, 'A', { type: 'item', item: 'ejector' }));
  assert.equal(s.mag.idx, 1, '退掉一发');
  assert.equal(s.hp.A, 4, '退弹不扣血');
  assert.equal(events.find((e) => e.item === 'ejector').shell, 'live', '退出的弹当众暴露');
  assert.equal(s.players[s.turn].id, 'A', '退弹不交回合');
});

test('香烟回血但不超过本局上限', () => {
  let s = fresh();
  s.turn = 0; s.hp.A = 2; s.items.A = ['smoke', 'smoke', 'smoke'];
  ({ state: s } = act(s, 'A', { type: 'item', item: 'smoke' }));
  assert.equal(s.hp.A, 3);
  ({ state: s } = act(s, 'A', { type: 'item', item: 'smoke' }));
  assert.equal(s.hp.A, 4);
  ({ state: s } = act(s, 'A', { type: 'item', item: 'smoke' }));
  assert.equal(s.hp.A, 4, '不超过第一局上限 4');
});

test('相位护盾抵消一次伤害，过载命中仍会穿透 1 点', () => {
  let s = fresh();
  s.turn = 0; s.hp.A = 2; s.items.A = ['shield'];
  ({ state: s } = act(s, 'A', { type: 'item', item: 'shield' }));
  assert.equal(s.shield.A, true, '护盾展开');
  assert.equal(game.viewFor(s, 'B').shield.A, true, '护盾状态对双方公开');
  s.items.A = ['shield'];
  throws(() => act(s, 'A', { type: 'item', item: 'shield' }), 'shield_active');

  s.turn = 1; s.mag.seq = [true, false, false, false, false]; s.mag.idx = 0;
  let events;
  ({ state: s, events } = act(s, 'B', { type: 'shoot', target: 'opponent' }));
  assert.equal(s.hp.A, 2, '普通实弹被护盾完全抵消');
  assert.equal(s.shield.A, false, '护盾只生效一次');
  assert.equal(events.find((e) => e.kind === 'shoot').damage, 0);
  assert.equal(events.find((e) => e.kind === 'shoot').shielded, true);

  s.turn = 1; s.hp.A = 2; s.shield.A = true; s.items.B = ['overload'];
  s.mag.seq = [true, false, false, false, false]; s.mag.idx = 0;
  ({ state: s } = act(s, 'B', { type: 'item', item: 'overload' }));
  ({ state: s, events } = act(s, 'B', { type: 'shoot', target: 'opponent' }));
  assert.equal(s.hp.A, 1, '2 点过载伤害被抵消 1 点后仍承受 1 点');
  assert.equal(events.find((e) => e.kind === 'shoot').damage, 1);
});

test('弹仓打空后重新装填，实弹递增空弹递减', () => {
  let s = fresh();
  assert.equal(s.reloadCount, 1); // 开局已装第一仓
  // 把第一仓 5 发打空（空弹自射、实弹射对手，都不会让人在第一仓内归零）
  let guard = 0;
  while (s.reloadCount === 1 && guard++ < 20) {
    const id = s.players[s.turn].id;
    const target = cur(s) ? 'opponent' : 'self';
    ({ state: s } = act(s, id, { type: 'shoot', target }));
  }
  assert.equal(s.reloadCount, 2, '触发了第二次装填');
  assert.equal(s.mag.live, 2, '第二仓实弹+1');
  assert.equal(s.mag.blank, 3, '第二仓空弹-1');
});

test('视图永远不泄露弹序，只给计数', () => {
  const s = fresh();
  const v = game.viewFor(s, 'A');
  assert.equal(v.mag.seq, undefined, '没有 seq');
  assert.deepEqual(Object.keys(v.mag).sort(), ['blankLeft', 'fired', 'liveLeft', 'total']);
  assert.equal(v.mag.liveLeft, 1);
  assert.equal(v.mag.blankLeft, 4);
  assert.equal(v.currentShell, null, '没扫描就不知道当前弹');
});

// —— 用「打空弹自射、实弹射对手」的策略自动推进整场，验证赛制流转 ——
function stepDuel(s) {
  const id = s.players[s.turn].id;
  const target = cur(s) ? 'opponent' : 'self';
  return act(s, id, { type: 'shoot', target }).state;
}
function driveToMercyChoice(seed) {
  let s = fresh(seed);
  let guard = 0;
  while (s.phase !== 'mercy_choice' && guard++ < 3000) s = stepDuel(s);
  assert.equal(s.phase, 'mercy_choice', '整场打到怜悯抉择');
  return s;
}

// 强制结束当前局（让 victim 在实弹下归零），返回新 state。
function forceRoundEnd(s, shooterId, victimId) {
  s.turn = s.players.findIndex((p) => p.id === shooterId);
  s.hp[victimId] = 1;
  s.mag.seq[s.mag.idx] = true;
  return act(s, shooterId, { type: 'shoot', target: 'opponent' }).state;
}

test('三局递减血量：开新局血量按 4→3→2 下降', () => {
  let s = fresh(7);
  assert.equal(s.matchRound, 1);
  assert.equal(s.hp.A, 4, '第一局 4 血');

  s = forceRoundEnd(s, 'A', 'B'); // A 赢第 1 局，败者 B 先手开第 2 局
  assert.equal(s.matchRound, 2);
  assert.equal(s.hp.A, 3);
  assert.equal(s.hp.B, 3, '第二局 3 血');

  s = forceRoundEnd(s, 'B', 'A'); // B 扳回第 2 局 -> 1:1，进决胜局
  assert.equal(s.phase, 'duel');
  assert.equal(s.matchRound, 3);
  assert.equal(s.hp.A, 2);
  assert.equal(s.hp.B, 2, '决胜局 2 血');
});

test('相位护盾会在每一局开始时重置', () => {
  let s = fresh(7);
  s.shield.A = true; s.shield.B = false;
  s = forceRoundEnd(s, 'A', 'B');
  assert.equal(s.matchRound, 2);
  assert.equal(s.shield.A, false);
  assert.equal(s.shield.B, false);
});

test('整场打完进入怜悯抉择，胜者拿下两局', () => {
  const s = driveToMercyChoice(3);
  const w = s.matchWinnerId;
  assert.ok(w === 'A' || w === 'B');
  assert.equal(s.roundWins[w], 2, '胜者赢满两局');
  assert.equal(game.viewFor(s, w).mercyChoiceFor, w, '把抉择权交给胜者');
});

test('拒绝怜悯：直接结束，胜者得 1 奖励', () => {
  let s = driveToMercyChoice(3);
  const w = s.matchWinnerId;
  ({ state: s } = act(s, w, { type: 'mercy', choice: 'decline' }));
  assert.equal(game.result(s).over, true);
  assert.equal(s.winnerId, w);
  assert.equal(s.credits[w], 1);
});

test('赦免后胜者再赢 = 双倍奖励', () => {
  let s = driveToMercyChoice(3);
  const giver = s.matchWinnerId;
  const taker = giver === 'A' ? 'B' : 'A';
  ({ state: s } = act(s, giver, { type: 'mercy', choice: 'grant' }));
  assert.equal(s.phase, 'mercy_duel');
  assert.equal(s.hp[giver], 2);
  assert.equal(s.hp[taker], 2);
  // 强制让 giver 用实弹把 taker 打光
  s.turn = s.players.findIndex((p) => p.id === giver);
  s.hp[taker] = 1;
  s.mag.seq[s.mag.idx] = true;
  ({ state: s } = act(s, giver, { type: 'shoot', target: 'opponent' }));
  assert.equal(s.winnerId, giver);
  assert.equal(s.credits[giver], 2, '双倍奖励');
});

test('赦免后胜者落败 = 双倍惩罚 + 翻盘者得奖', () => {
  let s = driveToMercyChoice(3);
  const giver = s.matchWinnerId;
  const taker = giver === 'A' ? 'B' : 'A';
  ({ state: s } = act(s, giver, { type: 'mercy', choice: 'grant' }));
  s.turn = s.players.findIndex((p) => p.id === taker);
  s.hp[giver] = 1;
  s.mag.seq[s.mag.idx] = true;
  ({ state: s } = act(s, taker, { type: 'shoot', target: 'opponent' }));
  assert.equal(s.winnerId, taker);
  assert.equal(s.credits[giver], -2, '双倍惩罚');
  assert.equal(s.credits[taker], 1, '濒死翻盘奖励');
});

test('非法操作被拒绝', () => {
  const s = fresh();
  const turnId = s.players[s.turn].id;
  const otherId = turnId === 'A' ? 'B' : 'A';
  throws(() => act(s, otherId, { type: 'shoot', target: 'self' }), 'not_your_turn');
  throws(() => act(s, turnId, { type: 'item', item: 'smoke' }), 'no_item'); // 第一局不发香烟
  // 结束后再操作
  let f = driveToMercyChoice(3);
  ({ state: f } = act(f, f.matchWinnerId, { type: 'mercy', choice: 'decline' }));
  throws(() => act(f, f.players[0].id, { type: 'shoot', target: 'self' }), 'over');
});

test('applyAction 不改动原 state（结构化克隆）', () => {
  const s = fresh();
  const idx0 = s.mag.idx;
  act(s, s.players[s.turn].id, { type: 'shoot', target: 'self' });
  assert.equal(s.mag.idx, idx0, '原 state 未被改动');
});

test('道具元数据齐全', () => {
  for (const k of ['smoke', 'scanner', 'ejector', 'maglock', 'overload', 'shield']) {
    assert.ok(ITEM_META[k] && ITEM_META[k].label && ITEM_META[k].icon, `${k} 有元数据`);
  }
});

test('猎杀 AI 会优先兑现回血、护盾与扫描收益', () => {
  assert.deepStrictEqual(
    decideActionHard(aiView({ items: ['smoke'], myHp: 3 })),
    { type: 'item', item: 'smoke' },
  );
  assert.deepStrictEqual(
    decideActionHard(aiView({ items: ['shield'], myHp: 2 })),
    { type: 'item', item: 'shield' },
  );
  assert.deepStrictEqual(
    decideActionHard(aiView({ items: ['scanner'] })),
    { type: 'item', item: 'scanner' },
  );
});

test('猎杀 AI 根据已知弹与概率选择攻击方式', () => {
  assert.deepStrictEqual(
    decideActionHard(aiView({ items: ['overload'], shell: 'live', oppHp: 3 })),
    { type: 'item', item: 'overload' },
  );
  assert.deepStrictEqual(
    decideActionHard(aiView({ shell: 'blank' })),
    { type: 'shoot', target: 'self' },
  );
  assert.deepStrictEqual(
    decideActionHard(aiView({ live: 1, blank: 4 })),
    { type: 'shoot', target: 'self' },
  );
  assert.deepStrictEqual(
    decideActionHard(aiView({ live: 4, blank: 1 })),
    { type: 'shoot', target: 'opponent' },
  );
});

test('猎杀 AI 会拒绝怜悯赌局', () => {
  assert.equal(decideMercyHard(aiView()), 'decline');
});

test('猎杀 AI 对 AI 能把整场打到结束', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let s = fresh(seed); let steps = 0;
    while (!game.result(s).over) {
      assert.ok(steps++ < 4000, `hard seed ${seed} 疑似死循环`);
      if (s.phase === 'mercy_choice') {
        ({ state: s } = act(s, s.matchWinnerId, { type: 'mercy', choice: decideMercyHard() }));
      } else {
        const id = s.players[s.turn].id;
        ({ state: s } = act(s, id, decideActionHard(game.viewFor(s, id))));
      }
    }
  }
});

test('AI 对 AI 能把整场打到结束，不会死循环', () => {
  for (let seed = 1; seed <= 30; seed++) {
    let s = fresh(seed);
    let steps = 0;
    while (game.result(s).over !== true) {
      assert.ok(steps++ < 4000, `seed ${seed} 疑似死循环`);
      if (s.phase === 'mercy_choice') {
        const w = s.matchWinnerId;
        ({ state: s } = act(s, w, { type: 'mercy', choice: decideMercy(game.viewFor(s, w)) }));
        continue;
      }
      const id = s.players[s.turn].id;
      ({ state: s } = act(s, id, decideAction(game.viewFor(s, id))));
    }
    const r = game.result(s);
    assert.ok(r.winnerId === 'A' || r.winnerId === 'B', `seed ${seed} 应有赢家`);
  }
});

console.log(`\n深空轮盘规则引擎测试全部通过 (${passed}).`);
