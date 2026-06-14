// 比价雷达 · PriceRadar — 统一数据模型与常量
// Unified product model & shared constants.
//
// 不同平台、不同店铺抓到的原始商品千差万别，这里定义一套“归一化”后的统一
// 商品模型（NormalizedListing），所有数据源都要把原始数据转换成这个形状，
// 之后的归并、打分、对比才能在同一套字段上进行。

/** 支持的电商平台。region: CN=中国, INTL=国际。 */
export const PLATFORMS = {
  taobao:     { name: '淘宝/天猫', region: 'CN',   currency: 'CNY' },
  jd:         { name: '京东',      region: 'CN',   currency: 'CNY' },
  pinduoduo:  { name: '拼多多',    region: 'CN',   currency: 'CNY' },
  douyin:     { name: '抖音商城',  region: 'CN',   currency: 'CNY' },
  amazon:     { name: 'Amazon',    region: 'INTL', currency: 'USD' },
  ebay:       { name: 'eBay',      region: 'INTL', currency: 'USD' },
  aliexpress: { name: 'AliExpress',region: 'INTL', currency: 'USD' },
  walmart:    { name: 'Walmart',   region: 'INTL', currency: 'USD' },
};

/** 店铺类型，影响“店铺信誉”维度。 */
export const SHOP_TYPES = {
  flagship:   { label: '官方旗舰店', trust: 1.0 },
  authorized: { label: '授权专卖店', trust: 0.85 },
  selfrun:    { label: '平台自营',   trust: 0.95 },
  thirdparty: { label: '第三方店铺', trust: 0.6 },
};

// 打分维度。每个维度都会被归一化到 0~100（相对于当前候选集合），
// 然后按用户可调的权重加权求和，得到综合得分 totalScore。
// 方向 dir: 'up' 表示越大越好，'down' 表示越小越好（如价格、运费）。
export const DIMENSIONS = [
  { key: 'price',       label: '价格',      dir: 'down', desc: '到手价（已折算人民币）越低越好' },
  { key: 'value',       label: '性价比',    dir: 'up',   desc: '单位含量价格 + 质量综合，越高越划算' },
  { key: 'quality',     label: '质量口碑',  dir: 'up',   desc: '评分 × 评价量，反映真实质量' },
  { key: 'hygiene',     label: '卫生资质',  dir: 'up',   desc: '食品 SC/有机、FDA/HACCP 等认证强度' },
  { key: 'ingredients', label: '成分用料',  dir: 'up',   desc: '主料含量、配料表干净程度' },
  { key: 'nutrition',   label: '营养价值',  dir: 'up',   desc: '营养密度/功效成分（适用品类）' },
  { key: 'packaging',   label: '包装品质',  dir: 'up',   desc: '材质、密封、避光、环保等' },
  { key: 'shipping',    label: '物流邮寄',  dir: 'up',   desc: '运费 + 时效 + 破损率综合' },
  { key: 'reputation',  label: '店铺信誉',  dir: 'up',   desc: '店铺评分 + 店铺类型可信度' },
];

export const DIMENSION_KEYS = DIMENSIONS.map((d) => d.key);

/** 默认权重（0~10）。用户可在前端用滑块调整。 */
export const DEFAULT_WEIGHTS = {
  price: 8,
  value: 7,
  quality: 7,
  hygiene: 5,
  ingredients: 5,
  nutrition: 4,
  packaging: 3,
  shipping: 4,
  reputation: 6,
};

/**
 * 创建一个空的归一化商品记录，确保所有数据源产出的字段完整、形状一致。
 * 数据源只需填它能拿到的字段，缺失的留默认值，打分阶段会做缺失处理。
 */
export function makeListing(partial = {}) {
  return {
    id: partial.id || null,
    productKey: partial.productKey || null, // 同款归并键（品牌+规格+核心词）

    platform: partial.platform || null,
    platformName: partial.platformName || null,
    region: partial.region || null,

    shopName: partial.shopName || '',
    shopType: partial.shopType || 'thirdparty',
    shopRating: num(partial.shopRating, 0), // 0~5

    title: partial.title || '',
    brand: partial.brand || '',
    image: partial.image || '',
    url: partial.url || '',

    price: partial.price || { amount: 0, currency: 'CNY' },
    priceCNY: num(partial.priceCNY, 0),

    // 规格：size 数量 + unit 单位（g/ml/片/个...），用于算单位价格
    spec: partial.spec || { size: 0, unit: '' },
    unitPriceCNY: num(partial.unitPriceCNY, 0),

    rating: num(partial.rating, 0),       // 0~5
    reviewCount: num(partial.reviewCount, 0),
    salesCount: num(partial.salesCount, 0),

    shipping: partial.shipping || { feeCNY: 0, days: 0, damageRate: 0 },

    attributes: {
      origin: '',
      ingredients: [],          // 配料/原料表
      mainContentPct: null,      // 主料含量百分比，如蛋白质含量、纯度
      certifications: [],        // 资质认证
      packaging: '',             // 包装材质
      craft: '',                 // 工艺
      nutrition: null,           // 营养信息对象（品类相关）
      ...(partial.attributes || {}),
    },

    // 打分阶段填充
    scores: partial.scores || null,    // { price: 0..100, ... }
    totalScore: num(partial.totalScore, 0),
    _raw: partial._raw || null,        // 保留原始数据，便于调试
  };
}

function num(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

/** 合并用户传入的权重与默认权重，并裁剪到 0~10。 */
export function normalizeWeights(weights) {
  const out = { ...DEFAULT_WEIGHTS };
  if (weights && typeof weights === 'object') {
    for (const k of DIMENSION_KEYS) {
      if (weights[k] != null && Number.isFinite(Number(weights[k]))) {
        out[k] = Math.max(0, Math.min(10, Number(weights[k])));
      }
    }
  }
  return out;
}
