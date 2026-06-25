// 《深空轮盘》3D 体素版前端。Three.js 渲染一座深空气闸厅里的对决：低分辨率渲染 +
// 最近邻放大 = 脆像素感；深空暗调 + 红/青双色光 + 枪口火光 + 镜头震动 + 命中后仰。
// 游戏规则引擎、AI、恐怖音效全部原样复用（与 2D 版同源）。
import * as THREE from 'three';
import game, { ITEM_META } from '/server/games/deepspace.mjs';
import { decideAction, decideMercy } from '/js/ai/deepspace-ai.mjs';
import { AudioKit } from '/js/deepspace-audio.mjs';

const HUMAN = 'you';
const AI = 'ai';
const PLAYERS = [{ id: HUMAN, name: '你' }, { id: AI, name: '仲裁者' }];
const NAME = Object.fromEntries(PLAYERS.map((p) => [p.name, p.id]));
const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const audio = new AudioKit();

// ============================================================ 3D 场景
const PX = 3;                 // 像素化倍率：内部按 1/PX 分辨率渲染再放大
const YOU_X = -2.3, AI_X = 2.3;
let renderer, scene, camera, clock;
const S = {};                 // 场景对象引用 + 动画状态

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.25, ...o });
function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); return m;
}

function buildFighter(tint) {
  const g = new THREE.Group();
  const body = mat(0x161b24, { metalness: 0.5, roughness: 0.6 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x0a0d13, emissive: tint, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.4 });
  g.add(box(0.95, 1.15, 0.55, body, 0, 1.5, 0));      // 躯干
  g.add(box(0.98, 0.12, 0.58, trim, 0, 2.0, 0));      // 胸口发光条
  g.add(box(0.6, 0.58, 0.58, body, 0, 2.35, 0));      // 头
  const visor = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: tint, emissiveIntensity: 2.6 });
  g.add(box(0.62, 0.18, 0.06, visor, 0, 2.4, 0.29));  // 面甲
  g.add(box(0.22, 0.85, 0.22, body, -0.62, 1.55, 0.12)); // 左臂
  g.add(box(0.22, 0.85, 0.22, body, 0.62, 1.55, 0.12));  // 右臂
  g.userData.tint = tint;
  return g;
}

function buildGun() {
  const g = new THREE.Group();
  const metal = mat(0x0c1016, { metalness: 0.8, roughness: 0.35 });
  g.add(box(0.7, 0.18, 0.18, metal, 0.05, 0, 0));     // 机身
  g.add(box(0.55, 0.12, 0.12, metal, 0.5, 0.02, 0));  // 枪管（指向 +x）
  g.add(box(0.16, 0.32, 0.16, metal, -0.18, -0.22, 0)); // 握把
  const led = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe2304a, emissiveIntensity: 2 });
  g.add(box(0.08, 0.08, 0.2, led, 0.0, 0.12, 0));     // 红色指示灯
  return g;
}

function buildRoom() {
  // 地面
  scene.add(box(40, 1, 24, mat(0x070a10, { metalness: 0.4, roughness: 0.9 }), 0, -0.5, 0));
  for (let i = -4; i <= 4; i++) {            // 地面发光接缝
    const seam = new THREE.MeshStandardMaterial({ color: 0x05080d, emissive: 0x0a2a30, emissiveIntensity: 0.6 });
    scene.add(box(0.06, 0.02, 18, seam, i * 1.6, 0.01, 0));
  }
  // 后墙
  scene.add(box(40, 16, 1, mat(0x080b12, { roughness: 1 }), 0, 6, -5));
  // 警示条纹
  for (let i = 0; i < 6; i++) {
    const warn = new THREE.MeshStandardMaterial({ color: 0x100a04, emissive: i % 2 ? 0xcf6a1b : 0x301402, emissiveIntensity: i % 2 ? 0.9 : 0.3 });
    scene.add(box(1.1, 0.5, 0.05, warn, -8 + i * 0.0 + i, 0.6, -4.45));
  }
  // 气闸圆门
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.32, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0x0b0f16, emissive: 0x123, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.4 }));
  ring.position.set(0, 3.4, -4.6); scene.add(ring); S.ring = ring;
  // 悬挂的故障灯
  S.lamp = box(1.2, 0.25, 0.5, new THREE.MeshStandardMaterial({ color: 0x05070b, emissive: 0xc9d4e0, emissiveIntensity: 0.8 }), 0, 7.4, 0.5);
  scene.add(S.lamp);
}

function buildScene() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  $('stage').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04050a);
  scene.fog = new THREE.Fog(0x04050a, 15, 34);

  camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 100);
  S.camBase = new THREE.Vector3(0.0, 3.8, 9.4);
  S.camTarget = new THREE.Vector3(0, 1.45, 0);

  scene.add(new THREE.AmbientLight(0x33405c, 2.3));
  S.overhead = new THREE.SpotLight(0xc9d4e0, 220, 30, 0.75, 0.6, 1.3);
  S.overhead.position.set(0, 8, 1.2); S.overhead.target.position.set(0, 0.8, 0);
  scene.add(S.overhead, S.overhead.target);
  S.redL = new THREE.PointLight(0xe2304a, 26, 18, 2); S.redL.position.set(YOU_X, 2.8, 2.2); scene.add(S.redL);
  S.cyL = new THREE.PointLight(0x2fb9c4, 26, 18, 2); S.cyL.position.set(AI_X, 2.8, 2.2); scene.add(S.cyL);
  S.flashL = new THREE.PointLight(0xff3b3b, 0, 22, 2); S.flashL.position.set(0, 1.6, 1.6); scene.add(S.flashL);

  buildRoom();
  scene.add(box(4.6, 0.5, 2.1, mat(0x0e131b, { metalness: 0.5, roughness: 0.7 }), 0, 0.78, 0.3)); // 桌
  scene.add(box(4.6, 0.6, 0.12, mat(0x0a0e14), 0, 0.5, 1.32));

  S.you = buildFighter(0xe2304a); S.you.position.set(YOU_X, 0, 0.1); scene.add(S.you);
  S.ai = buildFighter(0x2fb9c4); S.ai.position.set(AI_X, 0, 0.1); S.ai.rotation.y = Math.PI; scene.add(S.ai);

  S.gun = buildGun(); S.gun.position.set(0, 1.12, 0.3); scene.add(S.gun);

  S.muzzle = box(0.22, 0.22, 0.22, new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff6a22, emissiveIntensity: 4 }), 0, 1.15, 0.3);
  S.muzzle.visible = false; scene.add(S.muzzle);

  // 复用的体素弹/血量
  S.pipGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  S.pipMat = new THREE.MeshStandardMaterial({ color: 0x3a0710, emissive: 0xe2304a, emissiveIntensity: 1.8 });
  S.pipDead = new THREE.MeshStandardMaterial({ color: 0x140306, emissive: 0x000000 });
  S.shellGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6);
  S.brass = new THREE.MeshStandardMaterial({ color: 0x6b5320, metalness: 0.7, roughness: 0.5 });
  S.liveMat = new THREE.MeshStandardMaterial({ color: 0x3a0710, emissive: 0xe2304a, emissiveIntensity: 2 });
  S.blankMat = new THREE.MeshStandardMaterial({ color: 0x06343a, emissive: 0x2fb9c4, emissiveIntensity: 2 });
  S.pips = new THREE.Group(); S.shells = new THREE.Group(); scene.add(S.pips, S.shells);

  // 动画状态
  S.shakeT = 0; S.shakeMag = 0; S.gunYaw = 0; S.gunYawTarget = 0; S.gunLift = 0;
  S.muzzleT = 0; S.flinch = { you: 0, ai: 0 }; S.turn = null;

  clock = new THREE.Clock();
  resize(); window.addEventListener('resize', resize);
  renderer.setAnimationLoop(loop);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(Math.max(200, Math.floor(w / PX)), Math.max(120, Math.floor(h / PX)), false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  // 故障灯闪烁 + 头顶聚光抖动
  const fl = Math.random() < 0.04 ? 0.25 : 0.85 + Math.sin(t * 7) * 0.1;
  S.lamp.material.emissiveIntensity = fl; S.overhead.intensity = 180 * fl + 40;
  if (S.ring) S.ring.material.emissiveIntensity = 0.5 + Math.sin(t * 1.3) * 0.2;

  // 当前回合一侧的光更亮
  S.redL.intensity = 22 + (S.turn === HUMAN ? 16 : 0) + Math.sin(t * 2) * 3;
  S.cyL.intensity = 22 + (S.turn === AI ? 16 : 0) + Math.sin(t * 2.2) * 3;

  // 体素角色的轻微呼吸 + 命中后仰
  for (const [id, fig, bx] of [[HUMAN, S.you, YOU_X], [AI, S.ai, AI_X]]) {
    fig.position.y = Math.sin(t * 1.6 + (id === AI ? 1.5 : 0)) * 0.025;
    fig.position.x = bx + Math.sign(bx) * S.flinch[id];
    S.flinch[id] *= (1 - Math.min(1, dt * 4));
  }

  // 枪：朝目标转 + 抬起后落回
  S.gunYaw += (S.gunYawTarget - S.gunYaw) * Math.min(1, dt * 12);
  S.gun.rotation.y = S.gunYaw;
  S.gun.position.y += ((1.12 + S.gunLift) - S.gun.position.y) * Math.min(1, dt * 9);
  S.gunLift *= (1 - Math.min(1, dt * 3));

  // 枪口火光
  if (S.muzzleT > 0) {
    S.muzzleT -= dt; S.muzzle.visible = true;
    S.muzzle.material.emissiveIntensity = 2 + Math.random() * 4;
    S.flashL.intensity = Math.max(0, S.muzzleT * 260);
  } else { S.muzzle.visible = false; S.flashL.intensity = 0; }

  // 镜头震动
  let ox = 0, oy = 0;
  if (S.shakeT > 0) { S.shakeT -= dt; const m = S.shakeT * S.shakeMag; ox = (Math.random() - 0.5) * m; oy = (Math.random() - 0.5) * m; }
  camera.position.set(S.camBase.x + ox, S.camBase.y + oy, S.camBase.z);
  camera.lookAt(S.camTarget);

  renderer.render(scene, camera);
}

// ---- 3D 状态同步 ----
function clearGroup(g) { while (g.children.length) g.remove(g.children[0]); }

function update3D(v) {
  S.turn = (v.phase === 'duel' || v.phase === 'mercy_duel') ? v.turnId : null;
  // 血量体素：每名角色头顶一排红格
  clearGroup(S.pips);
  for (const [id, fig] of [[HUMAN, S.you], [AI, S.ai]]) {
    const hp = v.hp[id], max = v.hpMax;
    for (let i = 0; i < max; i++) {
      const pip = new THREE.Mesh(S.pipGeo, i < hp ? S.pipMat : S.pipDead);
      pip.position.set(fig.position.x - (max - 1) * 0.12 + i * 0.24, 3.05, 0.1);
      S.pips.add(pip);
    }
  }
  // 桌面弹排：剩余弹数，front=当前弹（扫描过则染色）
  clearGroup(S.shells);
  const total = v.mag.total;
  for (let i = 0; i < total; i++) {
    let m = S.brass;
    if (i === 0 && v.currentShell) m = v.currentShell === 'live' ? S.liveMat : S.blankMat;
    const sh = new THREE.Mesh(S.shellGeo, m);
    sh.rotation.z = Math.PI / 2;
    sh.position.set(-(total - 1) * 0.11 + i * 0.22, 1.06 + (i === 0 ? 0.12 : 0), 1.05);
    S.shells.add(sh);
  }
}

function aimGun(victimId) {
  const x = victimId === HUMAN ? YOU_X : AI_X;
  S.gunYawTarget = x < 0 ? Math.PI : 0;  // 枪管(+x)指向目标
  S.gunLift = 0.22;
}
function muzzleFlash(live, victimId) {
  const x = victimId === HUMAN ? YOU_X : AI_X;
  S.muzzle.position.set(x < 0 ? -0.7 : 0.7, 1.18, 0.3);
  S.muzzle.scale.setScalar(live ? 1.3 : 0.6);
  S.muzzle.material.emissive.setHex(live ? 0xff5522 : 0x66aacc);
  S.flashL.color.setHex(live ? 0xff3b3b : 0x2fb9c4);
  S.muzzleT = live ? 0.18 : 0.1;
}
function camShake(mag) { S.shakeT = 0.4; S.shakeMag = mag; }

// ============================================================ 游戏循环（与 2D 同构）
let state = null, aiBusy = false, lastEnd = null;
const viewHuman = () => game.viewFor(state, HUMAN);
const viewAi = () => game.viewFor(state, AI);

function newMatch() {
  state = game.createInitialState(PLAYERS);
  lastEnd = null;
  logLines = []; $('log').innerHTML = '';
  log('气闸密封。脉冲钉枪上膛。', 'cyan');
  const v = viewHuman();
  log(`第 1 局 · 双方各 ${v.hpMax} 滴血。`, 'cyan');
  log(`弹仓：实弹 ${v.mag.liveLeft} · 空包 ${v.mag.blankLeft}。`, '');
}

function applyStep(id, action) {
  let res;
  try { res = game.applyAction(state, id, action); } catch { return false; }
  state = res.state;
  for (const ev of res.events) handleEvent(ev);
  render();
  return true;
}

function humanAct(action) {
  if (aiBusy) return;
  const v = viewHuman();
  if (v.turnId !== HUMAN || (state.phase !== 'duel' && state.phase !== 'mercy_duel')) return;
  applyStep(HUMAN, action); sync();
}

async function runAi() {
  if (aiBusy) return; aiBusy = true; setControls(false);
  try {
    while (true) {
      if (state.phase === 'finished') break;
      if (state.phase === 'mercy_choice') {
        if (state.matchWinnerId !== AI) break;
        $('hint').textContent = '仲裁者正在裁决你的生死……';
        await delay(1500); applyStep(AI, { type: 'mercy', choice: decideMercy(viewAi()) }); continue;
      }
      if (viewHuman().turnId !== AI) break;
      $('hint').textContent = '仲裁者正在权衡……';
      await delay(700 + Math.random() * 700); applyStep(AI, decideAction(viewAi())); await delay(220);
    }
  } finally { aiBusy = false; sync(); }
}

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

// ============================================================ 渲染（HUD + 3D）
function render() {
  const v = viewHuman();
  const tag = v.phase === 'mercy_duel' ? '怜悯决战'
    : v.matchRound === 3 ? '决胜局' : `第 ${'一二三'[v.matchRound - 1]} 局`;
  const rt = $('roundTag'); rt.textContent = tag;
  rt.classList.toggle('crit', v.phase === 'mercy_duel' || v.matchRound === 3);
  $('winsTag').innerHTML = `战绩　你 <b>${v.roundWins[HUMAN]}</b> : <b>${v.roundWins[AI]}</b> 仲裁者`;

  const scan = v.currentShell
    ? `<span class="scanned">扫描确认：当前为 ${v.currentShell === 'live' ? '实弹' : '空包'}</span>`
    : '弹序未知';
  $('magReadout').innerHTML = `
    <div class="counts">
      <div><span class="live">${v.mag.liveLeft}</span><small>实弹</small></div>
      <div><span class="blank">${v.mag.blankLeft}</span><small>空包</small></div>
    </div><div class="status">${scan}</div>`;

  renderFighter('oppPanel', v, AI, false);
  renderFighter('youPanel', v, HUMAN, true);
  renderItemBar(v);
  update3D(v);
}

function renderFighter(elId, v, id, isYou) {
  const el = $(elId);
  el.classList.toggle('turn', v.turnId === id && (v.phase === 'duel' || v.phase === 'mercy_duel'));
  const hp = v.hp[id], max = v.hpMax;
  const cells = Array.from({ length: max }, (_, i) => `<div class="cell ${i < hp ? 'full' : 'lost'}"></div>`).join('');
  const items = (v.items[id] || []).map((it) => {
    const m = ITEM_META[it]; return `<div class="item"><span class="ic">${m.icon}</span>${m.label}</div>`;
  }).join('') || '<span class="empty">无道具</span>';
  el.innerHTML = `
    <div class="who"><span class="nm">${id === HUMAN ? '你' : '仲裁者'}</span>
      <span class="tag">${isYou ? 'PRISONER' : 'ARBITER'}</span></div>
    <div class="hp">${cells}</div>
    <div class="items">${items}</div>`;
}

function renderItemBar(v) {
  const bar = $('itemBar');
  const inv = v.items[HUMAN] || [];
  const yourTurn = v.turnId === HUMAN && (v.phase === 'duel' || v.phase === 'mercy_duel') && !aiBusy;
  if (!inv.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = inv.map((it) => {
    const m = ITEM_META[it];
    return `<div class="item ${yourTurn ? 'usable' : ''}" data-item="${it}" title="${m.desc}"><span class="ic">${m.icon}</span>${m.label}</div>`;
  }).join('');
  if (yourTurn) bar.querySelectorAll('.item').forEach((n) => { n.onclick = () => humanAct({ type: 'item', item: n.dataset.item }); });
}

function setControls(enabled) {
  $('controls').setAttribute('aria-disabled', String(!enabled));
  $('shootSelf').disabled = !enabled; $('shootOpp').disabled = !enabled;
  renderItemBar(viewHuman());
}

// ============================================================ 事件 -> 音 + 3D + 日志
function handleEvent(ev) {
  switch (ev.kind) {
    case 'shoot': {
      const live = ev.shell === 'live';
      const tgt = ev.target === 'self' ? '自己' : '对手';
      const shooter = NAME[ev.by];
      const victim = ev.target === 'self' ? shooter : (shooter === HUMAN ? AI : HUMAN);
      aimGun(victim);
      muzzleFlash(live, victim);
      if (live) { audio.bang(); camShake(0.9); flash('hit'); S.flinch[victim] = 0.28; log(`${ev.by} 抵住${tgt}扣下扳机 —— 实弹炸响！`, 'live'); }
      else { audio.click(); camShake(0.18); flash('blank'); log(`${ev.by} 抵住${tgt}扣下扳机 —— 空响。`, ''); }
      break;
    }
    case 'item': logItem(ev); audio.beep(); S.gunLift = 0.1; break;
    case 'reload': audio.rack(); S.gunLift = 0.18; log(`机括拉动，重新装填：实弹 ${ev.live} · 空包 ${ev.blank}。`, 'cyan'); break;
    case 'skip': audio.beep(); log(`${ev.who} 被磁锁锁死，跳过这一回合。`, 'warn'); break;
    case 'round_end': audio.sting('round'); log(`本局终结 —— ${ev.winner} 活了下来。`, 'warn'); break;
    case 'mercy_offer': audio.sting('dread'); log(`${ev.winner} 赢下整场。是否给予怜悯？`, 'warn'); break;
    case 'mercy_grant': audio.sting('dread'); log(`${ev.giver} 选择了赦免。${ev.taker} 被拖回场上 —— 终极对决。`, 'warn'); break;
    case 'match_end': lastEnd = ev; audio.sting(ev.winnerId === HUMAN ? 'win' : 'lose'); break;
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
  const boost = v.phase === 'mercy_duel' ? 0.35 : v.matchRound >= 3 ? 0.2 : 0;
  return Math.max(0, Math.min(1, 0.22 + (1 - minHp / Math.max(1, v.hpMax)) * 0.34 + (v.mag.liveLeft / tot) * 0.28 + boost));
}

function flash(kind) { const f = $('flash'); f.className = ''; void f.offsetWidth; f.classList.add(kind); setTimeout(() => f.classList.remove(kind), 160); }

let logLines = [];
function log(text, cls) {
  logLines.push({ text, cls }); logLines = logLines.slice(-8);
  $('log').innerHTML = logLines.map((l, i) => `<div class="ln ${l.cls} ${i === logLines.length - 1 ? 'fresh' : ''}">${l.text}</div>`).join('');
}

// ============================================================ 覆盖层
function hideOverlays() { $('mercyScreen').hidden = true; $('endScreen').hidden = true; }
function showMercy() {
  setControls(false);
  $('mercyText').innerHTML = `你赢下了整场对决。<br>是否将仲裁者拖回场上，赌一场终极决战？<br>
    <span style="color:var(--dim)">赦免后再胜得<b style="color:var(--amber)">双倍奖赏</b>；若反被翻盘，则<b style="color:var(--red)">双倍惩罚</b>。</span>`;
  $('mercyScreen').hidden = false;
}
function showEnd() {
  setControls(false);
  const v = viewHuman(), won = v.winnerId === HUMAN, credits = v.credits[HUMAN], via = lastEnd && lastEnd.viaMercy;
  let flavor;
  if (won && via) flavor = '你赦免了它，又亲手了结了它。γ-7 的氧气，今夜归你。';
  else if (!won && via) flavor = '怜悯是你最后的傲慢。仲裁者从绝境里爬起，按下了扳机。';
  else if (won) flavor = '舱门嘶鸣着打开。你踏过冷却的枪管，走向下一段黑暗。';
  else flavor = '红光熄灭。站务核心记录：囚徒编号已注销。';
  $('endScreen').innerHTML = `
    <div class="verdict ${won ? 'win' : 'lose'}">${won ? '你 活 着' : '你 死 在 了 这 里'}</div>
    <div class="credits-line">结算信用点：<b>${credits >= 0 ? '+' : ''}${credits}</b>${via ? '（怜悯豪赌）' : ''}</div>
    <div class="flavor">${flavor}</div>
    <button class="btn-major" id="againBtn">再入气闸</button>`;
  $('endScreen').hidden = false;
  $('againBtn').onclick = () => { hideOverlays(); newMatch(); sync(); };
}

// ============================================================ 启动
function boot() {
  buildScene();
  $('shootSelf').onclick = () => humanAct({ type: 'shoot', target: 'self' });
  $('shootOpp').onclick = () => humanAct({ type: 'shoot', target: 'opponent' });
  $('mercyGrant').onclick = () => { hideOverlays(); applyStep(HUMAN, { type: 'mercy', choice: 'grant' }); sync(); };
  $('mercyExec').onclick = () => { hideOverlays(); applyStep(HUMAN, { type: 'mercy', choice: 'decline' }); sync(); };
  $('enterBtn').onclick = () => { audio.init(); $('startScreen').hidden = true; $('hud').hidden = false; newMatch(); sync(); };
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
