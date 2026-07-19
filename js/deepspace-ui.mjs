// 《深空轮盘》单人 vs AI 的 2D 前端控制器（扁平/低配版）。
// 直接 import 纯规则引擎、AI 与共享音效引擎（同一套规则将来也能跑联机），整局在浏览器本地推进。
import game, { ITEM_META } from '../server/games/deepspace.mjs';
import { decideAction, decideMercy } from './ai/deepspace-ai.mjs';
import { AudioKit } from './deepspace-audio.mjs';

const HUMAN = 'you';
const AI = 'ai';
const PLAYERS = [{ id: HUMAN, name: '你' }, { id: AI, name: '仲裁者' }];
const NAME = Object.fromEntries(PLAYERS.map((p) => [p.name, p.id]));

const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const audio = new AudioKit();

// ============================================================ 游戏循环
let state = null;
let aiBusy = false;
let lastEnd = null;

const viewHuman = () => game.viewFor(state, HUMAN);
const viewAi = () => game.viewFor(state, AI);

function newMatch() {
  state = game.createInitialState(PLAYERS);
  lastEnd = null;
  $('log').innerHTML = '';
  log('气闸密封。脉冲钉枪上膛。', 'cyan');
  const v = viewHuman();
  log(`第 1 局 · 双方各 ${v.hpMax} 滴血。`, 'cyan');
  log(`弹仓：实弹 ${v.mag.liveLeft} · 空包 ${v.mag.blankLeft}。`, '');
}

function applyStep(id, action) {
  let res;
  try { res = game.applyAction(state, id, action); }
  catch { return false; }
  state = res.state;
  for (const ev of res.events) handleEvent(ev);
  render();
  return true;
}

// 玩家操作入口
function humanAct(action) {
  if (aiBusy) return;
  const v = viewHuman();
  if (v.turnId !== HUMAN || (state.phase !== 'duel' && state.phase !== 'mercy_duel')) return;
  applyStep(HUMAN, action);
  sync();
}

// AI 接管（轮到 AI、或 AI 是整场胜者需做怜悯抉择）
async function runAi() {
  if (aiBusy) return; aiBusy = true;
  setControls(false);
  try {
    while (true) {
      if (state.phase === 'finished') break;
      if (state.phase === 'mercy_choice') {
        if (state.matchWinnerId !== AI) break;
        $('hint').textContent = '仲裁者正在裁决你的生死……';
        await delay(1500);
        applyStep(AI, { type: 'mercy', choice: decideMercy(viewAi()) });
        continue;
      }
      if (viewHuman().turnId !== AI) break;
      $('hint').textContent = '仲裁者正在权衡……';
      await delay(620 + Math.random() * 700);
      applyStep(AI, decideAction(viewAi()));
      await delay(180);
    }
  } finally { aiBusy = false; sync(); }
}

// 每次行动后统一决定：结算 / 怜悯 / 该谁动。
function sync() {
  render();
  if (state.phase === 'finished') return showEnd();
  if (state.phase === 'mercy_choice') {
    if (state.matchWinnerId === HUMAN) return showMercy();
    return runAi();
  }
  hideOverlays();
  if (viewHuman().turnId === AI) return runAi();
  setControls(true);
  $('hint').textContent = '轮到你 —— 抵住自己赌一把，或瞄准仲裁者。';
}

// ============================================================ 渲染
function render() {
  const v = viewHuman();
  const tag = v.phase === 'mercy_duel' ? '怜悯决战'
    : v.matchRound === 3 ? '决胜局' : `第 ${'一二三'[v.matchRound - 1]} 局`;
  const rt = $('roundTag'); rt.textContent = tag;
  rt.classList.toggle('crit', v.phase === 'mercy_duel' || v.matchRound === 3);
  $('winsTag').innerHTML = `战绩　你 <b>${v.roundWins[HUMAN]}</b> : <b>${v.roundWins[AI]}</b> 仲裁者`;

  renderFighter('oppPanel', v, AI, false);
  renderFighter('youPanel', v, HUMAN, true);

  const c = $('chamber');
  const pips = Array.from({ length: v.mag.total }, (_, i) => {
    if (i === 0) {
      const k = v.currentShell ? ` ${v.currentShell}` : '';
      return `<div class="pip front${k}"></div>`;
    }
    return '<div class="pip"></div>';
  }).join('');
  const scan = v.currentShell
    ? `<span class="scanned">扫描确认：当前为 ${v.currentShell === 'live' ? '实弹' : '空包'}</span>`
    : '弹序未知 —— 只有装填者知道';
  c.innerHTML = `
    <div class="counts">
      <div><span class="live">${v.mag.liveLeft}</span><small>实弹</small></div>
      <div><span class="blank">${v.mag.blankLeft}</span><small>空包</small></div>
    </div>
    <div class="pips">${pips}</div>
    <div class="status">${scan}</div>`;

  renderItemBar(v);
}

function renderFighter(elId, v, id, isYou) {
  const el = $(elId);
  el.classList.toggle('turn', v.turnId === id && (v.phase === 'duel' || v.phase === 'mercy_duel'));
  const hp = v.hp[id], max = v.hpMax;
  const cells = Array.from({ length: max }, (_, i) =>
    `<div class="cell ${i < hp ? 'full' : 'lost'}"></div>`).join('');
  const items = (v.items[id] || []).map((it) => {
    const m = ITEM_META[it];
    return `<div class="item"><span class="ic">${m.icon}</span>${m.label}</div>`;
  }).join('') || '<span class="empty">无道具</span>';
  const shield = v.shield && v.shield[id] ? '<span class="shield-status">🛡 相位护盾已展开</span>' : '';
  el.innerHTML = `
    <div class="who"><span class="nm">${id === HUMAN ? '你' : '仲裁者'}</span>
      <span class="tag">${isYou ? 'PRISONER' : 'ARBITER · 站务核心'}</span></div>
    <div class="hp">${cells}</div>
    ${shield}
    <div class="items">${items}</div>`;
}

function renderItemBar(v) {
  const bar = $('itemBar');
  const inv = v.items[HUMAN] || [];
  const yourTurn = v.turnId === HUMAN && (v.phase === 'duel' || v.phase === 'mercy_duel') && !aiBusy;
  if (!inv.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = inv.map((it, i) => {
    const m = ITEM_META[it];
    return `<div class="item ${yourTurn ? 'usable' : ''}" data-item="${it}" data-i="${i}" title="${m.desc}">
      <span class="ic">${m.icon}</span>${m.label}</div>`;
  }).join('');
  if (yourTurn) bar.querySelectorAll('.item').forEach((node) => {
    node.onclick = () => humanAct({ type: 'item', item: node.dataset.item });
  });
}

function setControls(enabled) {
  $('controls').setAttribute('aria-disabled', String(!enabled));
  $('shootSelf').disabled = !enabled;
  $('shootOpp').disabled = !enabled;
  renderItemBar(viewHuman());
}

// ============================================================ 事件 -> 音画 + 日志
function handleEvent(ev) {
  switch (ev.kind) {
    case 'shoot': {
      const live = ev.shell === 'live';
      const tgt = ev.target === 'self' ? '自己' : '对手';
      if (live) {
        const fullyAbsorbed = ev.shielded && ev.damage === 0;
        audio.bang(); shake();
        if (fullyAbsorbed) {
          audio.beep(); flash('blank'); log(`${ev.by} 抵住${tgt}扣下扳机 —— 实弹撞上相位护盾，伤害被吸收。`, 'cyan');
        } else {
          const shield = ev.shielded ? ' 相位护盾吸收了 1 点伤害。' : '';
          flash('hit'); pulseDamage(ev.victim); log(`${ev.by} 抵住${tgt}扣下扳机 —— 实弹炸响！${shield}`, 'live');
        }
      }
      else { audio.click(); flash('blank'); log(`${ev.by} 抵住${tgt}扣下扳机 —— 空响。`, ''); }
      break;
    }
    case 'item': logItem(ev); audio.beep(); break;
    case 'reload': audio.rack(); log(`机括拉动，重新装填：实弹 ${ev.live} · 空包 ${ev.blank}。`, 'cyan'); break;
    case 'skip': audio.beep(); log(`${ev.who} 被磁锁锁死，跳过这一回合。`, 'warn'); break;
    case 'round_end': audio.sting('round'); log(`本局终结 —— ${ev.winner} 活了下来。`, 'warn'); break;
    case 'mercy_offer': audio.sting('dread'); log(`${ev.winner} 赢下整场。是否给予怜悯？`, 'warn'); break;
    case 'mercy_grant': audio.sting('dread'); log(`${ev.giver} 选择了赦免。${ev.taker} 被拖回场上 —— 终极对决。`, 'warn'); break;
    case 'match_end':
      lastEnd = ev; audio.sting(ev.winnerId === HUMAN ? 'win' : 'lose');
      break;
    default: break;
  }
  audio.setTension(tension());
}

function logItem(ev) {
  const m = ITEM_META[ev.item];
  if (ev.item === 'ejector') return log(`${ev.by} 退出一发 —— 当众暴露：${ev.shell === 'live' ? '实弹' : '空包'}。`, 'warn');
  if (ev.item === 'scanner') return log(`${ev.by} 用${m.label}窥视了膛内。`, 'warn');
  log(`${ev.by} 使用了 ${m.label}。`, 'warn');
}

function tension() {
  const v = viewHuman();
  const minHp = Math.min(v.hp[HUMAN], v.hp[AI]);
  const tot = Math.max(1, v.mag.liveLeft + v.mag.blankLeft);
  const liveRatio = v.mag.liveLeft / tot;
  const boost = v.phase === 'mercy_duel' ? 0.35 : v.matchRound >= 3 ? 0.2 : 0;
  return Math.max(0, Math.min(1,
    0.22 + (1 - minHp / Math.max(1, v.hpMax)) * 0.34 + liveRatio * 0.28 + boost));
}

// ---- 视觉特效 ----
function shake() { const a = $('app'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
function flash(kind) { const f = $('flash'); f.className = ''; void f.offsetWidth; f.classList.add(kind); setTimeout(() => f.classList.remove(kind), 160); }
function pulseDamage(victimName) {
  const id = NAME[victimName]; if (!id) return;
  const el = id === HUMAN ? $('youPanel') : $('oppPanel');
  el.classList.remove('damaged'); void el.offsetWidth; el.classList.add('damaged');
  setTimeout(() => el.classList.remove('damaged'), 420);
}

let logLines = [];
function log(text, cls) {
  logLines.push({ text, cls });
  logLines = logLines.slice(-8);
  $('log').innerHTML = logLines.map((l, i) =>
    `<div class="ln ${l.cls} ${i === logLines.length - 1 ? 'fresh' : ''}">${l.text}</div>`).join('');
}

// ============================================================ 覆盖层
function hideOverlays() { $('mercyScreen').hidden = true; $('endScreen').hidden = true; }

function showMercy() {
  setControls(false);
  $('mercyText').innerHTML =
    `你赢下了整场对决。<br>现在 —— 是否将仲裁者拖回场上，赌一场终极决战？<br>
     <span style="color:var(--dim)">赦免后再胜可得<b style="color:var(--amber)">双倍奖赏</b>；若反被翻盘，则<b style="color:var(--red)">双倍惩罚</b>。</span>`;
  $('mercyScreen').hidden = false;
}

function showEnd() {
  setControls(false);
  const v = viewHuman();
  const won = v.winnerId === HUMAN;
  const credits = v.credits[HUMAN];
  const via = lastEnd && lastEnd.viaMercy;
  const verdict = won ? '你 活 着' : '你 死 在 了 这 里';
  let flavor;
  if (won && via) flavor = '你赦免了它，又亲手了结了它。γ-7 的氧气，今夜归你。';
  else if (!won && via) flavor = '怜悯是你最后的傲慢。仲裁者从绝境里爬起，按下了扳机。';
  else if (won) flavor = '舱门嘶鸣着打开。你踏过冷却的枪管，走向下一段黑暗。';
  else flavor = '红光熄灭。站务核心记录：囚徒编号已注销。';
  $('endScreen').innerHTML = `
    <div class="verdict ${won ? 'win' : 'lose'}">${verdict}</div>
    <div class="credits-line">结算信用点：<b>${credits >= 0 ? '+' : ''}${credits}</b>${via ? '（怜悯豪赌）' : ''}</div>
    <div class="flavor">${flavor}</div>
    <button class="btn-major" id="againBtn">再入气闸</button>`;
  $('endScreen').hidden = false;
  $('againBtn').onclick = () => { hideOverlays(); newMatch(); sync(); };
}

// ============================================================ 启动接线
function boot() {
  $('shootSelf').onclick = () => humanAct({ type: 'shoot', target: 'self' });
  $('shootOpp').onclick = () => humanAct({ type: 'shoot', target: 'opponent' });
  $('mercyGrant').onclick = () => { hideOverlays(); applyStep(HUMAN, { type: 'mercy', choice: 'grant' }); sync(); };
  $('mercyExec').onclick = () => { hideOverlays(); applyStep(HUMAN, { type: 'mercy', choice: 'decline' }); sync(); };
  $('enterBtn').onclick = () => {
    audio.init();
    $('startScreen').hidden = true;
    $('board').hidden = false;
    newMatch();
    sync();
  };
}
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
