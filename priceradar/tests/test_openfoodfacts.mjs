// Open Food Facts 真实数据源测试（用 fixture 离线驱动，不联网，确定性）
import { testAsync, test, eq, assert, summary } from './_assert.mjs';
import { mapOffProduct, buildOffers, parseQuantity, OpenFoodFactsSource } from '../src/sources/openfoodfacts.mjs';
import { PLATFORMS } from '../src/model.mjs';
import { normalizeMany } from '../src/normalize.mjs';
import { groupProducts } from '../src/match.mjs';

console.log('openfoodfacts:');

// 仿真 OFF 搜索响应（结构与真实接口一致）
const FIXTURE = {
  count: 2, page: 1,
  products: [
    {
      code: '3017620422003', product_name: 'Nutella', brands: 'Ferrero, Nutella',
      quantity: '400 g', ingredients_text: '糖, 棕榈油, 榛子, 可可, 脱脂奶粉',
      nutriscore_grade: 'e', nutriments: { 'energy-kj_100g': 2252, 'proteins_100g': 6.3, 'fat_100g': 30.9, 'carbohydrates_100g': 57.5, 'sugars_100g': 56.3, 'salt_100g': 0.107 },
      labels_tags: ['en:palm-oil'], packaging: 'glass jar', countries: 'France',
      image_front_small_url: 'https://img/nutella.jpg',
    },
    {
      code: '6901234567890', product_name: '有机燕麦', brands: '某品牌',
      quantity: '1.5 kg', ingredients_text: '有机燕麦',
      nutriscore_grade: 'a', nutriments: { 'energy-kj_100g': 1500, 'proteins_100g': 13, 'fat_100g': 7, 'carbohydrates_100g': 60, 'sugars_100g': 1, 'sodium_100g': 0.005 },
      labels_tags: ['en:organic', 'en:non-gmo'], packaging_tags: ['en:bag'], countries: 'China',
    },
  ],
};

test('parseQuantity 解析多种写法', () => {
  eq(JSON.stringify(parseQuantity('400 g')), JSON.stringify({ size: 400, unit: 'g' }));
  eq(JSON.stringify(parseQuantity('1.5 kg')), JSON.stringify({ size: 1500, unit: 'g' }));
  eq(JSON.stringify(parseQuantity('330ml')), JSON.stringify({ size: 330, unit: 'ml' }));
  eq(JSON.stringify(parseQuantity('6 x 25 g')), JSON.stringify({ size: 150, unit: 'g' }));
});

test('mapOffProduct：真实条形码/品牌/配料/营养/认证', () => {
  const c = mapOffProduct(FIXTURE.products[1]);
  eq(c.barcode, '6901234567890');
  eq(c.brand, '某品牌');
  eq(c.spec.size, 1500); eq(c.spec.unit, 'g');
  assert(c.attributes.ingredients.includes('有机燕麦'));
  eq(c.attributes.nutritionScore, 92, 'nutriscore a → 92');
  assert(c.attributes.certifications.includes('有机'));
  assert(c.attributes.certifications.includes('Non-GMO'));
  eq(c.attributes.packaging, '袋装');
  assert(c.attributes.nutritionFacts['蛋白质'].includes('13'));
});

test('Nutri-Score e → 低营养分；玻璃包装识别', () => {
  const c = mapOffProduct(FIXTURE.products[0]);
  eq(c.attributes.nutritionScore, 30);
  eq(c.attributes.packaging, '玻璃');
});

test('buildOffers：真实商品 + 模拟多平台价，共享条形码', () => {
  const c = mapOffProduct(FIXTURE.products[0]);
  const offers = buildOffers(c);
  assert(offers.length >= 3);
  for (const o of offers) {
    assert(PLATFORMS[o.platform], '平台合法');
    eq(o.productKey, 'gtin:3017620422003');
    eq(o.priceSource, 'simulated');
    eq(o.dataSource, 'openfoodfacts');
    assert(o.price.amount > 0);
  }
});

await testAsync('adapter.search 注入 fetch → 返回可归并的 listings', async () => {
  const src = new OpenFoodFactsSource({ enabled: true, fetchImpl: async () => ({ ok: true, json: async () => FIXTURE }) });
  const raw = await src.search('巧克力酱');
  assert(raw.length >= 6, '两个商品各 3+ offer');
  const groups = groupProducts(normalizeMany(raw));
  eq(groups.length, 2, '按条形码归并为 2 款');
});

await testAsync('adapter.search 网络失败 → 抛错（交由 registry 回退）', async () => {
  const src = new OpenFoodFactsSource({ enabled: true, fetchImpl: async () => { throw new Error('offline'); } });
  let threw = false;
  try { await src.search('x'); } catch { threw = true; }
  eq(threw, true);
});

await testAsync('空结果 → 抛错', async () => {
  const src = new OpenFoodFactsSource({ enabled: true, fetchImpl: async () => ({ ok: true, json: async () => ({ products: [] }) }) });
  let threw = false;
  try { await src.search('zzz'); } catch { threw = true; }
  eq(threw, true);
});

summary('openfoodfacts');
