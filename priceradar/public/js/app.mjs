// 比价雷达 · PriceRadar — 前端主逻辑
import { fetchCompare, fetchHistory, DIMENSIONS, PRESETS } from './api.mjs';
import { drawRadar, drawSparkline, RADAR_COLORS } from './radar.mjs';
import { isFav, toggleFav, favCount, getFavorites, getAlert, setAlert, clearAlert } from './store.mjs';
import { initPWA } from './pwa.mjs';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  query: '',
  result: null,
  weights: { ...PRESETS.balanced },
  compare: new Map(), // key -> product
  expanded: new Set(),
};

// ---------- 初始化 ----------
function init() {
  buildSliders();
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); doSearch($('#searchInput').value); });
  $('#suggestions').addEventListener('click', onChipQuery);
  $('#resetWeights').addEventListener('click', () => { setWeights(PRESETS.balanced); markPreset('balanced'); if (state.query) doSearch(state.query); });
  $('#presets').addEventListener('click', onPreset);
  $('#clearCompare').addEventListener('click', clearCompare);
  $('#openCompare').addEventListener('click', openCompare);
  $('#closeCompare').addEventListener('click', () => $('#compareModal').classList.add('hidden'));
  $('#compareModal').addEventListener('click', (e) => { if (e.target.id === 'compareModal') e.target.classList.add('hidden'); });
  $('#favBtn').addEventListener('click', openFavorites);
  $('#closeFav').addEventListener('click', () => $('#favModal').classList.add('hidden'));
  $('#favModal').addEventListener('click', (e) => { if (e.target.id === 'favModal') e.target.classList.add('hidden'); });
  updateFavCount();
  initPWA();
}

function updateFavCount() { $('#favCount').textContent = favCount(); }

function onChipQuery(e) {
  const q = e.target.dataset.q;
  if (!q) return;
  $('#searchInput').value = q;
  doSearch(q);
}

// ---------- 权重滑块 ----------
function buildSliders() {
  const wrap = $('#sliders');
  wrap.innerHTML = DIMENSIONS.map((d) => `
    <div class="slider-row">
      <label for="w_${d.key}"><span>${d.label}</span><span class="wval" id="wv_${d.key}">${state.weights[d.key]}</span></label>
      <input type="range" id="w_${d.key}" min="0" max="10" step="1" value="${state.weights[d.key]}" data-key="${d.key}" />
    </div>`).join('');
  wrap.addEventListener('input', onSlide);
}

let slideTimer = null;
function onSlide(e) {
  const key = e.target.dataset.key;
  if (!key) return;
  state.weights[key] = Number(e.target.value);
  $(`#wv_${key}`).textContent = e.target.value;
  markPreset(detectPreset());
  clearTimeout(slideTimer);
  slideTimer = setTimeout(() => { if (state.query) doSearch(state.query, true); }, 280);
}

function setWeights(w) {
  state.weights = { ...w };
  for (const d of DIMENSIONS) {
    const el = $(`#w_${d.key}`); if (el) el.value = w[d.key];
    const lab = $(`#wv_${d.key}`); if (lab) lab.textContent = w[d.key];
  }
}

function onPreset(e) {
  const name = e.target.dataset.preset;
  if (!name || !PRESETS[name]) return;
  setWeights(PRESETS[name]);
  markPreset(name);
  if (state.query) doSearch(state.query, true);
}

function markPreset(name) {
  $$('#presets .chip').forEach((c) => c.classList.toggle('active', c.dataset.preset === name));
}
function detectPreset() {
  for (const [name, w] of Object.entries(PRESETS)) {
    if (DIMENSIONS.every((d) => w[d.key] === state.weights[d.key])) return name;
  }
  return null;
}

// ---------- 搜索 ----------
async function doSearch(query, keepScroll = false) {
  query = (query || '').trim();
  if (!query) return;
  state.query = query;
  $('#emptyState').classList.add('hidden');
  $('#resultBody').classList.add('hidden');
  $('#loading').classList.remove('hidden');
  try {
    const result = await fetchCompare(query, state.weights);
    state.result = result;
    render(result);
  } catch (err) {
    $('#loading').classList.add('hidden');
    $('#resultBody').classList.remove('hidden');
    $('#resultBody').innerHTML = `<div class="empty"><h2>出错了</h2><p>${esc(err.message)}</p></div>`;
  }
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render(result) {
  $('#loading').classList.add('hidden');
  $('#resultBody').classList.remove('hidden');
  if (result.error || !result.products.length) {
    $('#resultBody').innerHTML = `<div class="empty"><div class="empty-art">🤔</div><h2>没找到“${esc(result.query)}”的比价结果</h2><p>${esc(result.error || '换个关键词试试')}</p></div>`;
    return;
  }
  $('#resultBody').innerHTML = `<div id="hero"></div><div class="result-meta" id="resultMeta"></div><div id="productList" class="product-list"></div>`;
  renderHero(result);
  renderMeta(result);
  renderProducts(result);
  refreshCompareBar();
}

// ---------- 推荐 Hero ----------
function renderHero(result) {
  const tp = result.topPick;
  if (!tp) return;
  const product = result.products.find((p) => p.offers.some((o) => o.id === tp.listingId));
  const offer = product?.offers.find((o) => o.id === tp.listingId);
  if (!offer) return;

  const reason = topReasons(offer, result.dimensions);
  const toHand = (offer.priceCNY + (offer.shipping?.feeCNY || 0)).toFixed(2);

  $('#hero').innerHTML = `
    <div class="hero">
      <span class="badge">🏆 全网最优推荐</span>
      <h3>${esc(product.title)}</h3>
      <p class="where">在 <b>${esc(offer.platformName)}</b> · <b>${esc(offer.shopName)}</b>（${shopTypeLabel(offer.shopType)}）下单最优</p>
      <div class="hero-grid">
        <div>
          <div class="hero-figures">
            <div class="fig"><div class="num">¥${toHand}</div><div class="lbl">到手价${offer.shipping?.feeCNY ? '（含运费）' : '（包邮）'}</div></div>
            <div class="fig"><div class="num">${offer.totalScore}</div><div class="lbl">综合得分 / 100</div></div>
            <div class="fig"><div class="num">★${offer.rating}</div><div class="lbl">${fmtInt(offer.reviewCount)} 条评价</div></div>
            ${offer.unitPriceCNY ? `<div class="fig"><div class="num">¥${offer.unitPriceCNY}</div><div class="lbl">每${offer._baseLabel || '单位'}单价</div></div>` : ''}
          </div>
          <p class="reason">💡 之所以推荐它：${reason}</p>
          <a class="cta" href="${esc(offer.url)}" target="_blank" rel="noopener">前往购买 →</a>
        </div>
        <div><canvas id="heroRadar"></canvas></div>
      </div>
    </div>`;
  const labels = result.dimensions.map((d) => d.label);
  drawRadar($('#heroRadar'), labels, [{ name: '推荐', color: '#fbbf24', values: result.dimensions.map((d) => offer.scores[d.key]) }], { size: 230, light: true });
}

function topReasons(offer, dims) {
  const ranked = dims.map((d) => ({ label: d.label, v: offer.scores[d.key] })).sort((a, b) => b.v - a.v);
  const tops = ranked.filter((x) => x.v >= 75).slice(0, 3);
  const list = (tops.length ? tops : ranked.slice(0, 2)).map((x) => x.label);
  return `它在 <b>${list.join('、')}</b> 上明显领先，综合你的偏好后总分最高。`;
}

// ---------- 元信息 ----------
function renderMeta(result) {
  const live = result.meta.sources.filter((s) => s.mode === 'live');
  const okLive = live.filter((s) => s.ok);
  const srcTxt = okLive.length
    ? `<span class="src-ok">● 实时数据源 ${okLive.length} 个</span>`
    : `<span class="src-fail">● 演示数据（未配置实时数据源）</span>`;
  $('#resultMeta').innerHTML = `
    <span>共聚合 <b>${result.meta.totalListings}</b> 条商品，归并为 <b>${result.meta.productCount}</b> 款</span>
    <span>品类：${catLabel(result.category)}</span>
    ${srcTxt}
    <span>耗时 ${result.meta.elapsedMs} ms</span>`;
}

// ---------- 产品列表 ----------
function renderProducts(result) {
  const list = $('#productList');
  list.innerHTML = result.products.map((p, i) => productCard(p, i, result)).join('');
  // 事件委托
  list.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', () => toggleOffers(btn.dataset.toggle)));
  list.querySelectorAll('[data-cmp]').forEach((chk) => chk.addEventListener('change', (e) => toggleCompare(e.target.dataset.cmp)));
  list.querySelectorAll('[data-fav]').forEach((btn) => btn.addEventListener('click', () => onFav(btn.dataset.fav)));
  list.querySelectorAll('[data-alert]').forEach((btn) => btn.addEventListener('click', () => onAlert(btn.dataset.alert)));
}

function productByKey(key) { return state.result.products.find((p) => p.key === key); }

function onFav(key) {
  const p = productByKey(key);
  const now = toggleFav(p);
  updateFavCount();
  const btn = document.querySelector(`[data-fav="${cssAttr(key)}"]`);
  if (btn) { btn.classList.toggle('on', now); btn.textContent = now ? '♥ 已收藏' : '♡ 收藏'; }
  toast(now ? '已加入收藏' : '已取消收藏');
}

function onAlert(key) {
  const p = productByKey(key);
  const existing = getAlert(key);
  const cur = p.priceRange.minCNY;
  const input = window.prompt(`「${short(p.title)}」当前最低到手 ¥${cur}\n设定到价提醒目标价（人民币），留空清除：`, existing ? existing.target : Math.floor(cur * 0.9));
  if (input === null) return;
  if (input.trim() === '') { clearAlert(key); toast('已清除提醒'); }
  else { setAlert(key, Number(input), p.title); toast(`已设提醒：低于 ¥${Number(input)} 时高亮`); }
  // 局部刷新该卡
  refreshCardAlert(key);
}

function refreshCardAlert(key) {
  const p = productByKey(key);
  const card = document.querySelector(`.card[data-key="${cssAttr(key)}"]`);
  if (!card || !p) return;
  const slot = card.querySelector('.alert-slot');
  if (slot) slot.innerHTML = alertBadge(p);
  const btn = card.querySelector(`[data-alert="${cssAttr(key)}"]`);
  if (btn) { const a = getAlert(key); btn.classList.toggle('on', !!a); btn.textContent = a ? `🔔 ¥${a.target}` : '🔔 到价提醒'; }
}

function alertBadge(p) {
  const a = getAlert(p.key);
  if (!a) return '';
  const cur = p.priceRange.minCNY;
  return cur <= a.target
    ? `<span class="reached">🎯 已到目标价 ¥${a.target}（现 ¥${cur}）</span>`
    : `<span class="watching">🔔 监控中：目标 ¥${a.target}（现 ¥${cur}）</span>`;
}

function productCard(p, idx, result) {
  const best = p.best;
  const certs = (best.attributes.certifications || []).slice(0, 3);
  const dims = result.dimensions;
  const expanded = state.expanded.has(p.key);
  const checked = state.compare.has(p.key) ? 'checked' : '';
  const fav = isFav(p.key);
  const alert = getAlert(p.key);
  return `
  <div class="card" data-key="${esc(p.key)}">
    <div class="card-main">
      <div>
        <div class="rank">#${idx + 1}</div>
        <h3>${esc(p.title)}</h3>
        <div class="brand">${esc(p.brand || '—')} · 全网 ${p.offerCount} 个在售店铺</div>
        <div class="tags">
          ${best.attributes.mainContentPct != null ? `<span class="tag">主料含量 ${best.attributes.mainContentPct}%</span>` : ''}
          ${best.attributes.packaging ? `<span class="tag">${esc(best.attributes.packaging)}</span>` : ''}
          ${certs.map((c) => `<span class="tag cert">✓ ${esc(c)}</span>`).join('')}
          ${p.platforms.slice(0, 4).map((pl) => `<span class="tag plat">${esc(pl)}</span>`).join('')}
        </div>
        <div class="price-line">
          <span class="price-now">¥${(best.priceCNY + (best.shipping?.feeCNY || 0)).toFixed(2)}<small> 起到手</small></span>
          <span class="price-range">全网区间 ¥${p.priceRange.minCNY}–${p.priceRange.maxCNY}</span>
        </div>
        ${p.bestUnitPriceCNY ? `<div class="unit-price">最优单价 ¥${p.bestUnitPriceCNY}/${esc(p.baseLabel || '单位')}</div>` : ''}
        <div class="alert-slot">${alertBadge(p)}</div>
      </div>
      <div class="score-box">
        <div class="score-ring">
          ${ring(best.totalScore)}
          <div class="val">${best.totalScore}</div>
        </div>
        <div class="best-where">最优：<b>${esc(best.platformName)}</b><br>${esc(best.shopName)}</div>
      </div>
    </div>
    <div class="dims">
      ${dims.map((d) => dimBar(d, best.scores[d.key])).join('')}
    </div>
    <div class="card-actions">
      <a class="btn primary" href="${esc(best.url)}" target="_blank" rel="noopener">去最优店铺</a>
      <button class="btn" data-toggle="${esc(p.key)}">${expanded ? '收起' : `全部 ${p.offerCount} 店铺 · 走势 · 详情`}</button>
      <button class="btn ghost ${fav ? 'on' : ''}" data-fav="${esc(p.key)}">${fav ? '♥ 已收藏' : '♡ 收藏'}</button>
      <button class="btn ghost ${alert ? 'on' : ''}" data-alert="${esc(p.key)}">${alert ? `🔔 ¥${alert.target}` : '🔔 到价提醒'}</button>
      <label class="cmp-check"><input type="checkbox" data-cmp="${esc(p.key)}" ${checked}/> 加入对比</label>
    </div>
    <div class="offers ${expanded ? '' : 'hidden'}" id="offers_${cssId(p.key)}" data-loaded="0">${expandContent(p)}</div>
  </div>`;
}

// 展开区：商品详情（条形码/产地/工艺/配料/营养表）+ 价格走势 + 各店铺明细
function expandContent(p) {
  const a = p.best.attributes || {};
  const nf = a.nutritionFacts;
  const nutRows = nf ? Object.entries(nf).map(([k, v]) => `<tr><td>${esc(k.replace('其中-', '└ '))}</td><td>${esc(String(v))}</td></tr>`).join('') : '';
  return `
    <div class="expand-grid">
      <div class="info-panel">
        <h4>商品详情</h4>
        <dl class="kv">
          ${a.barcode ? `<dt>条形码</dt><dd>${esc(a.barcode)}</dd>` : ''}
          ${a.origin ? `<dt>产地</dt><dd>${esc(a.origin)}</dd>` : ''}
          ${a.craft ? `<dt>工艺</dt><dd>${esc(a.craft)}</dd>` : ''}
          ${a.mainContentPct != null ? `<dt>主料含量</dt><dd>${a.mainContentPct}%</dd>` : ''}
          ${a.packaging ? `<dt>包装</dt><dd>${esc(a.packaging)}</dd>` : ''}
          ${(a.ingredients && a.ingredients.length) ? `<dt>配料/原料</dt><dd>${a.ingredients.map(esc).join('、')}</dd>` : ''}
          ${(a.certifications && a.certifications.length) ? `<dt>认证</dt><dd>${a.certifications.map(esc).join('、')}</dd>` : ''}
        </dl>
        ${nf ? `<h4>营养成分表（每100g/ml）</h4><table class="nut-table"><tbody>${nutRows}</tbody></table>` : ''}
      </div>
      <div class="trend-panel">
        <h4>价格走势（近 30 天）</h4>
        <canvas class="spark" id="spark_${cssId(p.key)}"></canvas>
        <div class="trend-note" id="sparknote_${cssId(p.key)}">加载中…</div>
      </div>
    </div>
    ${offersTable(p)}`;
}

function dimBar(dim, val) {
  return `<div class="dim"><span class="dname">${dim.label}</span><span class="bar"><i style="width:${val}%"></i></span><span class="dval">${val}</span></div>`;
}

function offersTable(p) {
  const rows = p.offers.map((o) => {
    const toHand = (o.priceCNY + (o.shipping?.feeCNY || 0)).toFixed(2);
    const ship = o.shipping?.feeCNY ? `+¥${o.shipping.feeCNY} 运费` : '包邮';
    const isBest = o.id === p.best.id;
    return `<tr class="${isBest ? 'best-row' : ''}">
      <td><span class="platform-pill">${esc(o.platformName)}</span>${isBest ? ' 🏆' : ''}</td>
      <td>${esc(o.shopName)}<br><span class="shop-type">${shopTypeLabel(o.shopType)} · 店评 ${o.shopRating}</span></td>
      <td>¥${toHand}<br><span class="shop-type">${ship} · ${o.shipping?.days || '?'}天</span></td>
      <td>${o.unitPriceCNY ? '¥' + o.unitPriceCNY + '/' + esc(o._baseLabel || '') : '—'}</td>
      <td>★${o.rating}<br><span class="shop-type">${fmtInt(o.reviewCount)}评</span></td>
      <td><span class="mini-score">${o.totalScore}</span></td>
      <td><a class="go" href="${esc(o.url)}" target="_blank" rel="noopener">前往 →</a></td>
    </tr>`;
  }).join('');
  return `<table>
    <thead><tr><th>平台</th><th>店铺</th><th>到手价</th><th>单价</th><th>评分</th><th>综合分</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function toggleOffers(key) {
  const el = $(`#offers_${cssId(key)}`);
  const btn = document.querySelector(`[data-toggle="${cssAttr(key)}"]`);
  const product = state.result.products.find((p) => p.key === key);
  if (state.expanded.has(key)) {
    state.expanded.delete(key); el.classList.add('hidden');
    if (btn) btn.textContent = `全部 ${product.offerCount} 店铺 · 走势 · 详情`;
  } else {
    state.expanded.add(key); el.classList.remove('hidden');
    if (btn) btn.textContent = '收起';
    if (el.dataset.loaded === '0') { el.dataset.loaded = '1'; loadHistory(key); }
  }
}

async function loadHistory(key) {
  const product = state.result.products.find((p) => p.key === key);
  const note = $(`#sparknote_${cssId(key)}`);
  try {
    const hist = await fetchHistory(key, product.priceRange.minCNY);
    const canvas = $(`#spark_${cssId(key)}`);
    if (canvas) drawSparkline(canvas, hist.series, { width: 300, height: 76 });
    if (note) {
      const first = hist.series[0]?.priceCNY, last = hist.series[hist.series.length - 1]?.priceCNY;
      const diff = last - first;
      const trend = diff > 0 ? `↑ 涨 ¥${diff.toFixed(2)}` : diff < 0 ? `↓ 降 ¥${(-diff).toFixed(2)}` : '基本持平';
      note.innerHTML = `区间 ¥${hist.min}–${hist.max} · 30天${trend} · ${hist.realPoints > 1 ? '含真实记录 ' + hist.realPoints + ' 点' : '示例走势（随使用累积真实数据）'}`;
    }
  } catch {
    if (note) note.textContent = '价格走势加载失败';
  }
}

// ---------- 对比 ----------
function toggleCompare(key) {
  if (state.compare.has(key)) state.compare.delete(key);
  else {
    if (state.compare.size >= 4) { toast('最多对比 4 件'); syncCheckboxes(); return; }
    state.compare.set(key, state.result.products.find((p) => p.key === key));
  }
  refreshCompareBar();
}
function syncCheckboxes() {
  $$('[data-cmp]').forEach((c) => { c.checked = state.compare.has(c.dataset.cmp); });
}
function clearCompare() { state.compare.clear(); refreshCompareBar(); }
function refreshCompareBar() {
  syncCheckboxes();
  const bar = $('#compareBar');
  $('#compareCount').textContent = `已选 ${state.compare.size} 件对比`;
  bar.classList.toggle('hidden', state.compare.size === 0);
  $('#openCompare').disabled = state.compare.size < 2;
}

function openCompare() {
  if (state.compare.size < 2) { toast('至少选 2 件'); return; }
  const products = [...state.compare.values()];
  const dims = state.result.dimensions;
  const datasets = products.map((p, i) => ({ name: p.brand, color: RADAR_COLORS[i % RADAR_COLORS.length], values: dims.map((d) => p.best.scores[d.key]) }));

  const metricRows = [
    ['综合得分', (p) => p.best.totalScore, 'max'],
    ['到手价', (p) => +(p.best.priceCNY + (p.best.shipping?.feeCNY || 0)).toFixed(2), 'min', '¥'],
    ['最优单价', (p) => p.bestUnitPriceCNY || Infinity, 'min', '¥'],
    ['评分', (p) => p.best.rating, 'max', '★'],
    ['最优平台', (p) => p.best.platformName, null],
    ['卫生资质分', (p) => p.best.scores.hygiene, 'max'],
    ['成分用料分', (p) => p.best.scores.ingredients, 'max'],
    ['营养价值分', (p) => p.best.scores.nutrition, 'max'],
    ['店铺信誉分', (p) => p.best.scores.reputation, 'max'],
  ];

  const head = `<tr><th>对比项</th>${products.map((p) => `<th>${esc(p.brand)}<br><span class="shop-type">${esc(short(p.title))}</span></th>`).join('')}</tr>`;
  const body = metricRows.map(([label, fn, dir, prefix]) => {
    const vals = products.map(fn);
    let winIdx = -1;
    if (dir) {
      const nums = vals.map((v) => (typeof v === 'number' ? v : NaN));
      const target = dir === 'max' ? Math.max(...nums) : Math.min(...nums);
      winIdx = nums.indexOf(target);
    }
    return `<tr><td>${label}</td>${vals.map((v, i) => `<td class="${i === winIdx ? 'win' : ''}">${prefix || ''}${typeof v === 'number' && !isFinite(v) ? '—' : esc(String(v))}</td>`).join('')}</tr>`;
  }).join('');

  $('#compareBody').innerHTML = `<div class="cmp-radar-wrap"><canvas id="cmpRadar"></canvas></div>
    <table class="cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  drawRadar($('#cmpRadar'), dims.map((d) => d.label), datasets, { size: 300 });
  $('#compareModal').classList.remove('hidden');
}

// ---------- 收藏夹 ----------
function openFavorites() {
  const favs = Object.values(getFavorites()).sort((a, b) => b.savedAt - a.savedAt);
  const body = $('#favBody');
  if (!favs.length) {
    body.innerHTML = `<div class="empty" style="box-shadow:none;border:none"><div class="empty-art">♥</div><p>还没有收藏。搜索后点商品卡上的「♡ 收藏」即可加入这里，方便日后回看与比价。</p></div>`;
  } else {
    body.innerHTML = `<table class="cmp-table fav-table"><thead><tr><th>商品</th><th>收藏时最优</th><th>最优渠道</th><th>到价提醒</th><th></th></tr></thead><tbody>${
      favs.map((f) => {
        const a = getAlert(f.key);
        return `<tr>
          <td><b>${esc(f.brand || '')}</b><br><span class="shop-type">${esc(short(f.title))}</span></td>
          <td>¥${f.savedPrice}</td>
          <td>${esc(f.bestPlatform || '')}<br><span class="shop-type">${esc(f.bestShop || '')}</span></td>
          <td>${a ? '🔔 ¥' + a.target : '—'}</td>
          <td>
            <button class="btn" data-research="${esc(f.title)}">重新比价</button>
            <button class="btn ghost" data-unfav="${esc(f.key)}">移除</button>
          </td></tr>`;
      }).join('')
    }</tbody></table>`;
    body.querySelectorAll('[data-research]').forEach((b) => b.addEventListener('click', () => {
      $('#favModal').classList.add('hidden');
      $('#searchInput').value = b.dataset.research;
      doSearch(b.dataset.research);
    }));
    body.querySelectorAll('[data-unfav]').forEach((b) => b.addEventListener('click', () => {
      toggleFav({ key: b.dataset.unfav, title: '', brand: '', best: {}, priceRange: {} });
      updateFavCount(); openFavorites();
      const card = document.querySelector(`[data-fav="${cssAttr(b.dataset.unfav)}"]`);
      if (card) { card.classList.remove('on'); card.textContent = '♡ 收藏'; }
    }));
  }
  $('#favModal').classList.remove('hidden');
}

// ---------- 工具 ----------
function ring(score) {
  const c = score >= 80 ? '#16a34a' : score >= 60 ? '#0e7490' : score >= 40 ? '#f59e0b' : '#dc2626';
  const deg = Math.round((score / 100) * 360);
  return `<svg viewBox="0 0 84 84" width="84" height="84"><circle cx="42" cy="42" r="36" fill="none" stroke="#e6eaf2" stroke-width="8"/><circle cx="42" cy="42" r="36" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(deg / 360) * 226} 226" transform="rotate(-90 42 42)"/></svg>`;
}
function shopTypeLabel(t) {
  return { flagship: '官方旗舰店', authorized: '授权专卖', selfrun: '平台自营', thirdparty: '第三方店' }[t] || '店铺';
}
function catLabel(c) {
  return { food: '食品', baby: '母婴', supplement: '保健品', cosmetics: '美妆个护', electronics: '数码', home: '家清', general: '通用' }[c] || c;
}
function short(s) { return s.length > 16 ? s.slice(0, 16) + '…' : s; }
function fmtInt(n) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function cssId(s) { return btoa(unescape(encodeURIComponent(s))).replace(/[^a-zA-Z0-9]/g, ''); }
function cssAttr(s) { return String(s).replace(/"/g, '\\"'); }

let toastTimer = null;
function toast(msg) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 1800);
}

init();
