// 前端冒烟测试（jsdom）：加载真实页面 + 桩掉 fetch + 驱动一次搜索，
// 校验推荐 Hero、产品卡、店铺明细、维度条、对比勾选等关键 UI 是否正确渲染。
// 需要 jsdom：先 `npm install`，再 `npm run test:frontend`。
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { testAsync, eq, assert, summary } from './_assert.mjs';
import { compare } from '../src/aggregate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(__dirname, '../public/index.html'), 'utf8');

// 真实跑一遍后端聚合，作为前端的“接口返回”
const result = await compare('每日坚果');

// 搭 jsdom 环境
const dom = new JSDOM(html, { url: 'http://localhost:8090/' });
const { window } = dom;
window.scrollTo = () => {};
window.devicePixelRatio = 1;
window.HTMLCanvasElement.prototype.getContext = () => null; // 无 canvas 后端，雷达图安全跳过
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
window.prompt = () => null; // jsdom 无原生 prompt

const histPayload = {
  key: 'x', realPoints: 3, min: 70, max: 95, current: 80,
  series: Array.from({ length: 30 }, (_, i) => ({ date: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`, priceCNY: 80 + (i % 5) })),
};
global.fetch = async (url) => ({
  ok: true,
  json: async () => (String(url).includes('/api/history') ? histPayload : result),
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('frontend:');

// 加载主逻辑（会执行 init()）
await import('../public/js/app.mjs');

await testAsync('初始渲染：9 个权重滑块 + 空状态', async () => {
  eq(document.querySelectorAll('#sliders input[type=range]').length, 9);
  assert(!document.querySelector('#emptyState').classList.contains('hidden'));
});

await testAsync('提交搜索后渲染推荐与产品卡', async () => {
  document.querySelector('#searchInput').value = '每日坚果';
  document.querySelector('#searchForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(60);

  assert(document.querySelector('#hero .hero'), '应有推荐 Hero');
  assert(document.querySelector('.hero .badge').textContent.includes('最优推荐'));
  const cards = document.querySelectorAll('#productList .card');
  assert(cards.length >= 4, `应至少 4 张产品卡，实际 ${cards.length}`);
  // 每张卡有综合分与 9 条维度
  const first = cards[0];
  assert(first.querySelector('.score-ring .val').textContent.trim().length > 0);
  eq(first.querySelectorAll('.dims .dim').length, 9);
  assert(first.querySelector('.price-now').textContent.includes('¥'));
});

await testAsync('展开：店铺明细 + 商品详情 + 价格走势', async () => {
  const card = document.querySelector('#productList .card');
  const toggle = card.querySelector('[data-toggle]');
  toggle.dispatchEvent(new window.Event('click', { bubbles: true }));
  await wait(30);
  const offers = card.querySelector('.offers');
  assert(!offers.classList.contains('hidden'), '点击后应展开');
  assert(offers.querySelectorAll('tbody tr').length >= 1, '应有店铺行');
  assert(offers.querySelector('.best-row'), '应标出最优店铺行');
  assert(offers.querySelector('.info-panel'), '应有商品详情面板');
  assert(offers.querySelector('.nut-table') || offers.textContent.includes('条形码'), '应展示条形码/营养等详情');
  const note = offers.querySelector('.trend-note');
  assert(note && !note.textContent.includes('加载中'), '价格走势应加载完成');
});

await testAsync('收藏：点击后计数 +1', async () => {
  const before = Number(document.querySelector('#favCount').textContent);
  const favBtn = document.querySelector('[data-fav]');
  favBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  await wait(10);
  eq(Number(document.querySelector('#favCount').textContent), before + 1);
  assert(favBtn.classList.contains('on'), '按钮应变为已收藏态');
  // 打开收藏夹应能看到该条目
  document.querySelector('#favBtn').dispatchEvent(new window.Event('click', { bubbles: true }));
  await wait(10);
  assert(!document.querySelector('#favModal').classList.contains('hidden'));
  assert(document.querySelectorAll('#favBody .fav-table tbody tr').length >= 1, '收藏夹应有条目');
  document.querySelector('#closeFav').dispatchEvent(new window.Event('click', { bubbles: true }));
});

await testAsync('元信息显示聚合统计与数据源状态', async () => {
  const meta = document.querySelector('#resultMeta').textContent;
  assert(meta.includes('聚合'));
  assert(meta.includes('演示数据') || meta.includes('实时数据源'));
});

await testAsync('加入对比 → 对比条出现', async () => {
  const checks = document.querySelectorAll('[data-cmp]');
  checks[0].checked = true;
  checks[0].dispatchEvent(new window.Event('change', { bubbles: true }));
  checks[1].checked = true;
  checks[1].dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(10);
  assert(!document.querySelector('#compareBar').classList.contains('hidden'), '对比条应出现');
  assert(document.querySelector('#compareCount').textContent.includes('2'));
});

await testAsync('打开对比弹窗渲染对比表', async () => {
  document.querySelector('#openCompare').dispatchEvent(new window.Event('click', { bubbles: true }));
  await wait(10);
  assert(!document.querySelector('#compareModal').classList.contains('hidden'));
  const rows = document.querySelectorAll('#compareBody .cmp-table tbody tr');
  assert(rows.length >= 5, '对比表应有多行指标');
  assert(document.querySelector('#compareBody .cmp-table .win'), '应高亮每行胜出者');
});

summary('frontend');
