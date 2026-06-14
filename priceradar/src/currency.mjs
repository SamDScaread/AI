// 比价雷达 · PriceRadar — 汇率与单位换算
// 中外平台混在一起比价，必须先把所有价格折算到同一货币（人民币 CNY），
// 并把不同规格（500g vs 1kg）折算成“每基准单位价格”，否则没法公平比较。

// 静态参考汇率（1 外币 = ? CNY）。真实环境应接入实时汇率 API 并缓存，
// 这里用近似值保证离线可跑。setRates() 可在运行时注入实时汇率。
let RATES = {
  CNY: 1,
  USD: 7.2,
  EUR: 7.8,
  JPY: 0.048,
  GBP: 9.1,
  HKD: 0.92,
};

export function setRates(rates) {
  RATES = { ...RATES, ...rates };
}

export function getRate(currency) {
  return RATES[currency] ?? null;
}

/** 把任意货币金额折算成人民币（保留 2 位）。 */
export function toCNY(amount, currency) {
  const rate = RATES[currency];
  if (rate == null) throw new Error(`未知货币 / unknown currency: ${currency}`);
  return round(amount * rate, 2);
}

// 单位归一化：把同类单位折算到一个“基准单位”，这样 500g 和 1.2kg 能直接比。
// 每一类共享一个基准（重量→g，体积→ml，计数→个/片）。
const UNIT_TO_BASE = {
  // 重量 -> g
  mg: 0.001, g: 1, 克: 1, kg: 1000, 千克: 1000, 公斤: 1000, lb: 453.592, oz: 28.3495,
  // 体积 -> ml
  ml: 1, 毫升: 1, l: 1000, 升: 1000, cl: 10,
  // 计数 -> 个
  个: 1, 片: 1, 粒: 1, 颗: 1, 包: 1, 袋: 1, 盒: 1, 支: 1, 瓶: 1, 条: 1,
  count: 1, pcs: 1, pack: 1,
};

const UNIT_BASE_LABEL = {
  weight: 'g', volume: 'ml', count: '件',
};

function unitClass(unit) {
  const u = String(unit || '').toLowerCase();
  if (['mg', 'g', '克', 'kg', '千克', '公斤', 'lb', 'oz'].includes(u)) return 'weight';
  if (['ml', '毫升', 'l', '升', 'cl'].includes(u)) return 'volume';
  if (['个', '片', '粒', '颗', '包', '袋', '盒', '支', '瓶', '条', 'count', 'pcs', 'pack'].includes(u)) return 'count';
  return null;
}

/**
 * 计算“每基准单位价格（CNY）”。
 * @returns {{ unitPriceCNY:number, baseLabel:string }|null} 无法换算时返回 null。
 */
export function unitPrice(priceCNY, spec) {
  if (!spec || !spec.size || !spec.unit) return null;
  const factor = UNIT_TO_BASE[String(spec.unit).toLowerCase()] ?? UNIT_TO_BASE[spec.unit];
  if (!factor) return null;
  const baseQty = spec.size * factor;
  if (baseQty <= 0) return null;
  const cls = unitClass(spec.unit);
  return {
    unitPriceCNY: round(priceCNY / baseQty, 4),
    baseLabel: cls ? UNIT_BASE_LABEL[cls] : spec.unit,
  };
}

function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
