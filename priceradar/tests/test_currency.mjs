// 汇率与单位换算测试
import { test, eq, approx, summary } from './_assert.mjs';
import { toCNY, unitPrice, setRates, getRate } from '../src/currency.mjs';

console.log('currency:');

test('USD 折算人民币', () => {
  approx(toCNY(10, 'USD'), 72, 1e-6);
});

test('CNY 折算自身不变', () => {
  eq(toCNY(99.9, 'CNY'), 99.9);
});

test('未知币种抛错', () => {
  let threw = false;
  try { toCNY(1, 'XYZ'); } catch { threw = true; }
  eq(threw, true);
});

test('setRates 可注入实时汇率', () => {
  setRates({ USD: 7.0 });
  approx(getRate('USD'), 7.0, 1e-9);
  approx(toCNY(10, 'USD'), 70, 1e-6);
  setRates({ USD: 7.2 }); // 还原
});

test('单位价格：500g 卖 50 元 → 0.1 元/g', () => {
  const up = unitPrice(50, { size: 500, unit: 'g' });
  approx(up.unitPriceCNY, 0.1, 1e-6);
  eq(up.baseLabel, 'g');
});

test('单位价格：1kg 折算到 g 基准', () => {
  const up = unitPrice(100, { size: 1, unit: 'kg' });
  approx(up.unitPriceCNY, 0.1, 1e-6); // 100元/1000g
});

test('不同规格可公平比较（1kg@90 比 500g@50 更便宜）', () => {
  const a = unitPrice(90, { size: 1, unit: 'kg' }).unitPriceCNY; // 0.09
  const b = unitPrice(50, { size: 500, unit: 'g' }).unitPriceCNY; // 0.10
  eq(a < b, true);
});

test('缺规格返回 null', () => {
  eq(unitPrice(50, { size: 0, unit: '' }), null);
});

summary('currency');
