// 比价雷达 · PriceRadar — 京东联盟（JD Union）适配器（CN）
//
// 走京东开放平台网关 https://api.jd.com/routerjson，方法 jd.union.open.goods.query。
// 签名算法（已实现）：参数按 key 升序 → 拼接 key+value → 前后加 appSecret → MD5 → 大写。
// 前提：京东联盟通过审核的推广位；凭证经环境变量注入：
//   JD_APP_KEY / JD_SECRET_KEY，可选 JD_SITE_ID（推广位 siteId，用于生成返佣链接）。
// 未配置时 search() 抛错，由 registry 回退演示源。

import { createHash } from 'node:crypto';
import { SourceAdapter } from './base.mjs';

export class JdSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'jd', minIntervalMs: 1100, ...cfg });
    this.appKey = cfg.appKey || process.env.JD_APP_KEY || null;
    this.appSecret = cfg.appSecret || process.env.JD_SECRET_KEY || null;
    this.siteId = cfg.siteId || process.env.JD_SITE_ID || null;
    this.gateway = cfg.gateway || 'https://api.jd.com/routerjson';
    this.fetchImpl = cfg.fetchImpl || null;
  }

  configured() { return !!(this.appKey && this.appSecret); }

  async search(query, opts = {}) {
    if (!this.configured()) throw new Error('jd 未配置 JD_APP_KEY/JD_SECRET_KEY / not configured');
    const goodsReqDTO = { keyword: query, pageSize: opts.limit || 20, pageIndex: 1 };
    if (this.siteId) goodsReqDTO.siteId = Number(this.siteId);
    const params = {
      method: 'jd.union.open.goods.query',
      app_key: this.appKey,
      sign_method: 'md5',
      timestamp: jdTimestamp(),
      format: 'json',
      v: '1.0',
      '360buy_param_json': JSON.stringify({ goodsReqDTO }),
    };
    params.sign = jdSign(params, this.appSecret);

    const url = `${this.gateway}?${new URLSearchParams(params).toString()}`;
    const fetcher = this.fetchImpl ? (u) => this.fetchImpl(u).then((r) => r.json()) : (u) => this.fetchJSON(u);
    const data = await fetcher(url);

    // 解析：响应体里 queryResult 是 JSON 字符串
    const respStr = data?.jd_union_open_goods_query_responce?.queryResult;
    const result = respStr ? JSON.parse(respStr) : null;
    const list = result?.data || [];
    return list.map(mapItem);
  }
}

/** 京东签名：MD5(secret + 升序拼接(key+value) + secret) 大写。 */
export function jdSign(params, secret) {
  const concat = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] != null && params[k] !== '')
    .sort()
    .map((k) => k + params[k])
    .join('');
  return createHash('md5').update(secret + concat + secret, 'utf8').digest('hex').toUpperCase();
}

function jdTimestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 京东联盟商品字段 → 归一化“半成品”。字段以官方文档为准，必要时微调。 */
export function mapItem(it) {
  const price = it.priceInfo?.lowestPrice ?? it.priceInfo?.price ?? 0;
  const good = it.commentInfo?.goodCommentsShare; // 好评率(%)
  return {
    platform: 'jd',
    brand: it.brandName || '',
    title: it.skuName || '',
    url: it.materialUrl || (it.skuId ? `https://item.jd.com/${it.skuId}.html` : ''),
    image: it.imageInfo?.imageList?.[0]?.url || '',
    price: { amount: Number(price), currency: 'CNY' },
    spec: { size: 0, unit: '' },
    rating: good ? Math.round((3 + (good / 100) * 2) * 10) / 10 : 0, // 好评率→近似 5 分制
    reviewCount: it.commentInfo?.commentCount || 0,
    salesCount: it.inOrderCount30Days || it.inOrderCount30DaysSku || 0,
    shopName: it.shopInfo?.shopName || '京东',
    shopType: it.owner === 'g' ? 'selfrun' : 'thirdparty', // g=自营
    shopRating: 0,
    shipping: { feeCNY: 0, days: 0, damageRate: 0 },
    attributes: {},
    dataSource: 'jd',
  };
}
