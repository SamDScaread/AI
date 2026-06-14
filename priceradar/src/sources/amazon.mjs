// 比价雷达 · PriceRadar — Amazon Creators API 适配器（INTL）
//
// ⚠️ 重要：旧版 Product Advertising API (PA-API v5) 已于 2026-04-30 弃用、05-15 关停，
// 官方替代为 **Amazon Creators API**（OAuth 2.0）。本适配器按 Creators API 实现：
//   1) 用 Client ID/Secret 走 OAuth2 client_credentials 换取 Bearer access_token（带缓存）
//   2) POST {host}/catalog/v1/searchItems 检索商品
// 前提：已通过审核的 Amazon Associates 账号，并在 Associates Central 创建凭证。
// 凭证经环境变量注入：AMAZON_CLIENT_ID / AMAZON_CLIENT_SECRET / AMAZON_PARTNER_TAG。
// 未配置时 search() 抛错，由 registry 回退演示源。

import { SourceAdapter } from './base.mjs';

export class AmazonSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'amazon', minIntervalMs: 1100, ...cfg });
    this.clientId = cfg.clientId || process.env.AMAZON_CLIENT_ID || null;
    this.clientSecret = cfg.clientSecret || process.env.AMAZON_CLIENT_SECRET || null;
    this.partnerTag = cfg.partnerTag || process.env.AMAZON_PARTNER_TAG || null;
    this.marketplace = cfg.marketplace || process.env.AMAZON_MARKETPLACE || 'www.amazon.com';
    // 这两个地址以 Associates Central → Creators API 文档为准，可用环境变量覆盖
    this.tokenUrl = cfg.tokenUrl || process.env.AMAZON_TOKEN_URL || 'https://api.amazon.com/auth/o2/token';
    this.apiHost = cfg.apiHost || process.env.AMAZON_CREATORS_HOST || 'https://creatorsapi.amazon';
    this._token = null; // { value, expiresAt }
    this.fetchImpl = cfg.fetchImpl || null; // 测试可注入
  }

  configured() { return !!(this.clientId && this.clientSecret && this.partnerTag); }

  async search(query, opts = {}) {
    if (!this.configured()) {
      throw new Error('amazon 未配置 AMAZON_CLIENT_ID/SECRET/PARTNER_TAG（Creators API）/ not configured');
    }
    const token = await this.getToken();
    const body = {
      Operation: 'SearchItems',
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Marketplace: this.marketplace,
      Keywords: query,
      ItemCount: Math.min(opts.limit || 10, 10),
      Resources: ['ItemInfo.Title', 'ItemInfo.ByLineInfo', 'Offers.Listings.Price', 'CustomerReviews', 'Images.Primary.Medium'],
    };
    const data = await this._post(`${this.apiHost}/catalog/v1/searchItems`, body, {
      Authorization: `Bearer ${token}`,
    });
    const items = data?.SearchResult?.Items || [];
    return items.map(mapItem.bind(null, this.partnerTag));
  }

  // OAuth2 client_credentials 换 token（缓存到过期前 60s）
  async getToken() {
    if (this._token && this._token.expiresAt > Date.now() + 60000) return this._token.value;
    const form = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'creators::catalog',
    });
    const data = await this._post(this.tokenUrl, form, { 'Content-Type': 'application/x-www-form-urlencoded' }, true);
    if (!data.access_token) throw new Error('amazon 取 token 失败');
    this._token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
    return this._token.value;
  }

  async _post(url, body, headers = {}, isForm = false) {
    const fetcher = this.fetchImpl || ((u, o) => this.fetchWithRetry(u, o).then((r) => r));
    const res = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json', ...headers },
      body: isForm ? body.toString() : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`amazon HTTP ${res.status}`);
    return res.json();
  }
}

// Creators API 返回结构 → 归一化“半成品”。字段名以最新官方文档为准，必要时微调。
export function mapItem(partnerTag, it) {
  const listing = it.Offers?.Listings?.[0];
  const amount = listing?.Price?.Amount ?? 0;
  return {
    platform: 'amazon',
    brand: it.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || '',
    title: it.ItemInfo?.Title?.DisplayValue || '',
    url: it.DetailPageURL || (it.ASIN ? `https://www.amazon.com/dp/${it.ASIN}?tag=${partnerTag}` : ''),
    image: it.Images?.Primary?.Medium?.URL || '',
    price: { amount, currency: listing?.Price?.Currency || 'USD' },
    spec: { size: 0, unit: '' },
    rating: it.CustomerReviews?.StarRating?.Value || 0,
    reviewCount: it.CustomerReviews?.Count || 0,
    salesCount: 0,
    shopName: listing?.MerchantInfo?.Name || 'Amazon',
    shopType: 'thirdparty',
    shopRating: 0,
    shipping: { feeCNY: 0, days: 0, damageRate: 0 },
    attributes: { barcode: it.ItemInfo?.ExternalIds?.EANs?.DisplayValues?.[0] || '' },
    dataSource: 'amazon',
  };
}
