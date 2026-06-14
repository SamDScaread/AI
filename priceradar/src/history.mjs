// 比价雷达 · PriceRadar — 价格历史 / Price history
//
// 双轨：
//   1) 真实快照：每次比价把各产品「最优到手价」按天落盘到 data/history.json，
//      随使用自然累积出真实价格曲线（best-effort，落盘失败不影响主流程）。
//   2) 合成基线：演示阶段历史尚浅时，按 productKey 确定性合成一段 30 天走势，
//      让曲线立刻有内容可看；真实快照会按日期覆盖合成点。

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'history.json');
const MAX_ENTRIES = 5000;

function today() { return new Date().toISOString().slice(0, 10); }
function dayStr(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

// 确定性 30 天走势：围绕当前价做缓慢波动，终点收敛到当前价。
export function syntheticHistory(key, currentPriceCNY, days = 30) {
  const rng = mulberry32(hashStr(key));
  const cur = currentPriceCNY > 0 ? currentPriceCNY : 50;
  let level = cur * (0.85 + rng() * 0.35); // 起点
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const drift = (cur - level) * 0.18;          // 向当前价收敛
    const noise = (rng() - 0.5) * cur * 0.06;    // 日波动
    level = Math.max(cur * 0.6, level + drift + noise);
    out.push({ date: dayStr(i), priceCNY: round2(i === 0 ? cur : level) });
  }
  return out;
}

async function readAll() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return {}; // 文件不存在或损坏 → 空历史
  }
}

// 串行化写入，避免并发 read-modify-write 互相覆盖/读到半截文件。
let _writeChain = Promise.resolve();

/** 记录今日各产品的最优到手价（同 key 同日只留一条）。best-effort、串行、原子写。 */
export function recordSnapshot(items) {
  _writeChain = _writeChain.then(() => _doRecord(items)).catch(() => false);
  return _writeChain;
}

async function _doRecord(items) {
  try {
    const db = await readAll();
    const d = today();
    let count = 0;
    for (const { key, priceCNY } of items) {
      if (!key || !(priceCNY > 0)) continue;
      const arr = (db[key] ||= []);
      const last = arr[arr.length - 1];
      if (last && last.date === d) last.priceCNY = round2(priceCNY);
      else arr.push({ date: d, priceCNY: round2(priceCNY) });
      if (arr.length > 60) arr.splice(0, arr.length - 60);
      count += arr.length;
    }
    // 控制总量
    if (count > MAX_ENTRIES) {
      const keys = Object.keys(db);
      while (keys.length && count > MAX_ENTRIES) { count -= (db[keys[0]]?.length || 0); delete db[keys.shift()]; }
    }
    await mkdir(DATA_DIR, { recursive: true });
    // 原子写：先写临时文件再 rename，避免读到半截内容
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(db), 'utf8');
    await rename(tmp, FILE);
    return true;
  } catch {
    return false; // 只读环境等：忽略
  }
}

/** 取某产品历史曲线：合成基线 + 真实快照按日期覆盖。 */
export async function getHistory(key, currentPriceCNY) {
  const synth = syntheticHistory(key, currentPriceCNY);
  const byDate = new Map(synth.map((p) => [p.date, p.priceCNY]));
  const db = await readAll();
  let realCount = 0;
  for (const snap of db[key] || []) {
    byDate.set(snap.date, snap.priceCNY);
    realCount++;
  }
  const series = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, priceCNY]) => ({ date, priceCNY }));
  const prices = series.map((p) => p.priceCNY);
  return {
    key,
    series,
    realPoints: realCount,
    min: Math.min(...prices),
    max: Math.max(...prices),
    current: currentPriceCNY,
  };
}

// ---- 工具 ----
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function round2(n) { return Math.round(n * 100) / 100; }
