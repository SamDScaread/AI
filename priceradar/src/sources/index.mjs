// 比价雷达 · PriceRadar — 数据源注册表 / Source registry
//
// 统一管理所有数据源，并发取数、容错回退。默认用演示数据源；当你为某些平台
// 配置了真实抓取/联盟 API 凭证后，它们会被自动启用，演示源作为兜底。

import { mapLimit } from './base.mjs';
import { DemoSource } from './demo.mjs';
import { TaobaoSource } from './taobao.mjs';
import { AmazonSource } from './amazon.mjs';

// 真实平台适配器（未配置凭证时 search() 会抛错，被安全跳过）。
const LIVE_ADAPTERS = [
  new TaobaoSource(),
  new AmazonSource(),
  // 在此按需添加：new JdSource(), new PddSource(), new EbaySource() ...
];

const demo = new DemoSource();

/**
 * 聚合所有可用数据源的原始记录。
 * @param {string} query
 * @param {object} opts { limit, live }
 * @returns {Promise<{ raw: object[], sources: object[] }>}
 */
export async function gatherRaw(query, opts = {}) {
  const sources = [];
  let raw = [];

  // 1) 尝试已配置的实时数据源（并发、容错）
  const live = LIVE_ADAPTERS.filter((a) => a.enabled);
  const liveResults = await mapLimit(live, 4, async (adapter) => {
    try {
      const items = await adapter.search(query, opts);
      sources.push({ platform: adapter.platform, ok: true, count: items.length, mode: 'live' });
      return items;
    } catch (err) {
      sources.push({ platform: adapter.platform, ok: false, error: String(err.message || err), mode: 'live' });
      return [];
    }
  });
  for (const items of liveResults) raw = raw.concat(items);

  // 2) 没有任何实时数据 → 回退演示数据，保证产品可用、可演示
  if (raw.length === 0) {
    const items = await demo.search(query, opts);
    sources.push({ platform: 'demo', ok: true, count: items.length, mode: 'demo' });
    raw = items;
  }

  return { raw, sources };
}
