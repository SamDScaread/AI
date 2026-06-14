// 比价雷达 · PriceRadar — 零依赖后端服务器 / Zero-dependency server
//
// 提供两件事：
//   1) GET /api/compare?q=...&weights=...  → 返回聚合比价结果（JSON）
//   2) 托管 public/ 下的前端静态资源
//
// 用法 / usage:
//   node server.mjs            # → http://localhost:8090
//   PORT=3000 node server.mjs

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { compare } from './src/aggregate.mjs';
import { DEFAULT_WEIGHTS, DIMENSION_KEYS } from './src/model.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, 'public');
const PORT = process.env.PORT || 8090;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/compare') return await handleCompare(url, res);
    if (url.pathname === '/api/health') return sendJSON(res, 200, { ok: true, defaults: DEFAULT_WEIGHTS });
    return await serveStatic(url.pathname, res);
  } catch (err) {
    sendJSON(res, 500, { error: String(err.message || err) });
  }
});

async function handleCompare(url, res) {
  const q = url.searchParams.get('q') || '';
  const limit = Number(url.searchParams.get('limit')) || 30;
  const live = url.searchParams.get('live') === '1';
  const weights = parseWeights(url.searchParams.get('weights'));
  const result = await compare(q, { weights, limit, live });
  sendJSON(res, 200, result);
}

// weights 支持两种写法：JSON 串，或 "price:8,quality:7" 形式。
function parseWeights(raw) {
  if (!raw) return null;
  try {
    if (raw.trim().startsWith('{')) return JSON.parse(raw);
  } catch { /* fallthrough */ }
  const out = {};
  for (const part of raw.split(',')) {
    const [k, v] = part.split(':');
    if (DIMENSION_KEYS.includes(k?.trim())) out[k.trim()] = Number(v);
  }
  return Object.keys(out).length ? out : null;
}

async function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = normalize(join(PUBLIC, rel));
  if (!filePath.startsWith(PUBLIC)) return sendText(res, 403, 'Forbidden');
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) return serveStatic(rel + '/index.html', res);
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendText(res, 404, 'Not Found');
  }
}

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function sendText(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

server.listen(PORT, () => {
  console.log(`比价雷达 · PriceRadar → http://localhost:${PORT}`);
});

export { server };
