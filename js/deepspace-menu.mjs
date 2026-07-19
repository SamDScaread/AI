// 《深空轮盘》主菜单 + 流程编排（入口模块）。
// 负责：标题闸门 -> 首次进入自动播放[背景故事动画]+[新手教程]；主菜单路由
// （练习难度/联机/故事/教程/鸣谢/反馈/退出）；过场动画引擎；新手弹窗引导；mailto 反馈。
// 实际对局/3D/音效由 deepspace-3d.mjs 提供，这里只做编排。
import { initGame, startMatch, audio, setReturnHandler, setStoryCam, setTutorialLock } from './deepspace-3d.mjs';
import { openOnline, bootOnline } from './deepspace-online.mjs';

const HUMAN = 'you';
const $ = (id) => document.getElementById(id);
const FEEDBACK_TO = 'samscaread@gmail.com';

// ---- 过场动画引擎：一串“节拍”文字，可跳过 ----
function waitOrSkip(ms, skipped) {
  return new Promise((res) => { let e = 0; const id = setInterval(() => { e += 80; if (e >= ms || skipped()) { clearInterval(id); res(); } }, 80); });
}
async function cine(beats, opts = {}) {
  const ov = $('cinematic'), txt = $('cineText'), skip = $('cineSkip');
  let skipped = false; skip.onclick = () => { skipped = true; };
  if (opts.cam) setStoryCam(true);        // 3D 场景进入电影运镜
  $('cineRain').hidden = !opts.rain;      // 雨丝氛围层
  ov.hidden = false;
  for (const b of beats) {
    if (skipped) break;
    ov.className = 'overlay cine ' + (b.cls || '');
    txt.textContent = b.text;
    txt.classList.remove('show'); void txt.offsetWidth; txt.classList.add('show');
    await waitOrSkip(b.ms, () => skipped);
    txt.classList.remove('show');
    await waitOrSkip(260, () => skipped);
  }
  ov.hidden = true; ov.className = 'overlay cine';
  $('cineRain').hidden = true;
  if (opts.cam) setStoryCam(false);
}

const STORY = [
  { text: '2099 年。γ 区，永夜的霓虹里。', ms: 3000, cls: 'city' },
  { text: '我是个常年游走在边缘的雇佣兵。', ms: 2800 },
  { text: '合约越来越少。义体的月供、房租、维修费……', ms: 3400 },
  { text: '钱包空了，命却还得续。', ms: 2800 },
  { text: '于是，每当走投无路，我就来这儿——', ms: 2800 },
  { text: 'γ-7 气闸厅。一把枪，几发弹，实弹与空包。', ms: 3600, cls: 'danger' },
  { text: '赢了，够我撑过这个月。', ms: 2600 },
  { text: '输了……就当替这座站，省下一份氧气。', ms: 3400, cls: 'danger' },
];
const CREDITS = [
  { text: '《深空轮盘》', ms: 2600, cls: 'title' },
  { text: '游戏设计　SamDScaread', ms: 3000 },
  { text: '程序与美术　Claude', ms: 3000 },
  { text: '献给所有在边缘求生的人。', ms: 3000, cls: 'danger' },
  { text: '—— 感谢游玩 ——', ms: 2600, cls: 'title' },
];

// ---- 新手教程：笨 AI + 逐步弹窗引导 ----
function makeTutorial() {
  const steps = [
    { text: '欢迎来到 γ-7 气闸厅。顶部数字是弹仓里剩余的【实弹 / 空包】数——但弹序是隐藏的，你不知道下一发是实是空。' },
    { when: (v) => v.turnId === HUMAN, text: '轮到你了。两种选择：①「抵住自己」开枪——若打出空包则安然无恙、且保留回合再来一发；②「瞄准仲裁者」——把这一发的风险丢给对面。' },
    { when: (v) => (v.items[HUMAN] || []).length > 0, text: '你拿到道具了！点击下方道具即可使用。例如「扫描仪」能偷看当前这一发是实是空，帮你做决定。' },
    { onEvent: (ev) => ev.kind === 'shoot' && ev.shell === 'live', text: '实弹会扣血。任意一方血量归零，就输掉这一局。' },
    { onEvent: (ev) => ev.kind === 'reload', text: '弹仓打空会重新装填，而且越往后实弹越多、空包越少——越打越凶险。' },
    { text: '规则就这些：三局两胜，每局初始血量递减 4 → 3 → 2。剩下的，靠胆量和运气。祝你活着出去。' },
  ];
  let i = 0, open = false, lastView = null;
  function tryShow(events) {
    if (i >= steps.length || open) return;
    const s = steps[i];
    const ok = s.when ? (lastView && s.when(lastView)) : s.onEvent ? (events || []).some(s.onEvent) : true;
    if (ok) {
      open = true; setTutorialLock(true);
      showCoach(s.text, () => {
        open = false; i++; tryShow([]);
        if (!open) setTutorialLock(false);
      });
    }
  }
  return (view, events) => { lastView = view; tryShow(events); };
}
function showCoach(text, onOk) {
  $('coachText').textContent = text;
  $('coach').hidden = false;
  $('coachOk').onclick = () => { $('coach').hidden = true; onOk && onOk(); };
}

// ---- 路由 ----
function showMenu() { hideAllOverlays(); $('menu').hidden = false; }
function hideAllOverlays() {
  ['menu', 'difficultyScreen', 'feedbackScreen', 'exitScreen', 'coach', 'cinematic', 'startScreen', 'onlineScreen'].forEach((id) => { $(id).hidden = true; });
}

function openDifficulty() { hideAllOverlays(); $('difficultyScreen').hidden = false; }
function startPractice(difficulty = 'standard') { hideAllOverlays(); startMatch({ difficulty }); }
function startTutorial() { $('menu').hidden = true; startMatch({ dumb: true, onStep: makeTutorial() }); }

async function playStory() { $('menu').hidden = true; await cine(STORY, { cam: true, rain: true }); }
async function playCredits() { $('menu').hidden = true; await cine(CREDITS, { cam: true }); }

function openFeedback() {
  hideAllOverlays(); $('feedbackScreen').hidden = false; $('fbText').value = '';
  $('fbText').focus();
}
function sendFeedback() {
  const body = encodeURIComponent(($('fbText').value || '').slice(0, 4000));
  const subject = encodeURIComponent('《深空轮盘》玩家反馈');
  window.location.href = `mailto:${FEEDBACK_TO}?subject=${subject}&body=${body}`;
  showMenu();
}
function quit() {
  hideAllOverlays(); $('exitScreen').hidden = false;
  try { window.close(); } catch { /* 多数浏览器不允许脚本关闭非脚本打开的标签页 */ }
}

// 标题闸门点击：解锁音频（需用户手势），首次进入则自动播放故事+教程，否则进主菜单
async function enter() {
  audio.init();
  $('startScreen').hidden = true;
  if (!localStorage.getItem('ds_seen')) {
    localStorage.setItem('ds_seen', '1');
    await playStory();   // 首次：先看背景故事……
    startTutorial();     // ……再直接进新手教程
  } else {
    showMenu();
  }
}

function boot() {
  initGame();                  // 构建 3D 场景（作为菜单背景），接好对局内按钮
  bootOnline();                // 接好联机大厅按钮
  setReturnHandler(showMenu);  // 对局结束/退出 -> 回主菜单
  $('enterBtn').onclick = enter;
  $('mPractice').onclick = openDifficulty;
  $('diffTraining').onclick = () => startPractice('training');
  $('diffStandard').onclick = () => startPractice('standard');
  $('diffHard').onclick = () => startPractice('hard');
  $('diffBack').onclick = showMenu;
  $('mOnline').onclick = () => openOnline(showMenu);
  $('mStory').onclick = async () => { await playStory(); showMenu(); };
  $('mTutorial').onclick = startTutorial;
  $('mCredits').onclick = async () => { await playCredits(); showMenu(); };
  $('mFeedback').onclick = openFeedback;
  $('mQuit').onclick = quit;
  $('fbSend').onclick = sendFeedback;
  $('fbCancel').onclick = showMenu;
  $('exitBack').onclick = showMenu;
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
