// 《深空轮盘》3D 体素版前端。Three.js 渲染深空气闸厅里的赌命对决：低分辨率渲染 +
// 最近邻放大 = 脆像素感；赛博朋克美术（雇佣兵 vs 仲裁者，仅参考画风、无任何角色名）；
// 开枪慢动作 + 命中喷血 + 受伤黑屏闪烁 + 主角叹气 + 漂浮尘埃/屏幕故障/血雾环境氛围。
// 游戏规则引擎、AI、恐怖音效全部原样复用（与 2D 版同源）。
import * as THREE from 'three';
import { GLTFLoader } from '/js/vendor/GLTFLoader.js';
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

// ============================================================ 3D 场景（隔桌面对面）
const PX = 1.5;               // 像素化倍率（调小=更精细，便于看清人物面部）
const OPP_Z = -2.95;          // 对手坐在桌子对面（更远，容纳更大的体型）
const TY = 1.0;               // 桌面高度
const OPP_SCALE = 1.28;       // 对手整体放大
const SEAT = { x: 0, y: 1.98, z: 4.25 };  // 你的座位（第一人称视角，已后拉以配合更大的桌与对手）
const LOOK = { x: 0, y: 1.18, z: -1.25 }; // 视线落在桌面与对手之间
// 放入 assets/models/opponent.glb 后，把 enabled 改为 true 即替换占位角色；其余参数可微调。
const MODEL = { enabled: false, opponent: '/assets/models/opponent.glb', targetH: 3.4, scaleMul: 1, yOffset: 0, rotY: 0 };
const lerp = (a, b, t) => a + (b - a) * t;
let renderer, scene, camera, clock;
const S = {};

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.3, ...o });
const emat = (emissive, ei = 1.6, color = 0x05070b) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, metalness: 0.4, roughness: 0.5 });
function addBox(g, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); g.add(m); return m;
}
// 圆滑零件：用胶囊/球/圆柱搭出更像人的体块。
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 5, 12);
const ball = (r) => new THREE.SphereGeometry(r, 16, 12);
const cyl = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 14);
function addPart(g, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
}

// 坐在对面的对手：风格化写实的赛博朋克边缘人——真实人脸（眉/眼/鼻/嘴/下颌）、
// 莫西干+剃边发型、皮夹克立领、一只义眼与铬制义肢手臂。仅借鉴画风，不复制任何具体角色。
function buildOpponent() {
  const g = new THREE.Group();
  const skin = mat(0xb38a6e, { roughness: 0.82 });                     // 皮肤
  const skinD = mat(0x8f6a52, { roughness: 0.9 });                     // 皮肤暗部/剃边
  const jacket = mat(0x191d23, { metalness: 0.25, roughness: 0.6 });   // 深色皮夹克
  const jacketHi = mat(0x2b3340, { metalness: 0.3, roughness: 0.5 });  // 立领/护板(钢蓝)
  const shirt = mat(0x2a1a20, { roughness: 0.9 });                     // 暗红内衬
  const chrome = mat(0x9aa3ad, { metalness: 0.95, roughness: 0.2 });   // 铬义肢
  const dark = mat(0x14110f, { roughness: 0.9 });                      // 眼窝/缝隙
  const hair = mat(0x141013, { roughness: 0.8 });                      // 发色
  const eye = emat(0x37d0d8, 2.6);                                     // 义眼(发光)
  const cyan = emat(0x2fb9c4, 2.2), amber = emat(0xd9893a, 1.6), magenta = emat(0xc83a6e, 1.3), red = emat(0xe2304a, 2.0);

  const addHand = (x, m) => {
    addBox(g, 0.16, 0.07, 0.14, m, x, 1.12, 0.82);                     // 掌
    for (let i = 0; i < 3; i++) addBox(g, 0.035, 0.05, 0.12, m, x - 0.05 + i * 0.05, 1.12, 0.94); // 指
    addBox(g, 0.04, 0.05, 0.08, m, x + (x < 0 ? 0.09 : -0.09), 1.12, 0.86); // 拇指
  };

  // —— 躯干 / 夹克 ——
  addPart(g, capsule(0.27, 0.5), shirt, 0, 1.55, 0.02);                            // 内衬
  addPart(g, capsule(0.36, 0.5), jacket, 0, 1.55, -0.02);                          // 夹克身
  addBox(g, 0.2, 0.62, 0.1, jacket, -0.17, 1.6, 0.26, 0, 0, 0.16);                 // 左前襟
  addBox(g, 0.2, 0.62, 0.1, jacket, 0.17, 1.6, 0.26, 0, 0, -0.16);                 // 右前襟
  addBox(g, 0.04, 0.5, 0.06, chrome, 0.02, 1.6, 0.32, 0, 0, -0.16);                // 拉链
  addBox(g, 0.13, 0.13, 0.04, amber, -0.24, 1.74, 0.3, 0, 0, 0.2);                 // 夹克徽章(发光)
  addPart(g, cyl(0.27, 0.34, 0.42), jacket, 0, 1.2, 0);                            // 腰身收束
  addPart(g, capsule(0.2, 0.74), jacket, 0, 2.0, -0.02, 0, 0, Math.PI / 2);        // 肩线
  addBox(g, 0.36, 0.18, 0.42, jacketHi, -0.44, 2.12, 0);                           // 左肩护板
  addBox(g, 0.34, 0.16, 0.4, jacketHi, 0.44, 2.12, 0);                             // 右肩护板
  addBox(g, 0.18, 0.26, 0.1, jacketHi, -0.16, 2.06, 0.18, 0.3, 0, 0);              // 左立领
  addBox(g, 0.18, 0.26, 0.1, jacketHi, 0.16, 2.06, 0.18, 0.3, 0, 0);              // 右立领

  // —— 手臂（左肉手 / 右铬义肢）——
  addPart(g, capsule(0.14, 0.34), jacket, -0.47, 1.78, 0.06, 0.45, 0, 0.18);       // 左上臂
  addPart(g, capsule(0.115, 0.46), jacket, -0.44, 1.22, 0.5, Math.PI / 2.1, 0, 0); // 左前臂(袖)
  addHand(-0.44, skin);
  addPart(g, capsule(0.14, 0.34), chrome, 0.47, 1.78, 0.06, 0.45, 0, -0.18);       // 右上臂(义肢)
  addPart(g, cyl(0.1, 0.12, 0.5), chrome, 0.44, 1.22, 0.5, Math.PI / 2, 0, 0);     // 右前臂(义肢筒)
  addPart(g, new THREE.TorusGeometry(0.12, 0.03, 6, 12), cyan, 0.44, 1.22, 0.4, Math.PI / 2, 0, 0); // 义肢环灯
  addHand(0.44, chrome);

  // —— 颈 + 改造 ——
  addPart(g, cyl(0.12, 0.14, 0.2), skin, 0, 2.3, 0);                               // 颈
  addBox(g, 0.05, 0.1, 0.06, chrome, -0.13, 2.32, 0.04);                           // 颈部接口
  addBox(g, 0.03, 0.03, 0.03, cyan, -0.13, 2.36, 0.07);                            // 接口灯

  // —— 头 / 脸（五官）——
  const head = addPart(g, ball(0.24), skin, 0, 2.62, 0.0); head.scale.set(0.94, 1.08, 1.0);
  addBox(g, 0.3, 0.2, 0.26, skin, 0, 2.5, 0.06);                                   // 下颌
  addBox(g, 0.14, 0.1, 0.12, skin, 0, 2.43, 0.18);                                 // 下巴
  addBox(g, 0.3, 0.05, 0.07, skinD, 0, 2.69, 0.2);                                 // 眉骨
  addBox(g, 0.1, 0.025, 0.04, hair, -0.09, 2.675, 0.235);                          // 左眉
  addBox(g, 0.1, 0.025, 0.04, hair, 0.09, 2.675, 0.235);                           // 右眉
  addBox(g, 0.1, 0.06, 0.03, dark, -0.095, 2.63, 0.225);                           // 左眼窝
  addBox(g, 0.1, 0.06, 0.03, dark, 0.095, 2.63, 0.225);                            // 右眼窝
  addPart(g, ball(0.03), mat(0xd8d2c8, { roughness: 0.5 }), -0.095, 2.63, 0.245);  // 左眼(肉眼)
  addPart(g, ball(0.018), dark, -0.095, 2.63, 0.265);                              // 左瞳
  addPart(g, ball(0.042), eye, 0.095, 2.63, 0.245);                                // 右眼(义眼,发光)
  addBox(g, 0.06, 0.13, 0.13, skin, 0, 2.58, 0.26, 0.15, 0, 0);                    // 鼻
  addBox(g, 0.11, 0.022, 0.03, mat(0x6a3a32, { roughness: 0.8 }), 0, 2.5, 0.255);  // 嘴
  addBox(g, 0.05, 0.11, 0.1, skin, -0.235, 2.6, 0.02);                             // 左耳
  addBox(g, 0.05, 0.11, 0.1, skin, 0.235, 2.6, 0.02);                              // 右耳
  // 改造：右侧下颌铬板 + 左颞植入
  addBox(g, 0.08, 0.2, 0.2, chrome, 0.19, 2.52, 0.08);                             // 右颌铬板
  addBox(g, 0.02, 0.12, 0.02, cyan, 0.235, 2.52, 0.16);                            // 颌板灯纹
  addBox(g, 0.06, 0.07, 0.06, chrome, -0.2, 2.72, 0.12);                           // 左颞植入
  addPart(g, ball(0.018), amber, -0.2, 2.72, 0.16);                                // 植入灯
  // 发型：剃边 + 上方莫西干（带霓虹挑染）
  addBox(g, 0.16, 0.12, 0.34, skinD, -0.18, 2.66, -0.02);                          // 左剃边
  addBox(g, 0.16, 0.12, 0.34, skinD, 0.18, 2.66, -0.02);                           // 右剃边
  const crop = addPart(g, ball(0.23), hair, 0, 2.74, -0.04); crop.scale.set(0.78, 0.62, 1.02); // 顶发
  addBox(g, 0.1, 0.2, 0.46, hair, 0, 2.9, -0.02);                                  // 莫西干
  addBox(g, 0.05, 0.21, 0.46, magenta, 0, 2.93, -0.02);                            // 霓虹挑染
  S.oppVisor = eye;   // 回合高亮：义眼会更亮
  return g;
}

// 第一人称：你搭在桌沿的两条前臂（带手指的手，左肉手、右铬义肢）。
function buildHands() {
  const g = new THREE.Group();
  const sleeve = mat(0x191d23, { metalness: 0.2, roughness: 0.7 });
  const skin = mat(0xb08a6a, { roughness: 0.85 });
  const chrome = mat(0x9aa3ad, { metalness: 0.95, roughness: 0.2 });
  const y = TY + 0.06;
  const hand = (x, m) => {
    addBox(g, 0.18, 0.08, 0.16, m, x, y, 0.72);                                   // 掌
    for (let i = 0; i < 3; i++) addBox(g, 0.04, 0.06, 0.14, m, x - 0.055 + i * 0.055, y, 0.58); // 指
    addBox(g, 0.05, 0.06, 0.09, m, x + (x < 0 ? 0.1 : -0.1), y, 0.66);            // 拇指
  };
  addPart(g, capsule(0.13, 0.6), sleeve, -0.6, y, 1.25, Math.PI / 2.2, 0, 0);     // 左前臂(袖)
  hand(-0.6, skin);
  addPart(g, cyl(0.1, 0.12, 0.6), chrome, 0.6, y, 1.25, Math.PI / 2, 0, 0);       // 右前臂(义肢)
  addPart(g, new THREE.TorusGeometry(0.12, 0.03, 6, 12), emat(0x2fb9c4, 2), 0.6, y, 1.0, Math.PI / 2, 0, 0); // 环灯
  hand(0.6, chrome);
  return g;
}

// 枪管沿本地 +Z；yaw=0 指向你(+Z)，yaw=π 指向对手(-Z)。
function buildGun() {
  const g = new THREE.Group();
  const metal = mat(0x10151c, { metalness: 0.85, roughness: 0.3 });
  const steel = mat(0x424a56, { metalness: 0.9, roughness: 0.3 });
  addBox(g, 0.2, 0.2, 0.72, metal, 0, 0, 0.06);        // 机身
  addBox(g, 0.13, 0.13, 0.56, steel, 0, 0.03, 0.52);   // 枪管
  addBox(g, 0.18, 0.34, 0.16, metal, 0, -0.22, -0.2);  // 握把
  addBox(g, 0.22, 0.08, 0.1, steel, 0, 0.13, -0.05);   // 照门
  addBox(g, 0.1, 0.1, 0.08, emat(0xe2304a, 2.6), 0, 0.14, -0.18); // 红色指示灯
  return g;
}

function buildRoom() {
  const g = (w, h, d, m, x, y, z) => { const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); e.position.set(x, y, z); scene.add(e); return e; };
  g(40, 1, 30, mat(0x0a0e15, { metalness: 0.4, roughness: 0.95 }), 0, -0.5, -2);            // 地面（带点蓝）
  for (let i = -4; i <= 4; i++) g(0.06, 0.02, 16, emat(0x12424a, 0.7), i * 1.7, 0.01, -3);  // 地面青色接缝
  // 对手身后的后墙（带色板）
  g(40, 18, 1, mat(0x0c1119, { roughness: 1 }), 0, 6, -7);
  g(7, 4.2, 0.2, mat(0x182230, { metalness: 0.3, roughness: 0.8 }), 0, 2.6, -6.85);          // 墙面金属板
  for (let i = 0; i < 6; i++) g(1.0, 0.45, 0.06, emat(i % 2 ? 0xcf6a1b : 0x803012, i % 2 ? 1.0 : 0.4, 0x140a04), -8.4 + i * 3.4, 0.6, -6.78); // 橙色警示条
  g(4.4, 0.12, 0.06, emat(0xd9893a, 1.1, 0x140a04), -5.6, 3.1, -6.8);                          // 暖色长灯带
  g(4.4, 0.12, 0.06, emat(0x2fb9c4, 0.9, 0x06222a), 5.6, 3.1, -6.8);                           // 冷色长灯带
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.3, 6, 18), emat(0x1d5a64, 0.7, 0x0b1016));
  ring.material.metalness = 0.7; ring.position.set(0, 3.3, -6.7); scene.add(ring); S.ring = ring;
  // 侧面管线（暖/冷点缀）
  g(0.25, 7, 0.25, mat(0x2a3340, { metalness: 0.7, roughness: 0.4 }), -5.5, 3, -5);
  g(0.25, 7, 0.25, mat(0x2a3340, { metalness: 0.7, roughness: 0.4 }), 5.5, 3, -5);
  // 头顶灯具（昏暗顶光的实体）
  S.lamp = g(1.6, 0.3, 1.0, emat(0xdce6f2, 0.6, 0x0a0e14), 0, 4.6, -0.4);
}

function buildScene() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  $('stage').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.Fog(0x05070c, 8, 26);

  camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);

  S.amb = new THREE.AmbientLight(0x1b2740, 1.0); scene.add(S.amb);          // 低环境光（昏暗基调）
  S.topBase = 130;                                                          // 顶光基础强度
  S.topLight = new THREE.SpotLight(0xdce6f2, S.topBase, 16, 0.62, 0.7, 1.5); // 桌面昏暗顶光（会闪烁）
  S.topLight.position.set(0, 4.5, -0.4); S.topLight.target.position.set(0, TY, -0.5);
  scene.add(S.topLight, S.topLight.target);
  S.warmFill = new THREE.PointLight(0x5a3a1e, 7, 10, 2); S.warmFill.position.set(0, 1.5, 3.4); scene.add(S.warmFill); // 你这侧暖色补光
  S.coolRim = new THREE.PointLight(0x163e48, 12, 12, 2); S.coolRim.position.set(0, 2.4, -4.2); scene.add(S.coolRim);  // 对手身后冷色轮廓光
  S.faceL = new THREE.PointLight(0xb0bdd0, 14, 7, 2); S.faceL.position.set(0, 2.6, -1.5); scene.add(S.faceL);         // 打亮对手面部，让五官可辨
  S.redL = new THREE.PointLight(0xe2304a, 6, 10, 2); S.redL.position.set(0, 1.9, 2.2); scene.add(S.redL);            // 你回合的暖红
  S.cyL = new THREE.PointLight(0x2fb9c4, 6, 12, 2); S.cyL.position.set(0, 2.3, -2.0); scene.add(S.cyL);              // 对手回合的青
  S.flashL = new THREE.PointLight(0xff3b3b, 0, 20, 2); S.flashL.position.set(0, 1.5, 0); scene.add(S.flashL);

  buildRoom();
  // 长桌（沿 Z 摆放，双方隔桌相对）—— 更大，给桌面陈列留出空间
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 4.6), mat(0x1a2230, { metalness: 0.5, roughness: 0.6 }));
  table.position.set(0, TY - 0.25, -0.7); scene.add(table);
  const inlay = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 4.4), emat(0x123842, 0.5, 0x0e1620));
  inlay.position.set(0, TY + 0.005, -0.7); scene.add(inlay);              // 桌面发光内嵌

  S.opp = buildOpponent(); S.opp.scale.setScalar(OPP_SCALE); S.opp.position.set(0, 0, OPP_Z); scene.add(S.opp); // 对手坐对面、面朝你(+Z)，体型更大
  S.hands = buildHands(); scene.add(S.hands);                                 // 第一人称双手

  S.gun = buildGun(); S.gun.position.set(0, TY + 0.1, -0.5); scene.add(S.gun);
  S.muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), emat(0xff6a22, 4, 0xffd9a0));
  S.muzzle.visible = false; scene.add(S.muzzle);

  // 桌面陈列：血量代币、子弹、道具——全部材质缓存复用
  S.hpAlive = emat(0xe7b24a, 1.7, 0x3a2a08);   // 暖琥珀=生命
  S.hpDead = mat(0x241a0a);
  S.shellGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 8);
  S.brass = mat(0x8a6a28, { metalness: 0.7, roughness: 0.45 });
  S.liveMat = emat(0xe2304a, 2, 0x3a0710); S.blankMat = emat(0x2fb9c4, 2, 0x06343a);
  S.itemMat = {
    smoke: emat(0xd9a441, 1.6, 0x2a1d06), scanner: emat(0x2fb9c4, 1.6, 0x06262c),
    ejector: emat(0xc8d0d8, 1.4, 0x1c2026), maglock: emat(0xe2304a, 1.6, 0x2a0810),
    overload: emat(0xc24fce, 1.6, 0x270a2c),
  };
  S.cube = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  S.hpYou = new THREE.Group(); S.hpOpp = new THREE.Group(); S.shells = new THREE.Group(); S.items = new THREE.Group();
  scene.add(S.hpYou, S.hpOpp, S.shells, S.items);

  S.bloodGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  S.bloodMat = emat(0xe2304a, 1.3, 0x7a0712);
  S.blood = [];
  for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(S.bloodGeo, S.bloodMat); m.visible = false; scene.add(m); S.blood.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 }); }

  const N = 240, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  S.dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0x7a8696, size: 0.04, transparent: true, opacity: 0.4, sizeAttenuation: true }));
  scene.add(S.dust);

  S.shakeT = 0; S.shakeMag = 0; S.gunYaw = Math.PI; S.gunYawTarget = Math.PI; S.gunLift = 0;
  S.muzzleT = 0; S.flinch = { you: 0, ai: 0 }; S.turn = null;
  S.zoom = 0; S.zoomTarget = 0; S.slowmo = false; S.nextGlitch = 5; S.storyCam = false;
  S.topGain = 1; S.lastLook = new THREE.Vector3(LOOK.x, LOOK.y, LOOK.z);
  S.intro = { active: false, t: 0, dur: 1.7, fromPos: new THREE.Vector3(), fromTgt: new THREE.Vector3() };
  S.oppBase = { y: 0, z: OPP_Z }; S.mixer = null;

  clock = new THREE.Clock();
  resize(); window.addEventListener('resize', resize);
  renderer.setAnimationLoop(loop);
  loadOpponentModel();   // 有 .glb 就替换占位角色，没有则保留几何体小人
}

// 尝试加载对手 3D 模型；自动缩放到目标高度、双脚落地、水平居中。无文件则静默沿用占位角色。
function loadOpponentModel() {
  if (!MODEL.enabled) return; // 未启用：不发请求、保持控制台干净、沿用占位角色
  fetch(MODEL.opponent)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((buf) => {
      if (!buf) return; // 没有模型文件 -> 保留占位几何体
      new GLTFLoader().parse(buf, '', (gltf) => {
        const m = gltf.scene;
        m.rotation.y = MODEL.rotY;
        let box = new THREE.Box3().setFromObject(m); const size = new THREE.Vector3(); box.getSize(size);
        m.scale.multiplyScalar((MODEL.targetH / (size.y || 1)) * MODEL.scaleMul);
        box = new THREE.Box3().setFromObject(m); const c = new THREE.Vector3(); box.getCenter(c);
        S.oppBase = { y: -box.min.y + MODEL.yOffset, z: OPP_Z };
        m.position.set(-c.x, S.oppBase.y, OPP_Z);
        scene.remove(S.opp); S.opp = m; scene.add(m); S.oppVisor = null;
        if (gltf.animations && gltf.animations.length) {
          S.mixer = new THREE.AnimationMixer(m); S.mixer.clipAction(gltf.animations[0]).play();
        }
        log('已载入对手 3D 模型。', 'cyan');
      }, (e) => console.warn('模型解析失败（若用了 Draco/KTX2 压缩，请用未压缩 .glb 重新导出）：', e && e.message ? e.message : e));
    })
    .catch(() => { /* 取模型失败：静默沿用占位角色 */ });
}

// 开局：镜头从当前(菜单/故事)位置流畅过渡到座位视角，顶光渐亮、环境光压暗。
function beginIntro() {
  if (!camera) return;
  S.storyCam = false;
  S.intro.active = true; S.intro.t = 0;
  S.intro.fromPos.copy(camera.position);
  S.intro.fromTgt.copy(S.lastLook);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(Math.max(200, Math.floor(w / PX)), Math.max(120, Math.floor(h / PX)), false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  // 桌面昏暗顶光：偶尔骤暗一下营造紧张
  const flick = Math.random() < 0.05 ? 0.22 + Math.random() * 0.2 : 0.82 + Math.sin(t * 8.5) * 0.07 + Math.sin(t * 2.3) * 0.05;
  S.topLight.intensity = S.topBase * flick * S.topGain;
  S.lamp.material.emissiveIntensity = 0.5 * flick + 0.08;
  if (S.ring) S.ring.material.emissiveIntensity = 0.5 + Math.sin(t * 1.3) * 0.2;

  // 回合方亮起：你=暖红(近侧)，对手=青(对面)
  S.redL.intensity = 4 + (S.turn === HUMAN ? 14 : 0) + Math.sin(t * 2) * 1.5;
  S.cyL.intensity = 4 + (S.turn === AI ? 16 : 0) + Math.sin(t * 2.2) * 1.5;
  if (S.oppVisor) S.oppVisor.emissiveIntensity = 2.0 + (S.turn === AI ? 1.2 : 0) + Math.sin(t * 3) * 0.3;

  // 对手呼吸 + 命中后仰（沿 -Z 往后缩）；占位角色与真模型共用 oppBase 基准位
  if (S.mixer) S.mixer.update(dt);
  S.opp.position.z = S.oppBase.z - S.flinch.ai * 0.5;
  S.opp.position.y = S.oppBase.y + Math.sin(t * 1.4) * 0.02;
  S.flinch.ai *= (1 - Math.min(1, dt * 4));
  S.hands.position.z = S.flinch.you * 0.4;   // 你受击时手往回缩
  S.flinch.you *= (1 - Math.min(1, dt * 4));

  // 枪：转向目标 + 抬起后落回（yaw=π 指向对手，0 指向你）
  S.gunYaw += (S.gunYawTarget - S.gunYaw) * Math.min(1, dt * 12);
  S.gun.rotation.y = S.gunYaw;
  S.gun.position.y += ((TY + 0.1 + S.gunLift) - S.gun.position.y) * Math.min(1, dt * 9);
  S.gunLift *= (1 - Math.min(1, dt * 3));

  if (S.muzzleT > 0) {
    S.muzzleT -= dt; S.muzzle.visible = true;
    S.muzzle.material.emissiveIntensity = 2 + Math.random() * 4;
    S.flashL.intensity = Math.max(0, S.muzzleT * 300);
  } else { S.muzzle.visible = false; S.flashL.intensity = 0; }

  for (const p of S.blood) {
    if (p.life <= 0) continue;
    p.life -= dt; if (p.life <= 0) { p.mesh.visible = false; continue; }
    p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
    p.vy -= 9.8 * dt * 0.4; p.mesh.scale.setScalar(Math.max(0.2, p.life * 1.8));
  }

  const dp = S.dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + dt * 0.1; if (y > 7) y = 0; dp.setY(i, y); }
  dp.needsUpdate = true;

  S.nextGlitch -= dt; if (S.nextGlitch <= 0) { glitch(); S.nextGlitch = 4 + Math.random() * 6; }

  // —— 相机：故事运镜 / 开局过渡 / 座位视角 ——
  if (S.storyCam) {
    S.topGain = 0.55; S.amb.intensity = 1.7;
    camera.position.set(Math.sin(t * 0.13) * 4.2, 2.6 + Math.sin(t * 0.09) * 0.7, 4.6 + Math.cos(t * 0.11) * 2.2);
    camera.fov = 46; camera.updateProjectionMatrix();
    S.lastLook.set(0, 1.5, -1.2); camera.lookAt(S.lastLook);
    renderer.render(scene, camera); return;
  }
  if (S.intro.active) {
    S.intro.t += dt; const p = Math.min(1, S.intro.t / S.intro.dur); const e = p * p * (3 - 2 * p);
    S.topGain = e; S.amb.intensity = lerp(1.9, 1.0, e);
    const fp = S.intro.fromPos, ft = S.intro.fromTgt;
    camera.position.set(lerp(fp.x, SEAT.x, e), lerp(fp.y, SEAT.y, e), lerp(fp.z, SEAT.z, e));
    camera.fov = lerp(46, 52, e); camera.updateProjectionMatrix();
    S.lastLook.set(lerp(ft.x, LOOK.x, e), lerp(ft.y, LOOK.y, e), lerp(ft.z, LOOK.z, e)); camera.lookAt(S.lastLook);
    if (p >= 1) S.intro.active = false;
    renderer.render(scene, camera); return;
  }
  // 座位视角 + 慢动作向对手推近 + 抖动
  S.topGain = 1; S.amb.intensity = 1.0;
  S.zoom += (S.zoomTarget - S.zoom) * Math.min(1, dt * 6);
  let ox = 0, oy = 0;
  if (S.shakeT > 0) { S.shakeT -= dt; const m = S.shakeT * S.shakeMag; ox += (Math.random() - 0.5) * m; oy += (Math.random() - 0.5) * m; }
  if (S.zoom > 0.05) { ox += (Math.random() - 0.5) * 0.04 * S.zoom; oy += (Math.random() - 0.5) * 0.04 * S.zoom; }
  camera.position.set(SEAT.x + ox, SEAT.y + oy - 0.18 * S.zoom, SEAT.z - 1.9 * S.zoom);
  camera.fov = 52 - 9 * S.zoom; camera.updateProjectionMatrix();
  S.lastLook.set(LOOK.x, LOOK.y, LOOK.z); camera.lookAt(S.lastLook);

  renderer.render(scene, camera);
}

function clearGroup(g) { while (g.children.length) g.remove(g.children[0]); }

function update3D(v) {
  S.turn = (v.phase === 'duel' || v.phase === 'mercy_duel') ? v.turnId : null;
  // 血量代币：你的在近侧桌沿、对手的在远侧桌沿
  clearGroup(S.hpYou); clearGroup(S.hpOpp);
  const rowHp = (grp, id, z) => {
    const hp = v.hp[id], max = v.hpMax;
    for (let i = 0; i < max; i++) {
      const c = new THREE.Mesh(S.cube, i < hp ? S.hpAlive : S.hpDead);
      c.scale.set(0.8, 1.5, 0.8);
      c.position.set(-(max - 1) * 0.15 + i * 0.3, TY + 0.14, z);
      grp.add(c);
    }
  };
  rowHp(S.hpYou, HUMAN, 1.6); rowHp(S.hpOpp, AI, -2.55);
  // 子弹排（桌中央），第一发=当前膛内（扫描过才染色并抬起）
  clearGroup(S.shells);
  const total = v.mag.total;
  for (let i = 0; i < total; i++) {
    let m = S.brass;
    if (i === 0 && v.currentShell) m = v.currentShell === 'live' ? S.liveMat : S.blankMat;
    const sh = new THREE.Mesh(S.shellGeo, m); sh.rotation.z = Math.PI / 2;
    sh.position.set(-(total - 1) * 0.13 + i * 0.26, TY + 0.07 + (i === 0 ? 0.05 : 0), -0.25);
    S.shells.add(sh);
  }
  // 道具陈列：双方各自摆在自己面前
  clearGroup(S.items);
  const rowItems = (id, z) => {
    const inv = v.items[id] || [];
    inv.forEach((it, i) => {
      const c = new THREE.Mesh(S.cube, S.itemMat[it] || S.brass);
      c.position.set(-(inv.length - 1) * 0.18 + i * 0.36, TY + 0.1, z); S.items.add(c);
    });
  };
  rowItems(HUMAN, 1.0); rowItems(AI, -1.95);
}

// side: 'you'(近/+Z) | 'ai'(对面/-Z)
function aimGun(side) { S.gunYawTarget = side === 'you' ? 0 : Math.PI; S.gunLift = 0.18; }
function muzzleFlash(live, side) {
  const z = side === 'you' ? 0.7 : -1.6;
  S.muzzle.position.set(0, TY + 0.12, z);
  S.muzzle.scale.setScalar(live ? 1.3 : 0.6);
  S.muzzle.material.emissive.setHex(live ? 0xff5522 : 0x66aacc);
  S.flashL.color.setHex(live ? 0xff3b3b : 0x2fb9c4); S.flashL.position.set(0, TY + 0.3, z);
  S.muzzleT = live ? 0.18 : 0.1;
}
function camShake(mag) { S.shakeT = 0.4; S.shakeMag = mag; }

function spawnBlood(side) {
  const isOpp = side === 'ai';
  const oy = isOpp ? 1.95 : 1.4, oz = isOpp ? OPP_Z + 0.35 : 2.5;
  let n = 0;
  for (const p of S.blood) {
    if (p.life > 0) continue; if (n++ >= 16) break;
    p.mesh.visible = true;
    p.mesh.position.set((Math.random() - 0.5) * 0.5, oy + (Math.random() - 0.5) * 0.5, oz + (Math.random() - 0.5) * 0.3);
    p.vx = (Math.random() - 0.5) * 1.2; p.vy = Math.random() * 1.6 + 0.6;
    p.vz = isOpp ? (Math.random() * 1.0 + 0.3) : -(Math.random() * 0.8 + 0.2); // 对手的血喷向你
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

// HUD 只留精简名牌（血量/道具已陈列在 3D 桌面上）。
function renderFighter(elId, v, id, isYou) {
  const el = $(elId);
  el.classList.toggle('turn', v.turnId === id && (v.phase === 'duel' || v.phase === 'mercy_duel'));
  const nm = (v._names && v._names[id]) || (id === HUMAN ? '你' : '仲裁者');
  el.innerHTML = `<span class="nm">${nm}</span><span class="tag">${isYou ? 'EDGERUNNER' : 'ARBITER'}</span><span class="hpnum">♥ ${v.hp[id]}/${v.hpMax}</span>`;
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
    if (firstState) { firstState = false; $('log').innerHTML = ''; $('hud').hidden = false; beginIntro(); if (onFirstState) onFirstState(); }
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
  beginIntro();          // 镜头流畅过渡到座位 + 顶光渐亮
  newMatch();
  if (afterStepHook) afterStepHook(viewHuman(), []); // 开局即触发一次（教程开场引导）
  sync();
}
