// 比价雷达 · PriceRadar — 淘宝/天猫 适配器骨架（CN 范例）
//
// ⚠️ 真实抓取需要：登录态/Cookie、反爬对抗（签名、滑块、限频）、住宅代理池。
// 强烈建议优先走「淘宝联盟（淘宝客）开放 API」获取商品与佣金链接，合法稳定。
// 下面给出两条路径的接入位点；默认 search() 抛出未配置错误，由 registry 兜底
// 回退到演示数据源，保证 App 始终可用。

import { SourceAdapter } from './base.mjs';

export class TaobaoSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'taobao', minIntervalMs: 1500, ...cfg });
    // 联盟 API 凭证（推荐路径）：从环境变量注入，不要硬编码。
    this.appKey = cfg.appKey || process.env.TAOBAO_APP_KEY || null;
    this.appSecret = cfg.appSecret || process.env.TAOBAO_APP_SECRET || null;
  }

  async search(query, opts = {}) {
    if (this.appKey && this.appSecret) {
      return this.searchViaAffiliate(query, opts);
    }
    // 未配置任何抓取方式 → 让 registry 回退到演示数据。
    throw new Error('taobao 未配置联盟 API 或抓取凭证 / not configured');
  }

  // 路径 A：淘宝联盟开放平台（taobao.tbk.dg.material.optional 等）。
  async searchViaAffiliate(query, opts) {
    // 伪代码：构造签名 → 调用 TOP 网关 → 解析 result_list → 映射为原始记录。
    // const params = this.signTopRequest({ method: 'taobao.tbk.dg.material.optional', q: query, page_size: opts.limit || 20 });
    // const data = await this.fetchJSON('https://eco.taobao.com/router/rest?' + params);
    // return data.result_list.map(mapItem);
    throw new Error('taobao 联盟 API 接入点：在此实现签名与解析 / implement TOP signing here');
  }

  // 路径 B：H5 搜索页解析（脆弱，仅供研究，注意 robots 与频率）。
  async searchViaHtml(query, opts) {
    // const html = await this.fetchHtml('https://s.taobao.com/search?q=' + encodeURIComponent(query));
    // 解析页面内嵌 JSON（g_page_config）→ 映射为原始记录。
    throw new Error('taobao H5 解析：在此实现页面解析 / implement HTML parsing here');
  }
}

// 把平台原始字段映射为 normalize.mjs 期望的“半成品”记录。
// 真实接入时按平台返回结构填写下列字段。
export function mapItem(/* item */) {
  return {
    platform: 'taobao',
    brand: '', title: '', url: '', image: '',
    price: { amount: 0, currency: 'CNY' },
    spec: { size: 0, unit: '' },
    rating: 0, reviewCount: 0, salesCount: 0,
    shopName: '', shopType: 'thirdparty', shopRating: 0,
    shipping: { feeCNY: 0, days: 0, damageRate: 0 },
    attributes: {},
  };
}
