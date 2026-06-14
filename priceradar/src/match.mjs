// 比价雷达 · PriceRadar — 同款归并 / Product matching
//
// 核心难点：同一件商品在淘宝、京东、Amazon 上标题写法、品牌大小写、规格单位
// 都不一样；中文标题还常常不带空格（“三只松鼠每日坚果750g”），没法简单按词分。
// 我们把“看起来是同一件商品”的 listing 聚成一个 ProductGroup，这样既能在组内
// 找“哪个平台哪个店最便宜/最优”，也能跨组（不同厂家/品牌）比较“哪个产品更好”。
//
// 匹配策略（从强到弱）：
//   1) 有条形码（GTIN/UPC）→ 直接按条形码归并（最可靠，跨语言也行）
//   2) productKey 完全一致（同源数据已对齐）→ 直接归并
//   3) 品牌一致 + 规格相近 + 标题“签名”相似度高 → 归并
//      签名 = 拉丁词 token + 中文字符二元组(bigram)，先剔除营销词与规格数字。
// 真实环境可叠加图片感知哈希、型号正则进一步提升准确率；跨语言同款建议靠条形码。

const SIM_THRESHOLD = 0.45;

// 营销/噪声词，参与匹配前先从标题里抹掉，避免“正品包邮/旗舰店新款”污染相似度。
const MARKETING_RE = /(正品|包邮|旗舰店|官方旗舰|官方|授权|专卖店|专营店|新款|热卖|促销|特价|券后|秒杀|直营|自营|国行|海外|进口|批发|新品|爆款|限时|抢购|预售|free\s*shipping|premium|brand\s*new|new|hot|sale|best\s*seller|pack\s*of\s*\d+|official|genuine)/gi;
const SPEC_RE = /\d+(\.\d+)?\s*(mg|g|克|kg|千克|公斤|ml|毫升|l|升|片|粒|颗|包|袋|盒|支|瓶|条|个|pcs|count|pack)/gi;
const LATIN_STOP = new Set(['the', 'of', 'for', 'with', 'and', 'set', 'pack', 'pcs']);

/**
 * 把归一化后的 listings 聚成产品组。
 * @returns {Array<{ key:string, brand:string, title:string, listings:object[] }>}
 */
export function groupProducts(listings) {
  const groups = [];

  for (const item of listings) {
    const sig = signature(item.title);
    let best = null;
    let bestSim = 0;
    for (const g of groups) {
      const sim = groupSimilarity(g, item, sig);
      if (sim > bestSim) { bestSim = sim; best = g; }
    }
    if (best && bestSim >= SIM_THRESHOLD) {
      best.listings.push(item);
      for (const t of sig) best._sig.add(t);
      refreshGroupTitle(best);
    } else {
      groups.push({ key: item.productKey, brand: item.brand, title: item.title, _sig: new Set(sig), listings: [item] });
    }
  }

  for (const g of groups) delete g._sig;
  return groups;
}

/** 单个 listing 与某个已存在组的相似度（0~1）。 */
function groupSimilarity(group, item, sig) {
  const gBar = group.listings[0]?.attributes?.barcode;
  const iBar = item.attributes?.barcode;
  if (gBar && iBar) return gBar === iBar ? 1 : 0;

  if (group.key && item.productKey && group.key === item.productKey) return 0.99;

  // 品牌不一致直接判不同款（除非其一缺失）
  const gb = norm(group.brand);
  const ib = norm(item.brand);
  if (gb && ib && gb !== ib) return 0;

  // 规格差异过大则不归并
  const gs = group.listings[0]?.spec;
  const is = item.spec;
  if (gs?.size && is?.size && sameUnitClass(gs.unit, is.unit)) {
    const ratio = gs.size > is.size ? gs.size / is.size : is.size / gs.size;
    if (ratio > 1.35) return 0;
  }

  return jaccard(group._sig, sig);
}

function refreshGroupTitle(group) {
  const titled = group.listings.reduce((a, b) => (b.title.length > a.title.length ? b : a));
  group.title = titled.title;
  group.brand = group.brand || titled.brand;
}

/**
 * 标题签名：拉丁词 token + 中文字符二元组。先去营销词、去规格。
 * 这样“三只松鼠 每日坚果 750g 正品 包邮”和“三只松鼠每日坚果750g 旗舰店”
 * 会得到几乎相同的签名（中文 bigram 对齐），而无空格也不影响。
 */
export function signature(title) {
  const cleaned = String(title || '')
    .toLowerCase()
    .replace(SPEC_RE, ' ')
    .replace(MARKETING_RE, ' ');

  const sig = new Set();

  // 拉丁词
  for (const w of cleaned.match(/[a-z][a-z']{1,}/g) || []) {
    if (!LATIN_STOP.has(w)) sig.add(w);
  }

  // 中文：抽出所有 CJK 字符，连成串后取二元组（对无空格中文友好）
  const cjk = (cleaned.match(/[一-龥]/g) || []).join('');
  for (let i = 0; i < cjk.length - 1; i++) sig.add(cjk.slice(i, i + 2));
  if (cjk.length === 1) sig.add(cjk);

  return sig;
}

export function jaccard(a, b) {
  if (!a || !b || a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '').trim();
}

function sameUnitClass(u1, u2) {
  const cls = (u) => {
    u = String(u || '').toLowerCase();
    if (['mg', 'g', '克', 'kg', '千克', '公斤', 'lb', 'oz'].includes(u)) return 'w';
    if (['ml', '毫升', 'l', '升'].includes(u)) return 'v';
    return 'c';
  };
  return cls(u1) === cls(u2);
}
