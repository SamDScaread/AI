// 比价雷达 · PriceRadar — 拼多多·多多进宝（PDD DDK）适配器（CN）
//
// 走拼多多开放平台网关 https://gw-api.pinduoduo.com/api/router，type=pdd.ddk.goods.search。
// 签名算法（已实现）：参数按 key 升序 → 拼接 key+value → 前后加 client_secret → MD5 → 大写。
// 前提：多多进宝实名认证 + 多多客联盟审核通过；凭证经环境变量注入：
//   PDD_CLIENT_ID / PDD_CLIENT_SECRET，可选 PDD_PID（推广位，用于返佣与转链）。
// 注意：拼多多价格单位是「分」，需 /100 转元。未配置时 search() 抛错，registry 回退演示源。

import { createHash } from 'node:crypto';
import { SourceAdapter } from './base.mjs';

export class PddSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'pinduoduo', minIntervalMs: 1100, ...cfg });
    this.clientId = cfg.clientId || process.env.PDD_CLIENT_ID || null;
    this.clientSecret = cfg.clientSecret || process.env.PDD_CLIENT_SECRET || null;
    this.pid = cfg.pid || process.env.PDD_PID || null;
    this.gateway = cfg.gateway || 'https://gw-api.pinduoduo.com/api/router';
    this.fetchImpl = cfg.fetchImpl || null;
  }

  configured() { return !!(this.clientId && this.clientSecret); }

  async search(query, opts = {}) {
    if (!this.configured()) throw new Error('pinduoduo 未配置 PDD_CLIENT_ID/PDD_CLIENT_SECRET / not configured');
    const params = {
      type: 'pdd.ddk.goods.search',
      client_id: this.clientId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      data_type: 'JSON',
      keyword: query,
      page: '1',
      page_size: String(opts.limit || 20),
    };
    if (this.pid) params.pid = this.pid;
    params.sign = pddSign(params, this.clientSecret);

    const fetcher = this.fetchImpl
      ? (u, o) => this.fetchImpl(u, o).then((r) => r.json())
      : (u, o) => this.fetchWithRetry(u, o).then((r) => r.json());
    const data = await fetcher(this.gateway, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const list = data?.goods_search_response?.goods_list || [];
    return list.map(mapItem);
  }
}

/** 拼多多签名：MD5(secret + 升序拼接(key+value) + secret) 大写。 */
export function pddSign(params, secret) {
  const concat = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] != null && params[k] !== '')
    .sort()
    .map((k) => k + params[k])
    .join('');
  return createHash('md5').update(secret + concat + secret, 'utf8').digest('hex').toUpperCase();
}

/** 多多进宝商品字段 → 归一化“半成品”。价格单位「分」→ 元。 */
export function mapItem(it) {
  const fen = it.min_group_price ?? it.min_normal_price ?? 0; // 单位：分
  return {
    platform: 'pinduoduo',
    brand: '',
    title: it.goods_name || '',
    url: it.goods_sign ? `https://mobile.yangkeduo.com/goods.html?goods_sign=${it.goods_sign}` : '',
    image: it.goods_image_url || it.goods_thumbnail_url || '',
    price: { amount: Math.round((Number(fen) / 100) * 100) / 100, currency: 'CNY' },
    spec: { size: 0, unit: '' },
    rating: it.merchant_type ? 0 : 0,
    reviewCount: it.goods_eval_count || 0,
    salesCount: it.sales_tip ? 0 : (it.sold_quantity || 0),
    shopName: it.mall_name || '拼多多商家',
    shopType: it.merchant_type === 1 ? 'flagship' : 'thirdparty',
    shopRating: it.mall_cps ? 0 : 0,
    shipping: { feeCNY: 0, days: 0, damageRate: 0 },
    attributes: {},
    dataSource: 'pinduoduo',
  };
}
