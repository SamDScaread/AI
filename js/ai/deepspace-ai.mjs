// 《气闸孤注：γ-7》AI 对手。纯函数：吃一份「AI 视角的 view」，吐一个 action。
// 它和真人一样只能看到公开信息（剩余实/空数量、自己扫描过的当前弹、双方道具），
// 拿不到隐藏弹序——天生无法作弊。驱动方在「轮到 AI 且未结束」时反复调用：
// 用道具不交回合，所以 AI 可能先扫描/上 buff，再开枪。

// 决定一步行动。
export function decideAction(view) {
  const me = view.you;
  const opp = view.opponent;
  const inv = view.items[me] || [];
  const { liveLeft, blankLeft } = view.mag;
  const total = liveLeft + blankLeft;
  const myHp = view.hp[me];
  const oppHp = view.hp[opp];
  const hpMax = view.hpMax;
  const shielded = !!(view.shield && view.shield[me]);
  const known = view.currentShell; // 'live' | 'blank' | null

  // 已知是空弹：朝自己开（安全且保留回合）。能补血就先补。
  if (known === 'blank') {
    if (inv.includes('smoke') && myHp < hpMax) return { type: 'item', item: 'smoke' };
    return { type: 'shoot', target: 'self' };
  }

  // 已知是实弹：稳稳打对手。够打死/能压制就先上过载芯、或先磁锁封对手回合。
  if (known === 'live') {
    if (inv.includes('overload') && oppHp >= 2) return { type: 'item', item: 'overload' };
    if (inv.includes('maglock') && oppHp <= 2) return { type: 'item', item: 'maglock' };
    return { type: 'shoot', target: 'opponent' };
  }

  // 残血时先展开护盾，避免下一发实弹直接带走；护盾会抵消 1 点伤害。
  if (inv.includes('shield') && !shielded && myHp <= 1) return { type: 'item', item: 'shield' };

  // 未知：高风险时先用扫描仪看一眼。
  const wantsScan = myHp <= 1 || total <= 3 || liveLeft >= blankLeft;
  if (inv.includes('scanner') && wantsScan) return { type: 'item', item: 'scanner' };

  // 残血先保命。
  if (inv.includes('smoke') && myHp <= 1 && myHp < hpMax) return { type: 'item', item: 'smoke' };

  const pLive = total ? liveLeft / total : 0;
  if (pLive < 0.5) {
    // 多半是空弹：朝自己开，赌一个连续行动。
    return { type: 'shoot', target: 'self' };
  }
  // 多半是实弹：打对手。把握很大且能造成更多伤害时叠过载芯。
  if (inv.includes('overload') && pLive >= 0.75 && oppHp >= 2) return { type: 'item', item: 'overload' };
  return { type: 'shoot', target: 'opponent' };
}

// 整场胜者面对「怜悯抉择」时 AI 的选择：2:0 碾压时狂妄赦免，否则稳拿胜利。
export function decideMercy(view) {
  const myWins = view.roundWins[view.you];
  const oppWins = view.roundWins[view.opponent];
  return myWins >= 2 && oppWins === 0 ? 'grant' : 'decline';
}

// 「猎杀 AI」：仍然只读取自己的公开视图，但会更彻底地利用无回合消耗的道具，
// 并只在空弹概率足够高时才把枪口转向自己。
export function decideActionHard(view) {
  const me = view.you;
  const opp = view.opponent;
  const inv = view.items[me] || [];
  const { liveLeft, blankLeft } = view.mag;
  const total = liveLeft + blankLeft;
  const myHp = view.hp[me];
  const oppHp = view.hp[opp];
  const hpMax = view.hpMax;
  const shielded = !!(view.shield && view.shield[me]);
  const boosted = ((view.buff && view.buff[me]) || 1) > 1;
  const known = view.currentShell;
  const has = (item) => inv.includes(item);

  // 回血、护盾与扫描都不交出回合，猎杀档会优先把这些确定收益兑现。
  if (has('smoke') && myHp < hpMax) return { type: 'item', item: 'smoke' };
  if (has('shield') && !shielded && myHp <= 2) return { type: 'item', item: 'shield' };
  if (known == null && has('scanner')) return { type: 'item', item: 'scanner' };

  if (known === 'blank') return { type: 'shoot', target: 'self' };
  if (known === 'live') {
    if (has('overload') && !boosted && oppHp >= 2) return { type: 'item', item: 'overload' };
    const damage = boosted ? 2 : 1;
    const locked = !!(view.skipNext && view.skipNext[opp]);
    if (has('maglock') && !locked && oppHp > damage) return { type: 'item', item: 'maglock' };
    return { type: 'shoot', target: 'opponent' };
  }

  const pLive = total ? liveLeft / total : 0;
  if (has('ejector') && myHp <= 1 && pLive >= 0.6) return { type: 'item', item: 'ejector' };
  if (has('overload') && !boosted && pLive >= 0.65 && oppHp >= 2) return { type: 'item', item: 'overload' };
  return { type: 'shoot', target: pLive <= 0.35 ? 'self' : 'opponent' };
}

// 猎杀档不接受怜悯赌局，优先锁定已经到手的胜利。
export function decideMercyHard() { return 'decline'; }

// 「笨 AI」：新手教程专用的好对付对手。从不用道具、从不扫描；弹序未知时大概率朝自己开枪
// （经常把实弹送给自己），只在已知时才做合理反应。容易被新手打赢。
export function decideActionDumb(view) {
  const known = view.currentShell;
  if (known === 'blank') return { type: 'shoot', target: 'self' };
  if (known === 'live') return { type: 'shoot', target: 'opponent' };
  return Math.random() < 0.7 ? { type: 'shoot', target: 'self' } : { type: 'shoot', target: 'opponent' };
}
