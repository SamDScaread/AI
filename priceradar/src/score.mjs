// 比价雷达 · PriceRadar — 多维度打分引擎 / Scoring engine
//
// 思路：
//   1) 为每个 listing 在每个维度上算一个“原始值”（raw）。
//   2) 把每个维度的原始值在整个候选集合里做 min-max 归一化到 0~100，
//      并按维度方向（越大越好/越小越好）翻转，得到 dimension score。
//   3) 没有信号的维度（数据缺失）给中性分 50，不偏袒也不惩罚。
//   4) 综合分 = Σ(权重 × 维度分) / Σ权重。
//
// 这样不同量纲（元、天、星级、百分比）的指标能公平地放进同一个排名里，
// 而且每个维度分都可解释，前端能画雷达图、列明细。

import { DIMENSIONS, DIMENSION_KEYS, SHOP_TYPES, normalizeWeights } from './model.mjs';

const NEUTRAL = 50;

// 资质认证强度权重（食品/保健/通用）。
const CERT_WEIGHT = {
  'SC': 0.4, '有机': 1.0, '绿色食品': 0.7, 'HACCP': 0.8, 'ISO22000': 0.7,
  'FDA': 0.9, 'USDA Organic': 1.0, 'Non-GMO': 0.6, 'CE': 0.5, 'GMP': 0.7,
  '国食健字': 0.9, 'Halal': 0.4, 'Kosher': 0.4,
};

// 包装材质品质（密封/避光/环保综合）。
const PACKAGING_SCORE = {
  '玻璃': 90, 'glass': 90, '真空': 92, 'vacuum': 92, '马口铁罐': 85, 'tin': 85,
  '铝箔': 82, 'aluminum': 82, '罐装': 80, '纸盒': 62, 'paper': 62,
  '自封袋': 55, '袋装': 50, 'pouch': 50, '塑料瓶': 45, 'plastic': 42, '散装': 25,
};

// 配料表里这些词视为“添加剂/不够干净”，会拉低成分分。
const ADDITIVE_RE = /(香精|色素|防腐剂|甜味剂|增稠|乳化|阿斯巴甜|麦芽糊精|植脂末|氢化|防结|抗氧化剂|additive|preservative|flavor|coloring|sweetener)/i;

/**
 * 对整批 listings 打分（原地写入 .scores 与 .totalScore），并返回排序后的数组。
 * @param {object[]} listings 已归一化的商品
 * @param {object} weightsInput 用户权重
 */
export function scoreListings(listings, weightsInput) {
  const weights = normalizeWeights(weightsInput);
  if (listings.length === 0) return { listings: [], weights };

  // 1) 每个维度的原始值（可能为 NaN 表示无信号）
  const raw = {};
  for (const key of DIMENSION_KEYS) raw[key] = listings.map((l) => rawValue(key, l));

  // 2) 逐维度归一化
  const normed = {};
  for (const dim of DIMENSIONS) {
    normed[dim.key] = minMaxNormalize(raw[dim.key], dim.dir);
  }

  // 3) 加权合成
  const wsum = DIMENSION_KEYS.reduce((s, k) => s + weights[k], 0) || 1;
  listings.forEach((l, i) => {
    const scores = {};
    let total = 0;
    for (const key of DIMENSION_KEYS) {
      scores[key] = Math.round(normed[key][i]);
      total += weights[key] * normed[key][i];
    }
    l.scores = scores;
    l.totalScore = Math.round((total / wsum) * 10) / 10;
  });

  const sorted = [...listings].sort((a, b) => b.totalScore - a.totalScore);
  return { listings: sorted, weights };
}

/** 计算单个 listing 在某维度上的原始值（自然量纲）。 */
export function rawValue(key, l) {
  const a = l.attributes || {};
  switch (key) {
    case 'price':
      // 到手价 = 商品价 + 运费，越低越好
      return l.priceCNY + (l.shipping?.feeCNY || 0);

    case 'value': {
      // 性价比 = 质量信号 / 单位价格，越高越划算
      const quality = qualitySignal(l);
      const unit = l.unitPriceCNY > 0 ? l.unitPriceCNY : (l.priceCNY || NaN);
      return unit > 0 ? quality / unit : NaN;
    }

    case 'quality':
      return qualitySignal(l);

    case 'hygiene': {
      const certs = a.certifications || [];
      if (certs.length === 0) return NaN;
      const s = certs.reduce((acc, c) => acc + (CERT_WEIGHT[c] ?? 0.3), 0);
      return Math.min(s, 3); // 封顶，避免堆认证刷分
    }

    case 'ingredients': {
      if (a.mainContentPct == null && (!a.ingredients || a.ingredients.length === 0)) return NaN;
      const base = a.mainContentPct != null ? a.mainContentPct : 60;
      const additives = (a.ingredients || []).filter((x) => ADDITIVE_RE.test(x)).length;
      const cleanliness = Math.max(0.3, 1 - additives * 0.1);
      return base * cleanliness;
    }

    case 'nutrition':
      // 品类相关，由数据源直接给 0~100 的营养密度分
      return a.nutritionScore != null ? a.nutritionScore : NaN;

    case 'packaging':
      return a.packaging ? (PACKAGING_SCORE[a.packaging] ?? NaN) : NaN;

    case 'shipping': {
      // 综合运费、时效、破损率为“成本”，再取负使其“越大越好”
      const s = l.shipping || {};
      const cost = (s.feeCNY || 0) * 0.6 + (s.days || 3) * 2.5 + (s.damageRate || 0) * 200;
      return -cost;
    }

    case 'reputation': {
      const trust = SHOP_TYPES[l.shopType]?.trust ?? 0.6;
      if (!l.shopRating) return NaN;
      return l.shopRating * trust; // 0~5
    }

    default:
      return NaN;
  }
}

// 质量信号：评分越高、评价/销量越多越可信。用 log 抑制头部刷量。
function qualitySignal(l) {
  if (!l.rating && !l.reviewCount) return NaN;
  const volume = 1 + Math.log10(1 + (l.reviewCount || 0) + (l.salesCount || 0) * 0.5) / 4;
  return (l.rating || 3) * volume;
}

/**
 * min-max 归一化到 0~100。dir='down' 时翻转（小的得高分）。
 * 无信号(NaN)的项给中性分；全相等时全给中性分。
 */
export function minMaxNormalize(values, dir) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return values.map(() => NEUTRAL);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  return values.map((v) => {
    if (!Number.isFinite(v)) return NEUTRAL;
    if (span === 0) return NEUTRAL;
    const t = (v - min) / span; // 0..1，大的接近 1
    return dir === 'down' ? (1 - t) * 100 : t * 100;
  });
}
