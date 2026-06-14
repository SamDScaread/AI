// 增强能力测试：实时汇率回退、价格历史、条形码/营养表
import { testAsync, test, eq, assert, approx, summary } from './_assert.mjs';
import { refreshRates, ratesInfo, toCNY, setRates } from '../src/currency.mjs';
import { syntheticHistory, getHistory, recordSnapshot } from '../src/history.mjs';
import { DemoSource } from '../src/sources/demo.mjs';

console.log('features:');

// ---- 实时汇率 ----
await testAsync('refreshRates 成功 → 更新汇率（接口给 1CNY=?外币，取倒数）', async () => {
  const stub = async () => ({ ok: true, json: async () => ({ rates: { CNY: 1, USD: 0.125 } }) }); // 1 USD = 8 CNY
  const r = await refreshRates(stub);
  eq(r.ok, true);
  approx(toCNY(1, 'USD'), 8, 1e-3);
  eq(ratesInfo().source, 'live');
  setRates({ USD: 7.2 }); // 还原
});

await testAsync('refreshRates 网络失败 → 静默回退，不抛错', async () => {
  const before = toCNY(1, 'USD');
  const stub = async () => { throw new Error('network down'); };
  const r = await refreshRates(stub);
  eq(r.ok, false);
  assert(r.error.includes('network'));
  eq(toCNY(1, 'USD'), before, '失败不应改动现有汇率');
});

await testAsync('refreshRates 无 fetch → 安全返回', async () => {
  const r = await refreshRates(undefined);
  eq(r.ok, false);
});

// ---- 价格历史 ----
test('syntheticHistory：30 点、终点为当前价、可复现', () => {
  const a = syntheticHistory('某商品|key', 100);
  const b = syntheticHistory('某商品|key', 100);
  eq(a.length, 30);
  approx(a[29].priceCNY, 100, 0.01);
  eq(JSON.stringify(a), JSON.stringify(b), '同 key 同价应完全一致');
  a.forEach((p) => assert(p.priceCNY > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.date)));
});

await testAsync('record + getHistory 回环：真实快照覆盖当日点', async () => {
  const key = 'TEST|history|roundtrip';
  await recordSnapshot([{ key, priceCNY: 42.5 }]);
  const h = await getHistory(key, 99);
  assert(h.realPoints >= 1, '应至少 1 个真实点');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPoint = h.series.find((p) => p.date === todayStr);
  approx(todayPoint.priceCNY, 42.5, 0.01, '今日点应为记录值');
  assert(h.min <= h.max);
});

// ---- 条形码 / 营养 ----
await testAsync('演示数据：同款各平台共享同一条形码（强化归并）', async () => {
  const raws = await new DemoSource().search('每日坚果');
  const byKey = new Map();
  for (const r of raws) {
    assert(/^69\d{11}$/.test(r.attributes.barcode), `条形码格式应为 EAN 风格: ${r.attributes.barcode}`);
    if (!byKey.has(r.productKey)) byKey.set(r.productKey, r.attributes.barcode);
    eq(r.attributes.barcode, byKey.get(r.productKey), '同款各平台条形码必须一致');
  }
});

await testAsync('食品类带营养成分表，含蛋白质/糖/钠', async () => {
  const raws = await new DemoSource().search('坚果零食');
  const withNut = raws.find((r) => r.attributes.nutritionFacts);
  assert(withNut, '食品应有营养表');
  const nf = withNut.attributes.nutritionFacts;
  assert(nf['蛋白质'] && nf['钠'] && nf['其中-糖'], '营养表字段齐全');
});

await testAsync('数码类无营养表（品类相关）', async () => {
  const raws = await new DemoSource().search('蓝牙耳机');
  assert(raws.every((r) => r.attributes.nutritionFacts == null), '数码不应有营养表');
});

summary('features');
