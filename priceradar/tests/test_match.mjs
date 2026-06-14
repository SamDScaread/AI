// 同款归并测试
import { test, eq, assert, summary } from './_assert.mjs';
import { groupProducts, jaccard } from '../src/match.mjs';
import { normalizeMany } from '../src/normalize.mjs';

console.log('match:');

test('jaccard 相似度', () => {
  eq(jaccard(new Set(['a', 'b', 'c']), new Set(['a', 'b'])), 2 / 3);
  eq(jaccard(new Set(['a']), new Set(['b'])), 0);
});

test('中文同款不同写法（带空格/无空格/营销词）→ 归并到一组', () => {
  const listings = normalizeMany([
    { platform: 'taobao', brand: '三只松鼠', title: '三只松鼠 每日坚果 750g 正品 包邮', price: { amount: 99, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
    { platform: 'jd', brand: '三只松鼠', title: '三只松鼠每日坚果750g 旗舰店 新款', price: { amount: 95, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
    { platform: 'pinduoduo', brand: '三只松鼠', title: '【券后特价】三只松鼠 每日坚果750克 混合装', price: { amount: 89, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
  ]);
  const groups = groupProducts(listings);
  eq(groups.length, 1, '三条中文写法应归并为 1 组');
  eq(groups[0].listings.length, 3);
});

test('英文标题同款靠条形码跨语言归并', () => {
  const listings = normalizeMany([
    { platform: 'taobao', brand: '三只松鼠', title: '三只松鼠 每日坚果 750g', price: { amount: 99, currency: 'CNY' }, spec: { size: 750, unit: 'g' }, attributes: { barcode: '6901111111111' } },
    { platform: 'amazon', brand: 'Three Squirrels', title: 'Three Squirrels Daily Nuts 750g Premium', price: { amount: 14, currency: 'USD' }, spec: { size: 750, unit: 'g' }, attributes: { barcode: '6901111111111' } },
  ]);
  const groups = groupProducts(listings);
  eq(groups.length, 1, '同条形码即同款（跨中英文）');
});

test('同品牌不同产品不应误并', () => {
  const listings = normalizeMany([
    { platform: 'taobao', brand: '三只松鼠', title: '三只松鼠 每日坚果 750g', price: { amount: 99, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
    { platform: 'taobao', brand: '三只松鼠', title: '三只松鼠 巴旦木 750g', price: { amount: 79, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
  ]);
  const groups = groupProducts(listings);
  eq(groups.length, 2, '同品牌但不同品类不归并');
});

test('不同品牌 → 不归并', () => {
  const listings = normalizeMany([
    { platform: 'taobao', brand: '三只松鼠', title: '三只松鼠 每日坚果 750g', price: { amount: 99, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
    { platform: 'taobao', brand: '良品铺子', title: '良品铺子 每日坚果 750g', price: { amount: 89, currency: 'CNY' }, spec: { size: 750, unit: 'g' } },
  ]);
  const groups = groupProducts(listings);
  eq(groups.length, 2);
});

test('规格差异过大 → 不归并', () => {
  const listings = normalizeMany([
    { platform: 'taobao', brand: 'A', title: 'A 坚果 250g', price: { amount: 30, currency: 'CNY' }, spec: { size: 250, unit: 'g' } },
    { platform: 'jd', brand: 'A', title: 'A 坚果 1000g', price: { amount: 99, currency: 'CNY' }, spec: { size: 1000, unit: 'g' } },
  ]);
  const groups = groupProducts(listings);
  eq(groups.length, 2, '250g 与 1000g 视为不同规格');
});

test('条形码一致 → 强制归并', () => {
  const listings = normalizeMany([
    { platform: 'taobao', brand: 'X', title: '完全不同的标题甲', price: { amount: 10, currency: 'CNY' }, attributes: { barcode: '6901234567890' } },
    { platform: 'amazon', brand: 'Y', title: 'totally different title B', price: { amount: 2, currency: 'USD' }, attributes: { barcode: '6901234567890' } },
  ]);
  const groups = groupProducts(listings);
  eq(groups.length, 1, '同条形码即同款');
});

summary('match');
