// 比价雷达 · PriceRadar — 聚合编排 / Aggregation pipeline
//
// 把整条链路串起来：取数 → 归一化 → 同款归并 → 多维打分 → 组装推荐结果。
// 这是后端 API 的核心入口。

import { normalizeMany } from './normalize.mjs';
import { groupProducts } from './match.mjs';
import { scoreListings } from './score.mjs';
import { gatherRaw } from './sources/index.mjs';
import { inferCategory } from './sources/demo.mjs';
import { DIMENSIONS } from './model.mjs';

/**
 * @param {string} query 搜索词
 * @param {object} opts { weights, limit, live }
 */
export async function compare(query, opts = {}) {
  const started = Date.now();
  const q = String(query || '').trim();
  if (!q) {
    return { query: '', error: '请输入要比价的商品 / empty query', products: [] };
  }

  // 1) 取数 + 2) 归一化
  const { raw, sources } = await gatherRaw(q, opts);
  const listings = normalizeMany(raw);

  // 3) 同款归并
  const groups = groupProducts(listings);

  // 4) 全局多维打分（所有候选放在同一标尺下，便于跨厂家比较）
  const { listings: scoredSorted, weights } = scoreListings(listings, opts.weights);
  const scoreById = new Map(scoredSorted.map((l) => [l.id, l]));

  // 5) 组装每个产品组：组内按综合分排序，挑出该产品的最优 offer
  const products = groups.map((g) => {
    const offers = g.listings
      .map((l) => scoreById.get(l.id) || l)
      .sort((a, b) => b.totalScore - a.totalScore);
    const best = offers[0];
    const prices = offers.map((o) => o.priceCNY + (o.shipping?.feeCNY || 0));
    const unitPrices = offers.map((o) => o.unitPriceCNY).filter((x) => x > 0);
    return {
      key: g.key,
      brand: best.brand || g.brand,
      title: best.title || g.title,
      image: best.image,
      offerCount: offers.length,
      platforms: [...new Set(offers.map((o) => o.platformName))],
      best,
      bestScore: best.totalScore,
      priceRange: { minCNY: round2(Math.min(...prices)), maxCNY: round2(Math.max(...prices)) },
      bestUnitPriceCNY: unitPrices.length ? round2(Math.min(...unitPrices)) : 0,
      baseLabel: best._baseLabel || '',
      offers,
    };
  });

  // 产品按“该产品最优 offer 的综合分”排序
  products.sort((a, b) => b.bestScore - a.bestScore);

  const topListing = scoredSorted[0] || null;

  return {
    query: q,
    category: inferCategory(q),
    weights,
    dimensions: DIMENSIONS,
    meta: {
      sources,
      totalListings: listings.length,
      productCount: products.length,
      elapsedMs: Date.now() - started,
    },
    topPick: topListing ? { productKey: topListing.productKey, listingId: topListing.id, totalScore: topListing.totalScore } : null,
    products,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
