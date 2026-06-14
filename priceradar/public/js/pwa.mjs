// 比价雷达 · PriceRadar — PWA：注册 Service Worker + “安装到桌面”引导
export function initPWA() {
  // 注册 Service Worker（离线可用）。环境不支持时安全跳过。
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  } catch { /* 忽略 */ }

  // 自定义“安装 App”按钮（Chrome/Edge/Android 支持 beforeinstallprompt）
  let deferred = null;
  const btn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (btn) btn.classList.remove('hidden');
  });
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      try { await deferred.userChoice; } catch { /* 忽略 */ }
      deferred = null;
      btn.classList.add('hidden');
    });
  }
  window.addEventListener('appinstalled', () => { if (btn) btn.classList.add('hidden'); });
}
