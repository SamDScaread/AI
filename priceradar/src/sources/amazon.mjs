// 比价雷达 · PriceRadar — Amazon 适配器骨架（INTL 范例）
//
// 推荐路径：Amazon Product Advertising API (PA-API 5.0)，需 Associate 账号 +
// AccessKey/SecretKey，合法获取价格、评分、图片与带佣金的购买链接。
// 默认 search() 在未配置时抛错，由 registry 回退到演示数据。

import { SourceAdapter } from './base.mjs';

export class AmazonSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'amazon', minIntervalMs: 1100, ...cfg });
    this.accessKey = cfg.accessKey || process.env.AMAZON_ACCESS_KEY || null;
    this.secretKey = cfg.secretKey || process.env.AMAZON_SECRET_KEY || null;
    this.partnerTag = cfg.partnerTag || process.env.AMAZON_PARTNER_TAG || null;
    this.host = cfg.host || 'webservices.amazon.com';
    this.region = cfg.region || 'us-east-1';
  }

  async search(query, opts = {}) {
    if (this.accessKey && this.secretKey && this.partnerTag) {
      return this.searchViaPAAPI(query, opts);
    }
    throw new Error('amazon 未配置 PA-API 凭证 / not configured');
  }

  // PA-API 5.0 SearchItems：构造 AWS V4 签名 → POST → 解析 SearchResult.Items。
  async searchViaPAAPI(query, opts) {
    // const payload = { Keywords: query, SearchIndex: 'All', ItemCount: opts.limit || 10,
    //   Resources: ['ItemInfo.Title','Offers.Listings.Price','CustomerReviews.Count','Images.Primary.Medium'],
    //   PartnerTag: this.partnerTag, PartnerType: 'Associates', Marketplace: 'www.amazon.com' };
    // const signed = this.signV4('SearchItems', payload);
    // const data = await this.fetchJSON(`https://${this.host}/paapi5/searchitems`, { method:'POST', headers: signed.headers, body: signed.body });
    // return data.SearchResult.Items.map(mapItem);
    throw new Error('amazon PA-API 接入点：在此实现 V4 签名与解析 / implement SigV4 + parsing here');
  }
}

export function mapItem(/* item */) {
  return {
    platform: 'amazon',
    brand: '', title: '', url: '', image: '',
    price: { amount: 0, currency: 'USD' },
    spec: { size: 0, unit: '' },
    rating: 0, reviewCount: 0, salesCount: 0,
    shopName: '', shopType: 'thirdparty', shopRating: 0,
    shipping: { feeCNY: 0, days: 0, damageRate: 0 },
    attributes: {},
  };
}
