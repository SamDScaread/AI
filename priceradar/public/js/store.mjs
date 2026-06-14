// 比价雷达 · PriceRadar — 本地存储：收藏夹 + 到价提醒（localStorage，无需后端账号）
const FAV_KEY = 'pr_favorites_v1';
const ALERT_KEY = 'pr_alerts_v1';

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function write(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch { /* 隐私模式等：忽略 */ }
}

// ---- 收藏夹 ----
export function getFavorites() { return read(FAV_KEY); }
export function isFav(key) { return !!read(FAV_KEY)[key]; }
export function toggleFav(product) {
  const db = read(FAV_KEY);
  if (db[product.key]) { delete db[product.key]; write(FAV_KEY, db); return false; }
  db[product.key] = {
    key: product.key, title: product.title, brand: product.brand,
    bestPlatform: product.best.platformName, bestShop: product.best.shopName,
    savedPrice: +(product.priceRange.minCNY), savedAt: Date.now(),
  };
  write(FAV_KEY, db);
  return true;
}
export function favCount() { return Object.keys(read(FAV_KEY)).length; }

// ---- 到价提醒 ----
export function getAlerts() { return read(ALERT_KEY); }
export function getAlert(key) { return read(ALERT_KEY)[key] || null; }
export function setAlert(key, target, title) {
  const db = read(ALERT_KEY);
  if (target == null || isNaN(target)) delete db[key];
  else db[key] = { key, target: +target, title };
  write(ALERT_KEY, db);
}
export function clearAlert(key) {
  const db = read(ALERT_KEY); delete db[key]; write(ALERT_KEY, db);
}
