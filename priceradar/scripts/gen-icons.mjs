// 生成 PWA 图标（雷达主题）。纯 Node + zlib 手写最小 PNG 编码器，无第三方依赖。
// 用法：node scripts/gen-icons.mjs  →  public/icons/*.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- CRC32 / PNG 编码 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- 绘制雷达图标 ---
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function drawIcon(size, { padding = 0 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = (size / 2) * (1 - padding);
  const set = (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 背景竖向渐变 teal
      const t = y / size;
      let r = lerp(0x0e, 0x0d, t), g = lerp(0x74, 0x94, t), b = lerp(0x90, 0x88, t);
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const d = dist / R;
      // 圆形裁切（圆角方块背景：超出半径仍保留深色底，便于 maskable 安全区）
      if (d > 1.06) { set(x, y, 0x08, 0x2f, 0x3a, 255); continue; }
      // 同心雷达环
      for (const ring of [0.4, 0.66, 0.92]) {
        if (Math.abs(d - ring) < 0.022) { r = 0xbf; g = 0xef; b = 0xf0; }
      }
      // 扫描扇形高亮（右上）
      const ang = Math.atan2(dy, dx);
      if (d < 0.95 && ang > -1.15 && ang < -0.35) {
        const k = 0.18; r = lerp(r, 255, k); g = lerp(g, 255, k); b = lerp(b, 255, k);
      }
      // 中心光点（琥珀）
      if (d < 0.12) { r = 0xf5; g = 0x9e; b = 0x0b; }
      set(x, y, r, g, b, 255);
    }
  }
  return encodePNG(size, size, buf);
}

const files = [
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  ['icon-maskable-512.png', 512, 0.18], // maskable 留更大安全区
  ['apple-touch-icon.png', 180, 0.04],
];
for (const [name, size, padding] of files) {
  writeFileSync(join(OUT, name), drawIcon(size, { padding }));
  console.log('written', name, size);
}
console.log('icons done →', OUT);
