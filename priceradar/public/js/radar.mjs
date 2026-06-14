// 比价雷达 · PriceRadar — 雷达图（纯 canvas，无依赖）
// drawRadar(canvas, labels, datasets) 把多维得分画成蜘蛛网，可叠加多个商品对比。

export function drawRadar(canvas, labels, datasets, opts = {}) {
  const dpr = window.devicePixelRatio || 1;
  const size = opts.size || 240;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return; // 无 canvas 支持（如测试环境）时安全跳过
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2 + 6;
  const R = size * 0.34;
  const N = labels.length;
  const lightText = opts.light ? 'rgba(255,255,255,.85)' : '#64748b';
  const grid = opts.light ? 'rgba(255,255,255,.22)' : '#e6eaf2';

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;

  // 网格圈
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    const r = (R * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = angle(i % N);
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 轴线 + 标签
  ctx.fillStyle = lightText;
  ctx.font = '11px -apple-system, "PingFang SC", sans-serif';
  for (let i = 0; i < N; i++) {
    const a = angle(i);
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    ctx.strokeStyle = grid;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    const lx = cx + (R + 14) * Math.cos(a), ly = cy + (R + 14) * Math.sin(a);
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? 'center' : (Math.cos(a) > 0 ? 'left' : 'right');
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], lx, ly);
  }
  // 数据多边形
  for (const ds of datasets) {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const idx = i % N;
      const v = Math.max(0, Math.min(100, ds.values[idx] || 0)) / 100;
      const a = angle(idx);
      const x = cx + R * v * Math.cos(a), y = cy + R * v * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = ds.fill || hexA(ds.color, 0.18);
    ctx.fill();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < N; i++) {
      const v = Math.max(0, Math.min(100, ds.values[i] || 0)) / 100;
      const a = angle(i);
      ctx.beginPath();
      ctx.arc(cx + R * v * Math.cos(a), cy + R * v * Math.sin(a), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = ds.color; ctx.fill();
    }
  }
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const RADAR_COLORS = ['#0e7490', '#f59e0b', '#7c3aed', '#16a34a'];
