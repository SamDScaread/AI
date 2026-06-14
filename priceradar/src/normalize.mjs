// 比价雷达 · PriceRadar — 归一化
// 把数据源产出的“半成品”记录补全成标准 NormalizedListing：
// 折算人民币价、算单位价、生成同款归并键、清洗字段。

import { makeListing, PLATFORMS } from './model.mjs';
import { toCNY, unitPrice } from './currency.mjs';

let _seq = 0;

/**
 * @param {object} raw 数据源给出的部分字段（至少含 platform, title, price）
 * @returns {object} 完整的 NormalizedListing
 */
export function normalizeListing(raw) {
  const platform = raw.platform;
  const meta = PLATFORMS[platform] || {};
  const currency = raw.price?.currency || meta.currency || 'CNY';
  const amount = Number(raw.price?.amount ?? raw.priceAmount ?? 0);

  let priceCNY = 0;
  try {
    priceCNY = toCNY(amount, currency);
  } catch {
    priceCNY = amount; // 未知币种时退化为原值，避免整条数据丢失
  }

  const listing = makeListing({
    ...raw,
    id: raw.id || `${platform}-${++_seq}-${Math.random().toString(36).slice(2, 7)}`,
    platformName: raw.platformName || meta.name || platform,
    region: raw.region || meta.region || 'CN',
    price: { amount, currency },
    priceCNY,
  });

  const up = unitPrice(priceCNY, listing.spec);
  listing.unitPriceCNY = up ? up.unitPriceCNY : 0;
  listing._baseLabel = up ? up.baseLabel : '';

  if (!listing.productKey) listing.productKey = deriveProductKey(listing);
  return listing;
}

export function normalizeMany(rawList) {
  return rawList.map(normalizeListing);
}

// 同款归并键：品牌 + 规格 + 标题里的关键词。用于把不同平台/店铺卖的
// 同一件商品聚到一起。真实环境若有条形码（GTIN/UPC）应优先用条形码。
export function deriveProductKey(listing) {
  if (listing.attributes?.barcode) return `gtin:${listing.attributes.barcode}`;
  const brand = simplify(listing.brand);
  const specSig = listing.spec?.size ? `${listing.spec.size}${listing.spec.unit}` : '';
  const core = titleCoreTokens(listing.title).slice(0, 3).join('-');
  return [brand, core, specSig].filter(Boolean).join('|') || simplify(listing.title);
}

const STOP = new Set([
  '正品', '包邮', '旗舰店', '官方', '新款', '热卖', '促销', '特价', '装', '克', '毫升',
  'new', 'hot', 'sale', 'official', 'genuine', 'free', 'shipping', 'pack', 'the', 'of',
]);

/** 取标题里的“核心词”（去品牌、去营销词、去规格数字）。 */
export function titleCoreTokens(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[，。、,./\\|()\[\]【】（）]/g, ' ')
    .replace(/\d+\s*(mg|g|克|kg|千克|公斤|ml|毫升|l|升|片|粒|颗|包|袋|盒|支|瓶|条|个)/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && t.length >= 2 && !STOP.has(t));
}

function simplify(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '').trim();
}
