// 比价雷达 · PriceRadar — 前端 API 封装
export async function fetchCompare(query, weights) {
  const params = new URLSearchParams({ q: query });
  if (weights) {
    params.set('weights', Object.entries(weights).map(([k, v]) => `${k}:${v}`).join(','));
  }
  const res = await fetch(`/api/compare?${params.toString()}`);
  if (!res.ok) throw new Error(`请求失败 HTTP ${res.status}`);
  return res.json();
}

// 维度元数据（与后端 model.mjs 保持一致，用于初始化滑块与展示）
export const DIMENSIONS = [
  { key: 'price', label: '价格', def: 8 },
  { key: 'value', label: '性价比', def: 7 },
  { key: 'quality', label: '质量口碑', def: 7 },
  { key: 'hygiene', label: '卫生资质', def: 5 },
  { key: 'ingredients', label: '成分用料', def: 5 },
  { key: 'nutrition', label: '营养价值', def: 4 },
  { key: 'packaging', label: '包装品质', def: 3 },
  { key: 'shipping', label: '物流邮寄', def: 4 },
  { key: 'reputation', label: '店铺信誉', def: 6 },
];

export const PRESETS = {
  balanced: { price: 8, value: 7, quality: 7, hygiene: 5, ingredients: 5, nutrition: 4, packaging: 3, shipping: 4, reputation: 6 },
  thrifty:  { price: 10, value: 9, quality: 4, hygiene: 3, ingredients: 3, nutrition: 2, packaging: 1, shipping: 6, reputation: 4 },
  quality:  { price: 4, value: 5, quality: 10, hygiene: 7, ingredients: 6, nutrition: 5, packaging: 5, shipping: 3, reputation: 9 },
  health:   { price: 5, value: 5, quality: 6, hygiene: 10, ingredients: 10, nutrition: 9, packaging: 6, shipping: 2, reputation: 6 },
};
