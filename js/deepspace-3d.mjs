// 《深空轮盘》3D 体素版前端。Three.js 渲染深空气闸厅里的赌命对决：低分辨率渲染 +
// 最近邻放大 = 脆像素感；赛博朋克美术（雇佣兵 vs 仲裁者，仅参考画风、无任何角色名）；
// 开枪慢动作 + 命中喷血 + 受伤黑屏闪烁 + 主角叹气 + 漂浮尘埃/屏幕故障/血雾环境氛围。
// 游戏规则引擎、AI、恐怖音效全部原样复用（与 2D 版同源）。
import * as THREE from 'three';
import game, { ITEM_META } from '/server/games/deepspace.mjs';
import { decideAction, decideMercy, decideActionDumb } from '/js/ai/deepspace-ai.mjs';
import { AudioKit } from '/js/deepspace-audio.mjs';

const HUMAN = 'you';
const AI = 'ai';
const PLAYERS = [{ id: HUMAN, name: '你' }, { id: AI, name: '仲裁者' }];
const NAME = Object.fromEntries(PLAYERS.map((p) => [p.name, p.id]));
const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const audio = new AudioKit();

// ============================================================ 3D 场景
const PX = 3;
const YOU_X = -2.3, AI_X = 2.3;
let renderer, scene, camera, clock;
const S = {};

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.3, ...o });
const emat = (emissive, ei = 1.6, color = 0x05070b) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, metalness: 0.4, roughness: 0.5 });
function addBox(g, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); g.add(m); return m;
}

// 赛博朋克体素角色。kind: 'merc'(你/边缘雇佣兵) | 'arbiter'(仲裁者/站务核心)
function buildFighter(kind) {
  const g = new THREE.Group();
  if (kind === 'merc') {
    const jacket = mat(0x232a1c, { metalness: 0.2, roughness: 0.9 });   // 军绿夹克
    const dark = mat(0x14171d), skin = mat(0xb98a6a, { roughness: 1 });
    const chrome = mat(0x8d97a4, { metalness: 0.9, roughness: 0.25 });   // 义肢
    const neon = emat(0xff5a2a, 2.2);                                    // 橙红霓虹
    const cyan = emat(0x2fb9c4, 2.0);
    addBox(g, 0.92, 0.2, 0.52, dark, 0, 1.02, 0);                        // 腰带
    addBox(g, 0.92, 1.04, 0.52, jacket, 0, 1.6, 0);                      // 夹克躯干
    addBox(g, 0.12, 0.9, 0.06, neon, 0.18, 1.62, 0.27);                  // 胸口霓虹拉链
    addBox(g, 0.5, 0.12, 0.55, neon, 0, 1.14, 0.0);                      // 腰部光带
    addBox(g, 0.98, 0.22, 0.56, jacket, 0, 2.16, 0);                     // 立领
    addBox(g, 0.34, 0.24, 0.54, jacket, -0.52, 2.12, 0);                 // 左肩
    addBox(g, 0.34, 0.24, 0.54, jacket, 0.52, 2.12, 0);                  // 右肩
    addBox(g, 0.22, 0.56, 0.24, jacket, -0.58, 1.72, 0.06);              // 左上臂
    addBox(g, 0.2, 0.5, 0.22, dark, -0.58, 1.2, 0.06);                   // 左前臂
    addBox(g, 0.24, 0.56, 0.26, chrome, 0.58, 1.72, 0.06);              // 右上臂(义肢)
    addBox(g, 0.22, 0.5, 0.24, chrome, 0.58, 1.2, 0.06);                // 右前臂(义肢)
    addBox(g, 0.06, 0.3, 0.25, cyan, 0.7, 1.2, 0.06);                   // 义肢发光缝
    addBox(g, 0.26, 0.18, 0.26, skin, 0, 2.34, 0);                       // 脖子
    addBox(g, 0.5, 0.52, 0.5, skin, 0, 2.62, 0);                         // 头
    addBox(g, 0.52, 0.1, 0.08, cyan, 0, 2.66, 0.26);                     // 眼部目镜
    addBox(g, 0.54, 0.16, 0.54, dark, 0, 2.94, 0);                       // 发型底
    addBox(g, 0.1, 0.22, 0.5, neon, 0, 3.06, 0);                         // 莫西干霓虹
    addBox(g, 0.08, 0.16, 0.1, cyan, 0.28, 2.62, 0.08);                  // 耳后植入体
    g.userData.tint = 0xff5a2a;
  } else {
    const chrome = mat(0x10141c, { metalness: 0.85, roughness: 0.3 });   // 黑铬机体
    const plate = mat(0x0a0d14, { metalness: 0.9, roughness: 0.2 });
    const cyan = emat(0x2fb9c4, 2.4);
    const red = emat(0xe2304a, 2.2);
    addBox(g, 1.0, 0.22, 0.56, plate, 0, 1.04, 0);                       // 底盘
    addBox(g, 1.0, 1.12, 0.58, chrome, 0, 1.64, 0);                      // 躯干
    addBox(g, 0.34, 0.34, 0.3, cyan, 0, 1.72, 0.28);                     // 胸口核心(发光)
    addBox(g, 0.9, 0.1, 0.6, cyan, 0, 1.18, 0);                          // 腰环
    addBox(g, 0.46, 0.34, 0.64, plate, -0.62, 2.18, 0);                  // 左大肩甲
    addBox(g, 0.46, 0.34, 0.64, plate, 0.62, 2.18, 0);                   // 右大肩甲
    addBox(g, 0.08, 0.2, 0.62, cyan, -0.62, 2.18, 0);                    // 肩甲灯
    addBox(g, 0.08, 0.2, 0.62, cyan, 0.62, 2.18, 0);
    addBox(g, 0.26, 0.62, 0.28, chrome, -0.64, 1.74, 0.04);              // 左臂
    addBox(g, 0.24, 0.56, 0.26, chrome, -0.64, 1.18, 0.04);
    addBox(g, 0.26, 0.62, 0.28, chrome, 0.64, 1.74, 0.04);               // 右臂
    addBox(g, 0.24, 0.56, 0.26, chrome, 0.64, 1.18, 0.04);
    addBox(g, 0.24, 0.2, 0.24, plate, 0, 2.36, 0);                       // 颈
    addBox(g, 0.56, 0.58, 0.56, plate, 0, 2.7, 0);                       // 头(全面甲)
    addBox(g, 0.5, 0.12, 0.08, cyan, 0, 2.74, 0.28);                     // 横向视带
    addBox(g, 0.06, 0.4, 0.08, chrome, 0, 2.7, 0.29);                    // 面甲竖缝
    addBox(g, 0.1, 0.1, 0.1, chrome, 0.32, 2.7, 0);                      // 侧扬声器
    addBox(g, 0.1, 0.1, 0.1, chrome, -0.32, 2.7, 0);
    addBox(g, 0.05, 0.42, 0.05, chrome, 0.18, 3.18, 0);                  // 天线
    addBox(g, 0.08, 0.08, 0.08, red, 0.18, 3.42, 0);                     // 天线红灯
    g.userData.tint = 0x2fb9c4;
  }
  return g;
}

function buildGun() {
  const g = new THREE.Group();
  const metal = mat(0x0c1016, { metalness: 0.85, roughness: 0.3 });
  addBox(g, 0.7, 0.18, 0.18, metal, 0.05, 0, 0);
  addBox(g, 0.55, 0.12, 0.12, metal, 0.5, 0.02, 0);
  addBox(g, 0.16, 0.32, 0.16, metal, -0.18, -0.22, 0);
  addBox(g, 0.08, 0.08, 0.2, emat(0xe2304a, 2.4), 0, 0.12, 0);
  return g;
}

function buildRoom() {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 24), mat(0x070a10, { metalness: 0.4, roughness: 0.95 }));
  floor.position.y = -0.5; scene.add(floor);
  for (let i = -4; i <= 4; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 18), emat(0x0a2a30, 0.6));
    seam.position.set(i * 1.6, 0.01, 0); scene.add(seam);
  }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 1), mat(0x080b12, { roughness: 1 }));
  wall.position.set(0, 6, -5); scene.add(wall);
  for (let i = 0; i < 6; i++) {
    const warn = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.05), emat(i % 2 ? 0xcf6a1b : 0x301402, i % 2 ? 0.9 : 0.3, 0x100a04));
    warn.position.set(-8.5 + i * 3.4, 0.7, -4.45); scene.add(warn);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.32, 6, 16), emat(0x123, 0.6, 0x0b0f16));
  ring.material.metalness = 0.7; ring.position.set(0, 3.4, -4.6); scene.add(ring); S.ring = ring;
  S.lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), emat(0xc9d4e0, 0.8, 0x05070b));
  S.lamp.position.set(0, 7.4, 0.5); scene.add(S.lamp);
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
  S.camTarget = new THREE.Vector3(0, 1.55, 0);

  scene.add(new THREE.AmbientLight(0x33405c, 2.3));
  S.overhead = new THREE.SpotLight(0xc9d4e0, 220, 30, 0.75, 0.6, 1.3);
  S.overhead.position.set(0, 8, 1.2); S.overhead.target.position.set(0, 0.8, 0);
  scene.add(S.overhead, S.overhead.target);
  S.redL = new THREE.PointLight(0xe2304a, 26, 18, 2); S.redL.position.set(YOU_X, 2.8, 2.2); scene.add(S.redL);
  S.cyL = new THREE.PointLight(0x2fb9c4, 26, 18, 2); S.cyL.position.set(AI_X, 2.8, 2.2); scene.add(S.cyL);
  S.flashL = new THREE.PointLight(0xff3b3b, 0, 22, 2); S.flashL.position.set(0, 1.6, 1.6); scene.add(S.flashL);

  buildRoom();
  const table = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 2.1), mat(0x0e131b, { metalness: 0.5, roughness: 0.7 }));
  table.position.set(0, 0.78, 0.3); scene.add(table);
  const front = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 0.12), mat(0x0a0e14)); front.position.set(0, 0.5, 1.32); scene.add(front);

  S.you = buildFighter('merc'); S.you.position.set(YOU_X, 0, 0.1); S.you.rotation.y = 0.32; scene.add(S.you);
  S.ai = buildFighter('arbiter'); S.ai.position.set(AI_X, 0, 0.1); S.ai.rotation.y = -0.32; scene.add(S.ai);

  S.gun = buildGun(); S.gun.position.set(0, 1.12, 0.3); scene.add(S.gun);
  S.muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), emat(0xff6a22, 4, 0xffd9a0));
  S.muzzle.visible = false; scene.add(S.muzzle);

  // 复用资源：血量体素、桌面弹排、血粒子、尘埃
  S.pipGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  S.pipMat = emat(0xe2304a, 1.8, 0x3a0710);
  S.pipDead = mat(0x140306);
  S.shellGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6);
  S.brass = mat(0x6b5320, { metalness: 0.7, roughness: 0.5 });
  S.liveMat = emat(0xe2304a, 2, 0x3a0710); S.blankMat = emat(0x2fb9c4, 2, 0x06343a);
  S.pips = new THREE.Group(); S.shells = new THREE.Group(); scene.add(S.pips, S.shells);

  S.bloodGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  S.bloodMat = emat(0xe2304a, 1.3, 0x7a0712);
  S.blood = [];
  for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(S.bloodGeo, S.bloodMat); m.visible = false; scene.add(m); S.blood.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 }); }

  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  S.dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0x6a7585, size: 0.045, transparent: true, opacity: 0.45, sizeAttenuation: true }));
  scene.add(S.dust);

  S.shakeT = 0; S.shakeMag = 0; S.gunYaw = 0; S.gunYawTarget = 0; S.gunLift = 0;
  S.muzzleT = 0; S.flinch = { you: 0, ai: 0 }; S.turn = null;
  S.zoom = 0; S.zoomTarget = 0; S.slowmo = false; S.nextGlitch = 5; S.storyCam = false;

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

  const fl = Math.random() < 0.04 ? 0.25 : 0.85 + Math.sin(t * 7) * 0.1;
  S.lamp.material.emissiveIntensity = fl; S.overhead.intensity = 180 * fl + 40;
  if (S.ring) S.ring.material.emissiveIntensity = 0.5 + Math.sin(t * 1.3) * 0.2;

  S.redL.intensity = 22 + (S.turn === HUMAN ? 16 : 0) + Math.sin(t * 2) * 3;
  S.cyL.intensity = 22 + (S.turn === AI ? 16 : 0) + Math.sin(t * 2.2) * 3;

  for (const [id, fig, bx] of [[HUMAN, S.you, YOU_X], [AI, S.ai, AI_X]]) {
    fig.position.y = Math.sin(t * 1.6 + (id === AI ? 1.5 : 0)) * 0.025;
    fig.position.x = bx + Math.sign(bx) * S.flinch[id];
    S.flinch[id] *= (1 - Math.min(1, dt * 4));
  }

  S.gunYaw += (S.gunYawTarget - S.gunYaw) * Math.min(1, dt * 12);
  S.gun.rotation.y = S.gunYaw;
  S.gun.position.y += ((1.12 + S.gunLift) - S.gun.position.y) * Math.min(1, dt * 9);
  S.gunLift *= (1 - Math.min(1, dt * 3));

  if (S.muzzleT > 0) {
    S.muzzleT -= dt; S.muzzle.visible = true;
    S.muzzle.material.emissiveIntensity = 2 + Math.random() * 4;
    S.flashL.intensity = Math.max(0, S.muzzleT * 260);
  } else { S.muzzle.visible = false; S.flashL.intensity = 0; }

  // 血粒子
  for (const p of S.blood) {
    if (p.life <= 0) continue;
    p.life -= dt; if (p.life <= 0) { p.mesh.visible = false; continue; }
    p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
    p.vy -= 9.8 * dt * 0.4; p.mesh.scale.setScalar(Math.max(0.2, p.life * 1.8));
  }

  // 尘埃缓慢上飘 + 回绕
  const dp = S.dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + dt * 0.12; if (y > 9) y = 0; dp.setY(i, y); }
  dp.needsUpdate = true; S.dust.rotation.y += dt * 0.01;

  // 偶发屏幕故障
  S.nextGlitch -= dt; if (S.nextGlitch <= 0) { glitch(); S.nextGlitch = 4 + Math.random() * 6; }

  // 背景故事/鸣谢的电影运镜：镜头在气闸厅里缓缓游移
  if (S.storyCam) {
    camera.position.set(Math.sin(t * 0.13) * 4.4, 3.0 + Math.sin(t * 0.09) * 0.8, 9.0 + Math.cos(t * 0.11) * 2.4);
    camera.fov = 44; camera.updateProjectionMatrix();
    camera.lookAt(0, 1.7, 0);
    renderer.render(scene, camera);
    return;
  }

  // 慢动作推镜 + 抖动
  S.zoom += (S.zoomTarget - S.zoom) * Math.min(1, dt * 6);
  let ox = 0, oy = 0;
  if (S.shakeT > 0) { S.shakeT -= dt; const m = S.shakeT * S.shakeMag; ox += (Math.random() - 0.5) * m; oy += (Math.random() - 0.5) * m; }
  if (S.zoom > 0.05) { ox += (Math.random() - 0.5) * 0.05 * S.zoom; oy += (Math.random() - 0.5) * 0.05 * S.zoom; }
  camera.position.set(S.camBase.x + ox, S.camBase.y + oy - 0.3 * S.zoom, S.camBase.z - 2.7 * S.zoom);
  camera.fov = 46 - 7 * S.zoom; camera.updateProjectionMatrix();
  camera.lookAt(S.camTarget);

  renderer.render(scene, camera);
}

function clearGroup(g) { while (g.children.length) g.remove(g.children[0]); }

function update3D(v) {
  S.turn = (v.phase === 'duel' || v.phase === 'mercy_duel') ? v.turnId : null;
  clearGroup(S.pips);
  for (const [id, fig] of [[HUMAN, S.you], [AI, S.ai]]) {
    const hp = v.hp[id], max = v.hpMax;
    for (let i = 0; i < max; i++) {
      const pip = new THREE.Mesh(S.pipGeo, i < hp ? S.pipMat : S.pipDead);
      pip.position.set(fig.position.x - (max - 1) * 0.12 + i * 0.24, 3.6, 0.1);
      S.pips.add(pip);
    }
  }
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

// side: 'you'(左) | 'ai'(右)
function aimGun(side) {
  S.gunYawTarget = side === 'you' ? Math.PI : 0; // 枪管(+x)指向目标方
  S.gunLift = 0.22;
}
function muzzleFlash(live, side) {
  S.muzzle.position.set(side === 'you' ? -0.7 : 0.7, 1.18, 0.3);
  S.muzzle.scale.setScalar(live ? 1.3 : 0.6);
  S.muzzle.material.emissive.setHex(live ? 0xff5522 : 0x66aacc);
  S.flashL.color.setHex(live ? 0xff3b3b : 0x2fb9c4);
  S.muzzleT = live ? 0.18 : 0.1;
}
function camShake(mag) { S.shakeT = 0.4; S.shakeMag = mag; }

function spawnBlood(side) {
  const fig = side === 'you' ? S.you : S.ai;
  const dir = fig.position.x < 0 ? -1 : 1;
  let n = 0;
  for (const p of S.blood) {
    if (p.life > 0) continue; if (n++ >= 16) break;
    p.mesh.visible = true;
    p.mesh.position.set(fig.position.x + (Math.random() - 0.5) * 0.3, 1.75 + (Math.random() - 0.5) * 0.5, 0.2 + (Math.random() - 0.5) * 0.3);
    p.vx = (Math.random() * 0.7 + 0.25) * dir; p.vy = Math.random() * 1.7 + 0.6; p.vz = (Math.random() - 0.5) * 0.9;
    p.life = 0.6 + Math.random() * 0.35;
  }
}

// 慢动作：开枪前推镜 + 抖动 + 加速心跳（<1 秒）。victimSide: 'you'|'ai'
async function preShot(victimSide) {
  aimGun(victimSide);
  S.zoomTarget = 1; S.slowmo = true;
  $('app').classList.add('slowmo');
  audio.setTension(0.98);
  $('hint').textContent = '……';
  await delay(720);
  S.zoomTarget = 0; S.slowmo = false;
  $('app').classList.remove('slowmo');
}

// 受伤：黑屏闪烁 + 强震 + 故障
function injury() {
  const b = $('blackout');
  b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 130);
  setTimeout(() => { b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 90); }, 210);
  camShake(1.5); flash('hit'); glitch();
}
function glitch() { const g = $('glitch'); g.classList.remove('on'); void g.offsetWidth; g.classList.add('on'); setTimeout(() => g.classList.remove('on'), 220); }

// ============================================================ 游戏循环
let state = null, aiBusy = false, lastEnd = null;
// 由菜单/教程注入的可调项
let aiDecide = decideAction, aiMercyFn = decideMercy, afterStepHook = null, onReturnToMenu = null, curOpts = {};
// 联机状态：online=true 时渲染由服务器回传的视图/事件驱动；lastView 是当前渲染所用视图。
let lastView = null, online = false, net = null, netMe = null, netOpp = null;
const viewHuman = () => game.viewFor(state, HUMAN);
const viewAi = () => game.viewFor(state, AI);

function newMatch() {
  state = game.createInitialState(PLAYERS);
  lastEnd = null; logLines = []; $('log').innerHTML = '';
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
  render(viewHuman());
  if (afterStepHook) afterStepHook(viewHuman(), res.events); // 教程引导钩子
  return true;
}

async function humanAct(action) {
  if (aiBusy) return;
  const v = viewHuman();
  if (v.turnId !== HUMAN || (state.phase !== 'duel' && state.phase !== 'mercy_duel')) return;
  if (action.type === 'shoot') {
    aiBusy = true; setControls(false);
    await preShot(action.target === 'self' ? 'you' : 'ai');
    aiBusy = false;
    applyStep(HUMAN, action);
  } else applyStep(HUMAN, action);
  sync();
}

// 统一的玩家操作入口：联机时发往服务器（效果由回传事件驱动），单机走本地逻辑。
function playerAct(action) {
  if (online) {
    if (!lastView || lastView.turnId !== 'you' || (lastView.phase !== 'duel' && lastView.phase !== 'mercy_duel')) return;
    setControls(false);
    net.action(action);
  } else humanAct(action);
}
function chooseMercy(choice) {
  hideOverlays();
  if (online) net.action({ type: 'mercy', choice });
  else { applyStep(HUMAN, { type: 'mercy', choice }); sync(); }
}

async function runAi() {
  if (aiBusy) return; aiBusy = true; setControls(false);
  try {
    while (true) {
      if (state.phase === 'finished') break;
      if (state.phase === 'mercy_choice') {
        if (state.matchWinnerId !== AI) break;
        $('hint').textContent = '仲裁者正在裁决你的生死……';
        await delay(1500); applyStep(AI, { type: 'mercy', choice: aiMercyFn(viewAi()) }); continue;
      }
      if (viewHuman().turnId !== AI) break;
      $('hint').textContent = '仲裁者正在权衡……';
      await delay(620 + Math.random() * 600);
      const action = aiDecide(viewAi());
      if (action.type === 'shoot') await preShot(action.target === 'self' ? 'ai' : 'you');
      applyStep(AI, action);
      await delay(200);
    }
  } finally { aiBusy = false; sync(); }
}

function sync() {
  render(viewHuman());
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
function render(v) {
  lastView = v;
  const tag = v.phase === 'mercy_duel' ? '怜悯决战'
    : v.matchRound === 3 ? '决胜局' : `第 ${'一二三'[v.matchRound - 1]} 局`;
  const rt = $('roundTag'); rt.textContent = tag;
  rt.classList.toggle('crit', v.phase === 'mercy_duel' || v.matchRound === 3);
  $('winsTag').innerHTML = `战绩　你 <b>${v.roundWins[HUMAN]}</b> : <b>${v.roundWins[AI]}</b> 仲裁者`;

  const scan = v.currentShell
    ? `<span class="scanned">扫描确认：当前为 ${v.currentShell === 'live' ? '实弹' : '空包'}</span>` : '弹序未知';
  $('magReadout').innerHTML = `
    <div class="counts">
      <div><span class="live">${v.mag.liveLeft}</span><small>实弹</small></div>
      <div><span class="blank">${v.mag.blankLeft}</span><small>空包</small></div>
    </div><div class="status">${scan}</div>`;

  renderFighter('oppPanel', v, AI, false);
  renderFighter('youPanel', v, HUMAN, true);
  renderItemBar(v);
  update3D(v);
  $('mist').style.opacity = String(Math.min(0.42, tension() * 0.5)); // 血雾随紧张升高
}

function renderFighter(elId, v, id, isYou) {
  const el = $(elId);
  el.classList.toggle('turn', v.turnId === id && (v.phase === 'duel' || v.phase === 'mercy_duel'));
  const hp = v.hp[id], max = v.hpMax;
  const cells = Array.from({ length: max }, (_, i) => `<div class="cell ${i < hp ? 'full' : 'lost'}"></div>`).join('');
  const items = (v.items[id] || []).map((it) => {
    const m = ITEM_META[it]; return `<div class="item"><span class="ic">${m.icon}</span>${m.label}</div>`;
  }).join('') || '<span class="empty">无道具</span>';
  const nm = (v._names && v._names[id]) || (id === HUMAN ? '你' : '仲裁者');
  el.innerHTML = `
    <div class="who"><span class="nm">${nm}</span>
      <span class="tag">${isYou ? 'EDGERUNNER' : 'ARBITER'}</span></div>
    <div class="hp">${cells}</div>
    <div class="items">${items}</div>`;
}

function renderItemBar(v) {
  const bar = $('itemBar');
  if (!v) { bar.innerHTML = ''; return; }
  const inv = v.items[HUMAN] || [];
  const yourTurn = v.turnId === HUMAN && (v.phase === 'duel' || v.phase === 'mercy_duel') && !aiBusy;
  if (!inv.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = inv.map((it) => {
    const m = ITEM_META[it];
    return `<div class="item ${yourTurn ? 'usable' : ''}" data-item="${it}" title="${m.desc}"><span class="ic">${m.icon}</span>${m.label}</div>`;
  }).join('');
  if (yourTurn) bar.querySelectorAll('.item').forEach((n) => { n.onclick = () => playerAct({ type: 'item', item: n.dataset.item }); });
}

function setControls(enabled) {
  $('controls').setAttribute('aria-disabled', String(!enabled));
  $('shootSelf').disabled = !enabled; $('shootOpp').disabled = !enabled;
  renderItemBar(lastView);
}

// ============================================================ 事件 -> 音 + 3D + 日志
function handleEvent(ev) {
  switch (ev.kind) {
    case 'shoot': {
      const live = ev.shell === 'live';
      const tgt = ev.target === 'self' ? '自己' : '对手';
      const vSide = ev.victimId === HUMAN ? 'you' : 'ai'; // byId/victimId 已是 'you'/'ai'（联机时已重映射）
      const sSide = ev.byId === HUMAN ? 'you' : 'ai';
      aimGun(vSide); muzzleFlash(live, vSide);
      if (live) {
        audio.bang(); audio.hit(); camShake(0.9); flash('hit'); S.flinch[vSide] = 0.3; spawnBlood(vSide);
        if (vSide === 'you') injury();
        log(`${ev.by} 抵住${tgt}扣下扳机 —— 实弹炸响，命中${vSide === 'you' ? '你' : '对手'}！`, 'live');
      } else {
        audio.click(); camShake(0.18); flash('blank');
        if (vSide === 'you') audio.sigh('relief');          // 空枪没打中自己 -> 长舒一口气
        else if (sSide === 'you') audio.sigh('light');      // 你空枪打对手 -> 轻叹
        log(`${ev.by} 抵住${tgt}扣下扳机 —— 空响。`, '');
      }
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
  const v = lastView; if (!v) return 0.3;
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
  const v = lastView, won = v.winnerId === HUMAN, credits = v.credits[HUMAN], via = lastEnd && lastEnd.viaMercy;
  let flavor;
  if (won && via) flavor = '你赦免了它，又亲手了结了它。γ-7 的氧气，今夜归你。';
  else if (!won && via) flavor = '怜悯是你最后的傲慢。对手从绝境里爬起，按下了扳机。';
  else if (won) flavor = '舱门嘶鸣着打开。你踏过冷却的枪管，走向下一段黑暗。';
  else flavor = '红光熄灭。站务核心记录：编号已注销。';
  const buttons = online
    ? `<button class="grant" id="toMenuBtn">返回主菜单</button>`
    : `<button class="grant" id="againBtn">再入气闸</button><button id="toMenuBtn">返回主菜单</button>`;
  $('endScreen').innerHTML = `
    <div class="verdict ${won ? 'win' : 'lose'}">${won ? '你 活 着' : '你 死 在 了 这 里'}</div>
    <div class="credits-line">结算信用点：<b>${credits >= 0 ? '+' : ''}${credits}</b>${via ? '（怜悯豪赌）' : ''}</div>
    <div class="flavor">${flavor}</div>
    <div class="mercy-actions">${buttons}</div>`;
  $('endScreen').hidden = false;
  if (!online) $('againBtn').onclick = () => { hideOverlays(); startMatch(curOpts); };
  $('toMenuBtn').onclick = () => { hideOverlays(); $('hud').hidden = true; if (online) leaveOnline(); if (onReturnToMenu) onReturnToMenu(); };
}

// ============================================================ 联机模式
function nameById(view, id) { const p = (view.players || []).find((x) => x.id === id); return p ? p.name : String(id); }
// 把服务器视角(数字 id)重映射成本地的 you/ai，从而复用同一套渲染。
function remapView(view) {
  const me = view.you, op = view.opponent;
  const M = (id) => (id === me ? 'you' : id === op ? 'ai' : id);
  const pick = (o) => ({ you: o ? o[me] : undefined, ai: o ? o[op] : undefined });
  return {
    ...view, you: 'you', opponent: 'ai',
    hp: pick(view.hp), roundWins: pick(view.roundWins), credits: pick(view.credits),
    items: { you: (view.items && view.items[me]) || [], ai: (view.items && view.items[op]) || [] },
    skipNext: pick(view.skipNext), buff: pick(view.buff),
    turnId: view.turnId != null ? M(view.turnId) : null,
    mercyChoiceFor: view.mercyChoiceFor != null ? M(view.mercyChoiceFor) : null,
    winnerId: view.winnerId != null ? M(view.winnerId) : null,
    _names: { you: nameById(view, me), ai: nameById(view, op) },
  };
}
function remapEvent(ev) {
  const M = (id) => (id === netMe ? 'you' : id === netOpp ? 'ai' : id);
  const e = { ...ev };
  if (e.byId != null) e.byId = M(e.byId);
  if (e.victimId != null) e.victimId = M(e.victimId);
  if (e.winnerId != null) e.winnerId = M(e.winnerId);
  return e;
}

export function startOnline({ client, myId, onFirstState }) {
  online = true; net = client; netMe = myId; netOpp = null;
  lastView = null; lastEnd = null; logLines = [];
  let firstState = true;
  let q = Promise.resolve();
  const enq = (fn) => { q = q.then(fn).catch((e) => console.error(e)); };
  client.on('state', (m) => enq(async () => {
    if (firstState) { firstState = false; $('log').innerHTML = ''; $('hud').hidden = false; if (onFirstState) onFirstState(); }
    netMe = m.view.you; netOpp = m.view.opponent; const v = remapView(m.view); render(v); onlineControls(v);
  }));
  client.on('event', (m) => enq(async () => { const ev = remapEvent(m.event); if (ev.kind === 'shoot') await preShot(ev.victimId === 'you' ? 'you' : 'ai'); handleEvent(ev); }));
  client.on('over', (m) => enq(async () => { netMe = m.view.you; netOpp = m.view.opponent; render(remapView(m.view)); showEnd(); }));
  client.on('disconnected', () => { if (online) { online = false; $('hud').hidden = true; hideOverlays(); if (onReturnToMenu) onReturnToMenu(); } });
}
export function leaveOnline() { if (net) { try { net.leave(); net.disconnect(); } catch { /* ignore */ } } online = false; net = null; }

function onlineControls(v) {
  if (v.phase === 'finished') return;
  if (v.phase === 'mercy_choice') {
    if (v.mercyChoiceFor === 'you') showMercy();
    else { hideOverlays(); setControls(false); $('hint').textContent = '对手正在决定是否怜悯你……'; }
    return;
  }
  hideOverlays();
  const myTurn = v.turnId === 'you' && (v.phase === 'duel' || v.phase === 'mercy_duel');
  setControls(myTurn);
  $('hint').textContent = myTurn ? '轮到你 —— 抵住自己赌一把，或瞄准对手。' : '等待对手行动……';
}

// ============================================================ 对外 API（供菜单/教程驱动）
export { audio };
export function setReturnHandler(fn) { onReturnToMenu = fn; }
export function setStoryCam(on) { if (S) S.storyCam = !!on; } // 背景故事/鸣谢时的电影运镜开关

export function initGame() {
  buildScene();
  $('shootSelf').onclick = () => playerAct({ type: 'shoot', target: 'self' });
  $('shootOpp').onclick = () => playerAct({ type: 'shoot', target: 'opponent' });
  $('mercyGrant').onclick = () => chooseMercy('grant');
  $('mercyExec').onclick = () => chooseMercy('decline');
}

// opts: { dumb?:bool, onStep?:(view,events)=>void }  —— 启动一局单机对局
export function startMatch(opts = {}) {
  online = false; net = null; curOpts = opts;
  aiDecide = opts.dumb ? decideActionDumb : decideAction;
  aiMercyFn = opts.dumb ? () => 'decline' : decideMercy;
  afterStepHook = opts.onStep || null;
  hideOverlays();
  $('hud').hidden = false;
  newMatch();
  if (afterStepHook) afterStepHook(viewHuman(), []); // 开局即触发一次（教程开场引导）
  sync();
}
