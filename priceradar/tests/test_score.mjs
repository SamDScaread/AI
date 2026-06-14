// 打分引擎测试
import { test, eq, approx, assert, summary } from './_assert.mjs';
import { minMaxNormalize, rawValue, scoreListings } from '../src/score.mjs';
import { normalizeListing } from '../src/normalize.mjs';

console.log('score:');

test('minMax 归一化：越大越好', () => {
  const r = minMaxNormalize([0, 5, 10], 'up');
  approx(r[0], 0); approx(r[1], 50); approx(r[2], 100);
});

test('minMax 归一化：越小越好（价格）', () => {
  const r = minMaxNormalize([10, 20, 30], 'down');
  approx(r[0], 100); approx(r[2], 0);
});

test('全相等给中性分 50', () => {
  const r = minMaxNormalize([7, 7, 7], 'up');
  r.forEach((x) => approx(x, 50));
});

test('缺失值(NaN)给中性分 50', () => {
  const r = minMaxNormalize([0, NaN, 10], 'up');
  approx(r[0], 0); approx(r[1], 50); approx(r[2], 100);
});

test('price 维度含运费', () => {
  const l = normalizeListing({ platform: 'taobao', title: 'x', price: { amount: 40, currency: 'CNY' }, shipping: { feeCNY: 10 } });
  approx(rawValue('price', l), 50);
});

test('reputation：旗舰店比第三方分高', () => {
  const flag = normalizeListing({ platform: 'jd', title: 'x', shopType: 'flagship', shopRating: 5 });
  const third = normalizeListing({ platform: 'jd', title: 'x', shopType: 'thirdparty', shopRating: 5 });
  assert(rawValue('reputation', flag) > rawValue('reputation', third));
});

function mk(over) {
  return normalizeListing({
    platform: 'taobao', title: 'A 坚果 500g', brand: 'A',
    price: { amount: 50, currency: 'CNY' }, spec: { size: 500, unit: 'g' },
    rating: 4.5, reviewCount: 1000, shopType: 'flagship', shopRating: 4.8,
    shipping: { feeCNY: 0, days: 2, damageRate: 0.01 },
    attributes: { certifications: ['SC', '有机'], mainContentPct: 90, packaging: '玻璃', nutritionScore: 88 },
    ...over,
  });
}

test('便宜且优质的商品综合分更高', () => {
  const good = mk({ price: { amount: 40, currency: 'CNY' } });
  const bad = mk({ price: { amount: 90, currency: 'CNY' }, rating: 3.2, reviewCount: 20, attributes: { certifications: [], mainContentPct: 50, packaging: '袋装', nutritionScore: 60 } });
  const { listings } = scoreListings([good, bad], null);
  eq(listings[0].id, good.id);
  assert(listings[0].totalScore > listings[1].totalScore);
});

test('权重可改变排名（极端偏向价格时最便宜者胜出）', () => {
  const cheapLowQ = mk({ price: { amount: 20, currency: 'CNY' }, rating: 3.0, reviewCount: 10, attributes: { certifications: [], mainContentPct: 40, packaging: '袋装', nutritionScore: 50 } });
  const priceyHighQ = mk({ price: { amount: 95, currency: 'CNY' } });
  const onlyPrice = { price: 10, value: 0, quality: 0, hygiene: 0, ingredients: 0, nutrition: 0, packaging: 0, shipping: 0, reputation: 0 };
  const { listings } = scoreListings([priceyHighQ, cheapLowQ], onlyPrice);
  eq(listings[0].id, cheapLowQ.id, '只看价格时最便宜者第一');
});

test('每个商品都产出 9 个维度分', () => {
  const { listings } = scoreListings([mk(), mk({ price: { amount: 70, currency: 'CNY' } })], null);
  eq(Object.keys(listings[0].scores).length, 9);
  for (const v of Object.values(listings[0].scores)) assert(v >= 0 && v <= 100);
});

summary('score');
