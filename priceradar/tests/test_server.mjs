// HTTP 层测试：在同一进程内启动 server，直接请求各接口，最后关闭。
// 不依赖 shell 后台/curl，localhost 自测，确定性强。
import { testAsync, eq, assert, summary } from './_assert.mjs';

process.env.PORT = String(8190 + Math.floor(Math.random() * 500));
process.env.PR_NO_FX = '1'; // 测试不主动联网
const base = `http://localhost:${process.env.PORT}`;

const { server } = await import('../server.mjs');
await new Promise((r) => (server.listening ? r() : server.once('listening', r)));

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

console.log('server:');

await testAsync('GET /api/health → 默认权重 + 汇率信息', async () => {
  const { status, body } = await get('/api/health');
  eq(status, 200);
  eq(body.ok, true);
  assert(body.defaults.price > 0);
  assert(body.rates && body.rates.rates.USD > 0);
});

await testAsync('GET /api/compare → 产品 + 推荐 + 条形码 + 营养', async () => {
  const { status, body } = await get('/api/compare?q=' + encodeURIComponent('每日坚果'));
  eq(status, 200);
  assert(body.products.length >= 4);
  assert(body.topPick);
  const a = body.products[0].best.attributes;
  assert(/^69\d{11}$/.test(a.barcode), '应有条形码');
  assert(a.nutritionFacts && a.nutritionFacts['蛋白质'], '食品应有营养表');
});

await testAsync('GET /api/compare 含权重参数生效', async () => {
  const { body } = await get('/api/compare?q=' + encodeURIComponent('每日坚果') + '&weights=price:10,quality:0');
  eq(body.weights.price, 10);
  eq(body.weights.quality, 0);
});

await testAsync('GET /api/history → 30 点曲线，含真实快照', async () => {
  const { body: cmp } = await get('/api/compare?q=' + encodeURIComponent('蛋白粉'));
  const key = cmp.products[0].key;
  // 显式落一笔快照，避免 fire-and-forget 的时序竞态
  const { recordSnapshot } = await import('../src/history.mjs');
  await recordSnapshot([{ key, priceCNY: 123.4 }]);
  const { status, body } = await get('/api/history?key=' + encodeURIComponent(key) + '&price=120');
  eq(status, 200);
  eq(body.series.length, 30);
  assert(body.min <= body.max);
  assert(body.realPoints >= 1, '应含真实历史点');
});

await testAsync('GET /api/history 缺 key → 400', async () => {
  const { status } = await get('/api/history');
  eq(status, 400);
});

await testAsync('未知静态路径 → 404，目录穿越被拦', async () => {
  const r1 = await fetch(base + '/nope.html');
  eq(r1.status, 404);
  const r2 = await fetch(base + '/%2e%2e/server.mjs');
  eq(r2.status, 404);
});

server.close();
summary('server');
