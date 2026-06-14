// 真实平台适配器测试：签名算法、字段映射、未配置抛错、注入 fetch 解析。
// 全部离线（不联网），用 fixture 与注入的 fetch 驱动。
import { createHash } from 'node:crypto';
import { testAsync, test, eq, assert, summary } from './_assert.mjs';
import { JdSource, jdSign, mapItem as jdMap } from '../src/sources/jd.mjs';
import { PddSource, pddSign, mapItem as pddMap } from '../src/sources/pinduoduo.mjs';
import { AmazonSource } from '../src/sources/amazon.mjs';

console.log('adapters:');

// ---- 签名算法（独立复算交叉验证排序/拼接）----
test('jdSign = MD5(secret + 升序(key+value) + secret) 大写', () => {
  const params = { method: 'm', b: '2', a: '1', sign: 'IGNORED' };
  const expected = createHash('md5').update('S' + 'a1b2methodm' + 'S').digest('hex').toUpperCase();
  eq(jdSign(params, 'S'), expected);
  assert(/^[0-9A-F]{32}$/.test(jdSign(params, 'S')));
});

test('pddSign 同构且参数变化会改变签名', () => {
  const p1 = { type: 't', client_id: 'c', a: '1' };
  const p2 = { type: 't', client_id: 'c', a: '2' };
  const expected = createHash('md5').update('K' + 'a1client_idctypet' + 'K').digest('hex').toUpperCase();
  eq(pddSign(p1, 'K'), expected);
  assert(pddSign(p1, 'K') !== pddSign(p2, 'K'));
});

// ---- 字段映射 ----
test('JD mapItem：自营/价格/好评率→评分', () => {
  const m = jdMap({
    skuName: '某品牌 坚果 750g', skuId: 123, brandName: '某品牌', owner: 'g',
    priceInfo: { lowestPrice: 59.9, price: 69 }, shopInfo: { shopName: '京东自营' },
    imageInfo: { imageList: [{ url: 'http://img/a.jpg' }] },
    commentInfo: { goodCommentsShare: 98, commentCount: 1200 }, inOrderCount30Days: 5000,
  });
  eq(m.platform, 'jd'); eq(m.price.amount, 59.9); eq(m.shopType, 'selfrun');
  assert(m.rating > 4.8 && m.rating <= 5); eq(m.url, 'https://item.jd.com/123.html');
});

test('PDD mapItem：分→元、旗舰店', () => {
  const m = pddMap({ goods_name: '坚果', min_group_price: 1990, mall_name: '旗舰店', merchant_type: 1, goods_image_url: 'http://i', goods_sign: 'sx' });
  eq(m.price.amount, 19.9, '1990 分 = 19.9 元');
  eq(m.shopType, 'flagship');
  assert(m.url.includes('goods_sign=sx'));
});

// ---- 未配置抛错（交由 registry 回退）----
await testAsync('未配置凭证时三家都抛错', async () => {
  for (const src of [new JdSource({}), new PddSource({}), new AmazonSource({})]) {
    let threw = false;
    try { await src.search('x'); } catch { threw = true; }
    eq(threw, true, `${src.platform} 应在未配置时抛错`);
  }
});

// ---- 注入 fetch 后能解析 ----
await testAsync('JD.search 注入 fetch → 解析 queryResult', async () => {
  const queryResult = JSON.stringify({ data: [{ skuName: 'A 坚果', skuId: 1, priceInfo: { lowestPrice: 30 }, shopInfo: { shopName: 'X' } }] });
  const src = new JdSource({ appKey: 'k', appSecret: 's', fetchImpl: async () => ({ ok: true, json: async () => ({ jd_union_open_goods_query_responce: { queryResult } }) }) });
  const raw = await src.search('坚果');
  eq(raw.length, 1); eq(raw[0].price.amount, 30); eq(raw[0].platform, 'jd');
});

await testAsync('PDD.search 注入 fetch → 解析 goods_list', async () => {
  const src = new PddSource({ clientId: 'c', clientSecret: 's', fetchImpl: async () => ({ ok: true, json: async () => ({ goods_search_response: { goods_list: [{ goods_name: 'B', min_group_price: 990, mall_name: 'M' }] } }) }) });
  const raw = await src.search('零食');
  eq(raw.length, 1); eq(raw[0].price.amount, 9.9);
});

await testAsync('Amazon Creators：先取 token 再 searchItems', async () => {
  const calls = [];
  const src = new AmazonSource({
    clientId: 'id', clientSecret: 'sec', partnerTag: 'tag-20',
    fetchImpl: async (url, opts) => {
      calls.push(url);
      if (url.includes('/auth/o2/token')) return { ok: true, json: async () => ({ access_token: 'TKN', expires_in: 3600 }) };
      return { ok: true, json: async () => ({ SearchResult: { Items: [{ ASIN: 'B01', ItemInfo: { Title: { DisplayValue: 'Nuts' } }, Offers: { Listings: [{ Price: { Amount: 9.99, Currency: 'USD' } }] } }] } }) };
    },
  });
  const raw = await src.search('nuts');
  assert(calls.some((u) => u.includes('token')), '应先请求 token');
  assert(calls.some((u) => u.includes('searchItems')), '再请求 searchItems');
  eq(raw[0].price.amount, 9.99); eq(raw[0].title, 'Nuts');
  assert(raw[0].url.includes('tag-20'), '链接带 partnerTag');
});

summary('adapters');
