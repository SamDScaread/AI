// 《深空轮盘》AI 对手。纯函数：吃一份「AI 视角的 view」，吐一个 action。
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

// 「笨 AI」：新手教程专用的好对付对手。从不用道具、从不扫描；弹序未知时大概率朝自己开枪
// （经常把实弹送给自己），只在已知时才做合理反应。容易被新手打赢。
export function decideActionDumb(view) {
  const known = view.currentShell;
  if (known === 'blank') return { type: 'shoot', target: 'self' };
  if (known === 'live') return { type: 'shoot', target: 'opponent' };
  return Math.random() < 0.7 ? { type: 'shoot', target: 'self' } : { type: 'shoot', target: 'opponent' };
}
