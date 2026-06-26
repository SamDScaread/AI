# 对手 3D 模型放这里

把模型文件命名为 **`opponent.glb`** 放进本目录（`assets/models/opponent.glb`），
然后在 `js/deepspace-3d.mjs` 顶部把 `MODEL.enabled` 改成 `true`，刷新游戏即会替换掉占位的几何体小人。
（默认 `enabled: false`，这样在你还没放模型前不会有多余的网络报错，游戏照常用内置几何体角色。）

## 模型要求
- **格式**：`.glb`（二进制 glTF，单文件、内嵌贴图最省事）。
- **不要用压缩扩展**：若导出时启用了 **Draco / Meshopt / KTX2** 压缩，本加载器会解析失败并回退到占位角色——请用**未压缩**的 `.glb` 重新导出。
- **朝向**：模型应**面朝 +Z（朝向镜头）**。若它背对/侧对镜头，在 `js/deepspace-3d.mjs` 顶部的 `MODEL.rotY` 里改朝向（例如 `Math.PI` 翻转 180°）。
- **大小/位置**：加载时会**自动缩放**到约 3.4 单位高、双脚落地、水平居中。需要微调就改 `MODEL.scaleMul`（整体放大系数）和 `MODEL.yOffset`（上下偏移）。
- **动画（可选）**：若模型自带动画（如 idle 待机），会自动播放第一条。

## 版权提醒
只使用你**有权使用**的模型：自己/朋友制作的、或 CC0 / CC-BY（署名）等开放协议的。
可考虑来源：Sketchfab（筛选 Downloadable + 许可协议）、Quaternius、Ready Player Me、VRoid Studio（导出 glb）。
**请勿**直接使用《赛博朋克 2077》等游戏的角色模型——那是受版权保护的素材。

## 微调参数（`js/deepspace-3d.mjs` 顶部）
```js
const MODEL = { opponent: '/assets/models/opponent.glb', targetH: 3.4, scaleMul: 1, yOffset: 0, rotY: 0 };
```
