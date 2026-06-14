// 比价雷达 · PriceRadar — 前端主逻辑
import { fetchCompare, DIMENSIONS, PRESETS } from './api.mjs';
import { drawRadar, RADAR_COLORS } from './radar.mjs';

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
}

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
  // 画维度条已用 HTML，无需 canvas
}

function productCard(p, idx, result) {
  const best = p.best;
  const certs = (best.attributes.certifications || []).slice(0, 3);
  const dims = result.dimensions;
  const expanded = state.expanded.has(p.key);
  const checked = state.compare.has(p.key) ? 'checked' : '';
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
      <button class="btn" data-toggle="${esc(p.key)}">${expanded ? '收起' : `查看全部 ${p.offerCount} 个店铺`}</button>
      <label class="cmp-check"><input type="checkbox" data-cmp="${esc(p.key)}" ${checked}/> 加入对比</label>
    </div>
    <div class="offers ${expanded ? '' : 'hidden'}" id="offers_${cssId(p.key)}">${offersTable(p)}</div>
  </div>`;
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
    if (btn) btn.textContent = `查看全部 ${product.offerCount} 个店铺`;
  } else {
    state.expanded.add(key); el.classList.remove('hidden');
    if (btn) btn.textContent = '收起';
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
