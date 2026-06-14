// 比价雷达 · PriceRadar — 数据源适配器基类 / Source adapter base
//
// 每个电商平台对应一个 SourceAdapter 子类，统一实现 search(query, opts)，
// 返回“半成品”原始记录数组（之后交给 normalize.mjs 归一化）。
// 这里提供真实抓取需要的公共能力：限速、并发节流、指数退避重试、随机 UA、
// 简单的 HTML 取数。真正接入实时数据时，在子类的 search() 里用 fetchHtml/
// fetchJSON 抓取并解析即可。
//
// 合规提醒：抓取前请遵守目标站点的 robots.txt 与服务条款，控制频率，
// 必要时使用官方/联盟开放 API 与代理池。本基类默认保守限速。

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
];

export class SourceAdapter {
  /**
   * @param {object} cfg
   * @param {string} cfg.platform PLATFORMS 中的键
   * @param {number} [cfg.minIntervalMs] 同一适配器两次请求最小间隔（限速）
   * @param {boolean} [cfg.enabled]
   */
  constructor(cfg) {
    this.platform = cfg.platform;
    this.minIntervalMs = cfg.minIntervalMs ?? 1200;
    this.enabled = cfg.enabled ?? true;
    this._lastReq = 0;
  }

  /** 子类必须实现：返回原始记录数组。 */
  async search(_query, _opts = {}) {
    throw new Error(`${this.platform}: search() 未实现 / not implemented`);
  }

  randomUA() {
    return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
  }

  // 简单令牌间隔限速：保证两次请求间隔不小于 minIntervalMs。
  async throttle() {
    const wait = this._lastReq + this.minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    this._lastReq = Date.now();
  }

  /** 带指数退避重试的 fetch（网络抖动友好）。 */
  async fetchWithRetry(url, opts = {}, retries = 3) {
    await this.throttle();
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12000);
        const res = await fetch(url, {
          ...opts,
          signal: ctrl.signal,
          headers: { 'User-Agent': this.randomUA(), 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8', ...(opts.headers || {}) },
        });
        clearTimeout(t);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        lastErr = err;
        if (attempt < retries) await sleep(2 ** attempt * 1000);
      }
    }
    throw lastErr;
  }

  async fetchHtml(url, opts) {
    const res = await this.fetchWithRetry(url, opts);
    return res.text();
  }

  async fetchJSON(url, opts) {
    const res = await this.fetchWithRetry(url, opts);
    return res.json();
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 并发执行带上限的 map，避免一次性打爆所有数据源。 */
export async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}
