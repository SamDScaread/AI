// 比价雷达 · PriceRadar — Open Food Facts 真实数据源（食品/快消，免 key、合法）
//
// Open Food Facts 是开放的全球食品数据库（ODbL 许可），提供真实的：条形码、品牌、
// 配料表、营养(Nutri-Score/nutriments)、包装、认证标签、产地、图片。它**没有售价**，
// 因此本适配器：
//   - 用 OFF 拉取**真实商品资料**（条形码/品牌/配料/营养/包装/认证）；
//   - 在真实商品之上**模拟多平台售价/店铺**（按条形码确定性生成），并标注
//     priceSource:'simulated'，待接入电商联盟 API（淘宝客/PA-API）后替换为真实价。
// 这样既证明“实时取数 → 解析 → 归一化 → 打分”的真实链路，又把成分/营养/卫生
// 三个维度升级为真实数据。
//
// 默认关闭（避免测试联网与不确定性）。设 PR_OFF=1 启用；失败时 registry 回退演示源。

import { SourceAdapter } from './base.mjs';
import { PLATFORMS } from '../model.mjs';

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const CN_PLATFORMS = ['taobao', 'jd', 'pinduoduo', 'douyin'];
const INTL_PLATFORMS = ['amazon', 'ebay', 'aliexpress', 'walmart'];

export class OpenFoodFactsSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'openfoodfacts', minIntervalMs: 1200, enabled: cfg.enabled ?? (process.env.PR_OFF === '1'), ...cfg });
    this.fetchImpl = cfg.fetchImpl || null; // 测试可注入
    this.pageSize = cfg.pageSize || 12;
  }

  async _getJSON(url) {
    if (this.fetchImpl) {
      const res = await this.fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    return this.fetchJSON(url, { headers: { 'User-Agent': 'PriceRadar/0.1 (contact: you@example.com)' } });
  }

  async search(query, opts = {}) {
    const url = `${SEARCH_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${opts.limit || this.pageSize}`;
    const data = await this._getJSON(url);
    const products = (data.products || []).filter((p) => p.product_name && p.code);
    if (products.length === 0) throw new Error('openfoodfacts 无匹配商品');
    const out = [];
    for (const prod of products.slice(0, opts.limit || this.pageSize)) {
      const canonical = mapOffProduct(prod);
      if (!canonical) continue;
      out.push(...buildOffers(canonical));
    }
    if (out.length === 0) throw new Error('openfoodfacts 商品无法解析');
    return out;
  }
}

// ---- 纯函数：可离线单测 ----

// Nutri-Score 等级 → 0~100 营养密度分
const NUTRISCORE = { a: 92, b: 78, c: 62, d: 45, e: 30 };

// OFF 标签 → 我们的认证体系
function mapCerts(labelsTags = []) {
  const set = new Set();
  for (const t of labelsTags) {
    const s = String(t).toLowerCase();
    if (s.includes('organic') || s.includes('bio')) { set.add('有机'); set.add('USDA Organic'); }
    if (s.includes('fair-trade') || s.includes('fairtrade')) set.add('公平贸易');
    if (s.includes('non-gmo') || s.includes('no-gmo')) set.add('Non-GMO');
    if (s.includes('halal')) set.add('Halal');
    if (s.includes('kosher')) set.add('Kosher');
    if (s.includes('gluten-free') || s.includes('no-gluten')) set.add('无麸质');
  }
  return [...set];
}

function mapPackaging(prod) {
  const s = `${prod.packaging || ''} ${(prod.packaging_tags || []).join(' ')}`.toLowerCase();
  if (/glass|verre|玻璃/.test(s)) return '玻璃';
  if (/can|tin|metal|alumin' '|铝|罐/.test(s)) return '马口铁罐';
  if (/carton|box|paper|纸/.test(s)) return '纸盒';
  if (/bag|pouch|sachet|袋/.test(s)) return '袋装';
  if (/bottle|plastic|塑/.test(s)) return '塑料瓶';
  return '';
}

// "500 g" / "1.5 L" / "6 x 25 g" / "330ml" → { size, unit }
export function parseQuantity(q) {
  if (!q) return { size: 0, unit: '' };
  const s = String(q).toLowerCase().replace(',', '.');
  const mult = s.match(/(\d+)\s*[x×]\s*([\d.]+)\s*(kg|g|mg|l|ml|cl)/);
  if (mult) return normUnit(parseFloat(mult[1]) * parseFloat(mult[2]), mult[3]);
  const m = s.match(/([\d.]+)\s*(kg|g|mg|l|ml|cl)/);
  if (m) return normUnit(parseFloat(m[1]), m[2]);
  return { size: 0, unit: '' };
}
function normUnit(n, u) {
  if (u === 'kg') return { size: n * 1000, unit: 'g' };
  if (u === 'l') return { size: n * 1000, unit: 'ml' };
  if (u === 'cl') return { size: n * 10, unit: 'ml' };
  if (u === 'mg') return { size: n / 1000, unit: 'g' };
  return { size: n, unit: u };
}

/** OFF 商品 → 归一化“规范商品”（真实资料）。无法用时返回 null。 */
export function mapOffProduct(prod) {
  const name = (prod.product_name || '').trim();
  if (!name) return null;
  const brand = (prod.brands || '').split(',')[0].trim();
  const spec = parseQuantity(prod.quantity);
  const grade = (prod.nutriscore_grade || prod.nutrition_grade_fr || '').toLowerCase();
  const nutriments = prod.nutriments || {};
  const nutritionFacts = Number.isFinite(nutriments['proteins_100g']) ? {
    能量: nutriments['energy-kj_100g'] != null ? `${Math.round(nutriments['energy-kj_100g'])} kJ` : (nutriments['energy_100g'] != null ? `${Math.round(nutriments['energy_100g'])} kJ` : '—'),
    蛋白质: fmtG(nutriments['proteins_100g']),
    脂肪: fmtG(nutriments['fat_100g']),
    碳水化合物: fmtG(nutriments['carbohydrates_100g']),
    '其中-糖': fmtG(nutriments['sugars_100g']),
    钠: nutriments['sodium_100g'] != null ? `${Math.round(nutriments['sodium_100g'] * 1000)} mg` : (nutriments['salt_100g'] != null ? `${Math.round(nutriments['salt_100g'] * 400)} mg` : '—'),
  } : null;

  const ingredients = (prod.ingredients_text || '')
    .split(/[,，;；]/).map((x) => x.trim()).filter(Boolean).slice(0, 8);

  return {
    barcode: String(prod.code),
    title: brand ? `${brand} ${name}` : name,
    brand,
    image: prod.image_front_small_url || prod.image_url || '',
    spec,
    attributes: {
      origin: (prod.countries || prod.countries_tags?.[0] || '').replace(/^en:/, ''),
      ingredients,
      mainContentPct: null,
      certifications: mapCerts(prod.labels_tags),
      packaging: mapPackaging(prod),
      craft: '',
      nutritionScore: NUTRISCORE[grade] ?? (nutritionFacts ? 60 : null),
      nutritionFacts,
      nutriscoreGrade: grade || null,
    },
  };
}
function fmtG(v) { return Number.isFinite(v) ? `${Math.round(v * 10) / 10} g` : '—'; }

/**
 * 在真实商品之上模拟多平台售价/店铺（按条形码确定性）。
 * 价格为模拟，标 priceSource:'simulated'，待接入电商联盟 API 后替换。
 */
export function buildOffers(canonical) {
  const rng = mulberry32(hashStr(canonical.barcode));
  const q = canonical.attributes.nutritionScore || 60;
  const baseCNY = 15 + (hashStr(canonical.barcode) % 120) + q * 0.4; // 基础参考价
  const pool = shuffle([...CN_PLATFORMS, ...INTL_PLATFORMS], rng);
  const n = 3 + Math.floor(rng() * 3);
  const offers = [];
  for (const platform of pool.slice(0, n)) {
    const meta = PLATFORMS[platform];
    const priceCNY = round2(baseCNY * (0.82 + rng() * 0.4));
    const amount = meta.region === 'INTL' ? round2(priceCNY / 7.2) : priceCNY;
    const shopType = platform === 'jd' && rng() < 0.5 ? 'selfrun' : (rng() < 0.4 ? 'flagship' : 'thirdparty');
    offers.push({
      platform,
      productKey: `gtin:${canonical.barcode}`,
      brand: canonical.brand,
      title: titleFor(platform, canonical, meta.region),
      image: canonical.image,
      url: `https://world.openfoodfacts.org/product/${canonical.barcode}`,
      price: { amount, currency: meta.currency },
      spec: canonical.spec,
      rating: clamp(round1(3.6 + (q / 100) * 1.2 + (rng() - 0.5) * 0.5), 1, 5),
      reviewCount: Math.floor(30 + rng() * 4000),
      salesCount: Math.floor(rng() * 12000),
      shopName: shopNameFor(platform, canonical.brand),
      shopType,
      shopRating: clamp(round1(4.3 + (rng() - 0.4) * 0.5), 3, 5),
      shipping: { feeCNY: rng() < 0.6 ? 0 : round2(5 + rng() * 30), days: meta.region === 'CN' ? 1 + Math.floor(rng() * 4) : 6 + Math.floor(rng() * 20), damageRate: round3(rng() * 0.04) },
      attributes: { ...canonical.attributes },
      dataSource: 'openfoodfacts',
      priceSource: 'simulated',
    });
  }
  return offers;
}

function titleFor(platform, c, region) {
  const sz = c.spec.size ? ` ${c.spec.size}${c.spec.unit}` : '';
  if (region === 'INTL') return `${c.title}${sz}`.trim();
  return `${c.title}${sz} 正品`.trim();
}
function shopNameFor(platform, brand) {
  const b = brand || '优选';
  return { amazon: `${b} Official Store`, ebay: `${b.toLowerCase()}_store`, walmart: `${b} @Walmart`, aliexpress: `${b} Global` }[platform] || `${b}旗舰店`;
}

// ---- 工具 ----
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }
