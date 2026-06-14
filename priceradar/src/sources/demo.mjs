// 比价雷达 · PriceRadar — 离线演示数据源 / Demo data source
//
// 在没有接入真实爬虫时，本数据源按关键词“即时合成”一批结构真实、跨平台、
// 跨厂家的商品，让聚合→归并→打分→推荐的全链路立刻可跑、可演示、可测试。
// 数据用“按 query 播种的伪随机”生成，所以同一个搜索词结果稳定可复现。
//
// 它故意做到：同一件商品在不同平台标题写法不同、品牌大小写不同、规格单位
// 不同、价格/运费/认证各异 —— 用来真实检验归并与打分逻辑。

import { SourceAdapter } from './base.mjs';
import { PLATFORMS } from '../model.mjs';

const CN_PLATFORMS = ['taobao', 'jd', 'pinduoduo', 'douyin'];
const INTL_PLATFORMS = ['amazon', 'ebay', 'aliexpress', 'walmart'];

// 各品类的“元数据模板”。pricePerBase 单位：CNY / 基准单位(g|ml|件)。
const CATEGORIES = {
  food: {
    keywords: ['坚果', '零食', '巧克力', '咖啡', '茶', '油', '面', '米', '蜂蜜', '牛奶', '酸奶', 'coffee', 'snack', 'nut', 'tea', 'honey', 'oil'],
    brands: ['三只松鼠', '良品铺子', '百草味', 'Wonderful', 'KIND', '沃隆'],
    unit: 'g', sizes: [100, 250, 500, 750, 1000],
    pricePerBase: [0.04, 0.16],
    packaging: ['自封袋', '袋装', '马口铁罐', '玻璃', '纸盒', '真空'],
    certsCN: ['SC', '有机', '绿色食品', 'HACCP'], certsINTL: ['FDA', 'USDA Organic', 'Non-GMO', 'Halal'],
    good: ['原味果仁', '海盐', '初榨'], filler: ['食用香精', '焦糖色素', '麦芽糊精'],
    contentRange: [55, 95], nutritionRange: [60, 92], hasNutrition: true,
  },
  baby: {
    keywords: ['奶粉', '婴儿', '宝宝', '纸尿裤', '辅食', 'baby', 'infant', 'diaper', 'formula'],
    brands: ['爱他美', '飞鹤', 'a2', '美赞臣', 'Aptamil', '惠氏'],
    unit: 'g', sizes: [400, 800, 900, 1200],
    pricePerBase: [0.25, 0.7],
    packaging: ['马口铁罐', '罐装', '铝箔', '真空'],
    certsCN: ['SC', '国食健字', '有机'], certsINTL: ['FDA', 'USDA Organic', 'Non-GMO'],
    good: ['乳铁蛋白', 'OPO 结构脂', 'DHA'], filler: ['麦芽糊精', '香精', '蔗糖'],
    contentRange: [70, 98], nutritionRange: [70, 96], hasNutrition: true,
  },
  supplement: {
    keywords: ['维生素', '钙', '蛋白粉', '鱼油', '益生菌', '保健', 'protein', 'vitamin', 'omega', 'collagen', '胶原'],
    brands: ['Swisse', 'GNC', '汤臣倍健', 'Move Free', 'Doppelherz', 'NOW'],
    unit: '片', sizes: [30, 60, 90, 120, 180],
    pricePerBase: [0.8, 3.5],
    packaging: ['玻璃', '塑料瓶', '马口铁罐', '铝箔'],
    certsCN: ['SC', '国食健字', 'GMP'], certsINTL: ['FDA', 'GMP', 'Non-GMO', 'USDA Organic'],
    good: ['高纯度', '螯合', '缓释'], filler: ['硬脂酸镁', '二氧化硅', '人工色素'],
    contentRange: [60, 99], nutritionRange: [65, 95], hasNutrition: true,
  },
  cosmetics: {
    keywords: ['面霜', '精华', '护肤', '洗面奶', '口红', '面膜', '防晒', 'cream', 'serum', 'skincare', 'lipstick', 'mask'],
    brands: ['雅诗兰黛', '欧莱雅', 'The Ordinary', '珀莱雅', 'CeraVe', 'Olay'],
    unit: 'ml', sizes: [30, 50, 75, 100, 150],
    pricePerBase: [1.5, 12],
    packaging: ['玻璃', '塑料瓶', '真空', '纸盒'],
    certsCN: ['CE'], certsINTL: ['FDA', 'CE', 'Non-GMO'],
    good: ['烟酰胺', '透明质酸', '神经酰胺'], filler: ['酒精', '香精', '色素'],
    contentRange: [50, 90], nutritionRange: [0, 0], hasNutrition: false,
  },
  electronics: {
    keywords: ['耳机', '充电', '数据线', '手机', '键盘', '鼠标', '音箱', 'headphone', 'charger', 'cable', 'keyboard', 'mouse', 'earbuds'],
    brands: ['小米', 'Anker', '绿联', 'Baseus', 'JBL', 'Sony'],
    unit: '个', sizes: [1, 1, 1, 2],
    pricePerBase: [29, 899],
    packaging: ['纸盒', '塑料瓶', '真空'],
    certsCN: ['CE', '3C'], certsINTL: ['CE', 'FCC'],
    good: ['快充协议', '降噪', '蓝牙5.3'], filler: [],
    contentRange: [0, 0], nutritionRange: [0, 0], hasNutrition: false,
  },
  home: {
    keywords: ['洗衣液', '纸巾', '洗洁精', '牙膏', '垃圾袋', '抽纸', 'detergent', 'tissue', 'toothpaste'],
    brands: ['蓝月亮', '维达', '清风', 'Tide', '心相印', '立白'],
    unit: 'ml', sizes: [500, 1000, 2000, 3000],
    pricePerBase: [0.008, 0.04],
    packaging: ['塑料瓶', '袋装', '纸盒'],
    certsCN: ['SC', 'CE'], certsINTL: ['FDA', 'CE'],
    good: ['浓缩配方', '低敏', '植物来源'], filler: ['荧光增白剂', '香精', '色素'],
    contentRange: [0, 0], nutritionRange: [0, 0], hasNutrition: false,
  },
};

const GENERIC = {
  brands: ['品牌A', '品牌B', 'Acme', 'Globex', 'Umbrella', 'Initech'],
  unit: '件', sizes: [1, 1, 2],
  pricePerBase: [19, 499],
  packaging: ['纸盒', '袋装', '塑料瓶'],
  certsCN: ['CE'], certsINTL: ['CE'],
  good: ['优选'], filler: [],
  contentRange: [0, 0], nutritionRange: [0, 0], hasNutrition: false,
};

export function inferCategory(query) {
  const q = String(query || '').toLowerCase();
  for (const [name, cfg] of Object.entries(CATEGORIES)) {
    if (cfg.keywords.some((k) => q.includes(k.toLowerCase()))) return name;
  }
  return 'general';
}

export class DemoSource extends SourceAdapter {
  constructor(cfg = {}) {
    super({ platform: 'demo', minIntervalMs: 0, ...cfg });
  }

  async search(query, opts = {}) {
    const cat = inferCategory(query);
    const cfg = CATEGORIES[cat] || GENERIC;
    const rng = mulberry32(hashStr(query));
    const noun = String(query).trim() || '商品';

    const nProducts = 4 + Math.floor(rng() * 3); // 4~6 个不同厂家/型号
    const out = [];

    for (let p = 0; p < nProducts; p++) {
      const brand = cfg.brands[Math.floor(rng() * cfg.brands.length)] + (rng() < 0.3 ? ' Pro' : '');
      const size = cfg.sizes[Math.floor(rng() * cfg.sizes.length)];
      const tier = rng();                       // 0=平价 1=高端
      const pricePerBase = lerp(cfg.pricePerBase[0], cfg.pricePerBase[1], tier);
      const trueQuality = 0.45 + tier * 0.5;    // 高端→质量更好
      const productKey = `${brand}|${noun}|${size}${cfg.unit}`;

      // 该商品在哪些平台有售（3~6 个平台，中外混合）
      const pool = shuffle([...CN_PLATFORMS, ...INTL_PLATFORMS], rng);
      const nPlatforms = 3 + Math.floor(rng() * 4);
      const platforms = pool.slice(0, nPlatforms);

      for (const platform of platforms) {
        out.push(makeRaw({ platform, brand, noun, size, cfg, pricePerBase, trueQuality, productKey, rng, cat }));
      }
    }
    return out;
  }
}

function makeRaw({ platform, brand, noun, size, cfg, pricePerBase, trueQuality, productKey, rng, cat }) {
  const meta = PLATFORMS[platform];
  const region = meta.region;

  // 价格在“真实价值”基础上做平台/店铺浮动（±18%）
  const priceCNY = round2(pricePerBase * size * (0.82 + rng() * 0.36));
  const amount = region === 'INTL' ? round2(priceCNY / 7.2) : priceCNY;
  const currency = meta.currency;

  // 评分/评价：质量越高评分越高，再加噪声
  const rating = clamp(round1(2.8 + trueQuality * 2.0 + (rng() - 0.5) * 0.5), 1, 5);
  const reviewCount = Math.floor(50 + rng() * 8000 * (0.4 + trueQuality));
  const salesCount = Math.floor(reviewCount * (2 + rng() * 6));

  // 店铺
  const shopType = pickShopType(platform, rng);
  const shopRating = clamp(round1(4.2 + trueQuality * 0.7 + (rng() - 0.5) * 0.4), 3, 5);
  const shopName = makeShopName(platform, brand, shopType);

  // 物流
  const freeShip = rng() < (region === 'CN' ? 0.7 : 0.4);
  const shipping = {
    feeCNY: freeShip ? 0 : round2((region === 'CN' ? 6 : 35) + rng() * (region === 'CN' ? 10 : 60)),
    days: region === 'CN' ? 1 + Math.floor(rng() * 4) : 5 + Math.floor(rng() * 25),
    damageRate: round3(rng() * 0.05),
  };

  // 属性（品类相关）
  const certPool = region === 'CN' ? cfg.certsCN : cfg.certsINTL;
  const nCerts = Math.floor(trueQuality * (certPool.length + 0.5));
  const certifications = shuffle([...certPool], rng).slice(0, Math.max(0, nCerts));

  const ingredients = [];
  if (cfg.good.length) ingredients.push(...shuffle([...cfg.good], rng).slice(0, 1 + Math.floor(rng() * cfg.good.length)));
  // 平价货更可能含填充/添加剂
  if (cfg.filler.length && rng() > trueQuality) ingredients.push(...shuffle([...cfg.filler], rng).slice(0, 1 + Math.floor(rng() * 2)));

  const attributes = {
    origin: region === 'CN' ? pick(['中国', '中国·上海', '中国·广东'], rng) : pick(['美国', '德国', '澳洲', '日本'], rng),
    ingredients,
    mainContentPct: cfg.contentRange[1] ? Math.round(lerp(cfg.contentRange[0], cfg.contentRange[1], trueQuality)) : null,
    certifications,
    packaging: pick(cfg.packaging, rng),
    craft: pick(['冷压', '低温烘焙', '古法', '标准工艺', '冻干'], rng),
    nutritionScore: cfg.hasNutrition ? Math.round(lerp(cfg.nutritionRange[0], cfg.nutritionRange[1], trueQuality)) : null,
    // 条形码（同款各平台共享，强化跨平台/跨语言归并）；按 productKey 确定性生成
    barcode: eanFromKey(productKey),
    // 营养成分表（每 100g/ml），同款各平台一致，由 trueQuality 确定性推导
    nutritionFacts: cfg.hasNutrition ? makeNutritionFacts(cat, trueQuality) : null,
  };

  return {
    platform,
    productKey,
    brand,
    title: makeTitle({ platform, brand, noun, size, cfg, region, rng }),
    image: '',
    url: `https://example.${platform}.com/item/${hashStr(productKey + platform).toString(36)}`,
    price: { amount, currency },
    spec: { size, unit: cfg.unit },
    rating, reviewCount, salesCount,
    shopName, shopType, shopRating,
    shipping,
    attributes,
  };
}

// 不同平台用不同标题写法 —— 检验归并器
function makeTitle({ platform, brand, noun, size, cfg, region, rng }) {
  const sz = `${size}${cfg.unit}`;
  if (region === 'INTL') {
    const tags = pick([['Premium'], ['Pack of', '2'], ['New'], ['Best Seller'], []], rng);
    return [brand, noun, sz, ...tags].join(' ').replace(/\s+/g, ' ').trim();
  }
  const cnTags = pick(['正品 包邮', '旗舰店 新款', '官方授权', '券后特价', ''], rng);
  return `${brand} ${noun} ${sz} ${cnTags}`.replace(/\s+/g, ' ').trim();
}

function pickShopType(platform, rng) {
  if (platform === 'jd' && rng() < 0.6) return 'selfrun';
  const r = rng();
  if (r < 0.35) return 'flagship';
  if (r < 0.6) return 'authorized';
  return 'thirdparty';
}

function makeShopName(platform, brand, shopType) {
  const base = brand.replace(/ Pro$/, '');
  const suffix = { flagship: '官方旗舰店', authorized: '授权专卖店', selfrun: '自营', thirdparty: '优选店' }[shopType] || '店';
  if (platform === 'amazon') return `${base} Official Store`;
  if (platform === 'ebay') return `${base.toLowerCase()}_deals`;
  if (platform === 'walmart') return `${base} on Walmart`;
  if (platform === 'aliexpress') return `${base} Global Store`;
  return `${base}${suffix}`;
}

// 由 productKey 生成 13 位 EAN-13 风格条形码（中国码段 69 开头），确定性、可复现。
function eanFromKey(key) {
  const h = (hashStr(key) >>> 0).toString().padStart(11, '0').slice(0, 11);
  return '69' + h;
}

// 营养成分表（每 100g/ml）。trueQuality 越高 → 蛋白更高、添加糖/钠更低。
function makeNutritionFacts(cat, q) {
  if (cat === 'supplement') {
    return { 活性成分含量: `${Math.round(lerp(60, 99, q))}%`, 每份单位: '1 片/粒', 添加剂: q > 0.6 ? '无' : '少量赋形剂' };
  }
  const base = {
    food: { energyKJ: [1600, 2600], proteinG: [6, 26], fatG: [8, 45], carbG: [10, 55], sugarG: [2, 30], sodiumMg: [5, 600] },
    baby: { energyKJ: [1900, 2200], proteinG: [10, 16], fatG: [22, 28], carbG: [50, 58], sugarG: [0, 12], sodiumMg: [100, 220] },
  }[cat] || { energyKJ: [1500, 2400], proteinG: [4, 20], fatG: [5, 30], carbG: [10, 50], sugarG: [2, 25], sodiumMg: [10, 500] };
  // 蛋白越高越好(q↑)，糖/钠越低越好(q↑→取低端)
  return {
    能量: `${Math.round(lerp(base.energyKJ[0], base.energyKJ[1], 0.5))} kJ`,
    蛋白质: `${round1(lerp(base.proteinG[0], base.proteinG[1], q))} g`,
    脂肪: `${round1(lerp(base.fatG[1], base.fatG[0], q))} g`,
    碳水化合物: `${round1(lerp(base.carbG[0], base.carbG[1], 0.5))} g`,
    '其中-糖': `${round1(lerp(base.sugarG[1], base.sugarG[0], q))} g`,
    钠: `${Math.round(lerp(base.sodiumMg[1], base.sodiumMg[0], q))} mg`,
  };
}

// ---- 工具 ----
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }
