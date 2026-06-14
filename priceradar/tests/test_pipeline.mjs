// 端到端聚合管线测试（演示数据源驱动）
import { testAsync, eq, assert, summary } from './_assert.mjs';
import { compare } from '../src/aggregate.mjs';
import { inferCategory } from '../src/sources/demo.mjs';

console.log('pipeline:');

await testAsync('空查询返回错误', async () => {
  const r = await compare('   ');
  assert(r.error);
  eq(r.products.length, 0);
});

await testAsync('品类识别', async () => {
  eq(inferCategory('每日坚果 750g'), 'food');
  eq(inferCategory('婴儿配方奶粉'), 'baby');
  eq(inferCategory('维生素C 泡腾片'), 'supplement');
  eq(inferCategory('烟酰胺精华液'), 'cosmetics');
  eq(inferCategory('蓝牙耳机'), 'electronics');
  eq(inferCategory('不知道是啥'), 'general');
});

await testAsync('坚果搜索：产出多产品、多平台、含推荐', async () => {
  const r = await compare('每日坚果');
  assert(r.products.length >= 4, '至少 4 个不同厂家产品');
  assert(r.meta.totalListings >= r.products.length, '总 listing 不少于产品数');
  assert(r.topPick, '应有综合推荐');
  // 至少有一个产品横跨多个平台
  const multi = r.products.some((p) => p.platforms.length >= 2);
  assert(multi, '应出现同款跨平台');
});

await testAsync('每个产品都挑出最优 offer 且按综合分降序', async () => {
  const r = await compare('蛋白粉');
  for (const p of r.products) {
    assert(p.best, '每个产品有 best');
    assert(p.offers[0].id === p.best.id, 'offers[0] 即 best');
    for (let i = 1; i < p.offers.length; i++) {
      assert(p.offers[i - 1].totalScore >= p.offers[i].totalScore, '组内按分降序');
    }
  }
  // 产品之间也按 bestScore 降序
  for (let i = 1; i < r.products.length; i++) {
    assert(r.products[i - 1].bestScore >= r.products[i].bestScore);
  }
});

await testAsync('中外平台都被折算成人民币比价', async () => {
  const r = await compare('维生素C');
  const all = r.products.flatMap((p) => p.offers);
  const intl = all.filter((o) => o.region === 'INTL');
  assert(intl.length > 0, '应包含国际平台');
  for (const o of intl) {
    assert(o.priceCNY > 0, '国际商品有 CNY 折算价');
    assert(o.price.currency !== 'CNY' || o.region === 'CN');
  }
});

await testAsync('结果稳定可复现（同词同结果）', async () => {
  const a = await compare('每日坚果');
  const b = await compare('每日坚果');
  eq(a.meta.totalListings, b.meta.totalListings);
  eq(a.products[0].title, b.products[0].title);
});

await testAsync('权重影响排名', async () => {
  const base = await compare('每日坚果');
  const cheap = await compare('每日坚果', { weights: { price: 10, value: 0, quality: 0, hygiene: 0, ingredients: 0, nutrition: 0, packaging: 0, shipping: 0, reputation: 0 } });
  // 极端偏价格时，topPick 应是到手价最低的 listing
  const all = cheap.products.flatMap((p) => p.offers);
  const cheapest = all.reduce((a, b) => ((a.priceCNY + (a.shipping?.feeCNY || 0)) <= (b.priceCNY + (b.shipping?.feeCNY || 0)) ? a : b));
  eq(cheap.topPick.listingId, cheapest.id, '偏价格时推荐最便宜到手价');
  assert(base.topPick, '默认权重也有推荐');
});

summary('pipeline');
