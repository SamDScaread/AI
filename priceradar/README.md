# 比价雷达 · PriceRadar

> 全网聚合同一件商品在**各平台、各店铺**的所有在售信息，折算到统一货币与单位，
> 按**价格、性价比、质量口碑、卫生资质、成分用料、营养价值、包装品质、物流邮寄、
> 店铺信誉**九大维度综合打分，为你直接选出**在哪个平台的哪个店铺能买到最优的那一件**。
>
> Aggregate the same product across many e-commerce platforms & shops, normalize to one
> currency/unit, score on 9 weighted dimensions, and recommend exactly **which shop on
> which platform** is the best buy.

这是一个 **MVP（最小可用产品）**：整条产品链路（聚合 → 同款归并 → 多维打分 → 推荐）
已经完整跑通，前端可交互。数据层做成**可插拔**：默认用一套结构真实的**演示数据源**驱动，
让你立刻看到成品；当你为某个平台配置好真实抓取 / 联盟开放 API 后，它会自动切换为实时数据。

**已具备的进阶能力**：条形码 + 营养成分表、实时汇率（缓存+离线回退）、30 天价格走势曲线、
收藏夹与到价提醒、**PWA（可安装为手机/桌面 App、离线可用）**，以及一个**免 key 的真实数据源
（Open Food Facts）** 作为接入真实数据的可运行范例。

---

## 🎯 它解决什么

同一件想买的东西，不同厂家、不同平台、不同店铺的价格、质量、卫生条件、包装、邮寄、
营养、含量、原料、工艺都不一样，人工逐个比太累。PriceRadar 替你：

1. **全网聚合** —— 把各平台卖的同款收集到一起。
2. **同款归并** —— 不同标题/写法/语言/规格也能识别为同一件商品（中文无空格标题、营销词、
   中英文混排都能处理；有条形码时跨语言精确归并）。
3. **统一比价** —— 中外平台价格统一折算人民币，不同规格折算成「每基准单位价格」，公平可比。
4. **多维打分** —— 九个维度各自归一化后按你的偏好加权，给出可解释的综合分。
5. **一眼选最优** —— 高亮「全网最优推荐」，并给出推荐理由；每款产品再列出全网各店铺明细，
   告诉你该款在**哪个平台哪个店**下单最划算。

## 🚀 运行 / Run

零依赖即可启动（核心与后端不依赖任何 npm 包）：

```bash
cd priceradar
npm start            # → http://localhost:8090
# 或 / or
node server.mjs
PORT=3000 node server.mjs
```

浏览器打开后，搜「每日坚果 / 婴儿奶粉 / 维生素C / 蓝牙耳机 / 护肤精华」等任意商品即可。
左侧拖动偏好滑块（或选「省钱 / 品质优先 / 健康成分」预设），推荐会实时重排。展开任意产品可看
**条形码 / 配料 / 营养成分表 / 近 30 天价格走势**；可**收藏**、设**到价提醒**、最多 4 件**并排对比**。

可选环境变量：

```bash
PR_OFF=1 npm start   # 启用真实数据源 Open Food Facts（食品类，免 key；失败自动回退演示数据）
PR_NO_FX=1 npm start # 离线/受限网络：关闭启动时的实时汇率拉取（用静态汇率，功能不受影响）
```

**装成 App**：用 Chrome/Edge 打开后点地址栏的「安装」图标，或页脚「📲 安装到桌面 / 手机」；
iOS Safari「添加到主屏幕」。安装后离线也能打开（仅实时比价需要联网）。

## 🧪 测试 / Tests

核心逻辑**零依赖**，随时可跑（共 53 项）：

```bash
npm test  # 汇率/打分/归并/管线 + 特性(条形码·营养·汇率·历史) + OFF 真实源 + HTTP 接口
```

前端冒烟测试用 jsdom 驱动真实页面（需先 `npm install`，7 项）：

```bash
npm run test:frontend   # 加载页面 → 桩掉接口 → 搜索/展开/走势/收藏/对比 全流程校验
npm run test:all        # 全部 60 项
```

## 🏗️ 架构 / Architecture

```
priceradar/
├── server.mjs              零依赖后端：/api/compare、/api/history、/api/health + 托管前端
├── src/
│   ├── model.mjs           统一商品模型、平台/维度/默认权重等常量
│   ├── currency.mjs        汇率折算 + 单位归一化 + 实时汇率(缓存/离线回退)
│   ├── normalize.mjs       原始数据 → 标准模型；生成同款归并键
│   ├── match.mjs           同款归并（拉丁词 + 中文 bigram 相似度 + 条形码）
│   ├── score.mjs           九维打分引擎（min-max 归一化 + 加权 + 缺失值中性处理）
│   ├── history.mjs         价格历史：快照持久化 + 按 key 合成基线
│   ├── aggregate.mjs       编排：取数→归一化→归并→打分→组装推荐
│   └── sources/
│       ├── base.mjs        数据源基类：限速、重试、随机 UA、并发节流
│       ├── demo.mjs        离线演示数据源（按品类即时合成拟真数据，默认启用）
│       ├── openfoodfacts.mjs 真实数据源（免 key）：真实商品资料 + 模拟价（PR_OFF=1）
│       ├── taobao.mjs      淘宝/天猫 适配器骨架（联盟 API / H5 解析接入位）
│       ├── amazon.mjs      Amazon 适配器骨架（PA-API 5.0 接入位）
│       └── index.mjs       数据源注册表：并发取数 + 实时源失败自动回退演示源
├── public/                 前端（零构建 SPA + PWA）
│   ├── index.html  css/style.css
│   ├── js/{app,api,radar,store,pwa}.mjs
│   ├── manifest.webmanifest  sw.js  icons/   PWA 清单 / Service Worker / 图标
├── scripts/gen-icons.mjs   纯 Node+zlib 生成雷达主题 PNG 图标
└── tests/                  汇率/打分/归并/管线/特性/OFF/HTTP/前端 测试
```

数据流：`搜索词 → 各数据源取数 → normalize → groupProducts(同款归并) → scoreListings(九维打分) → 组装为产品+店铺明细 → 前端渲染推荐`。

## 📊 打分维度与权重

| 维度 | 说明 | 方向 |
|---|---|---|
| 价格 | 到手价（商品价+运费，已折人民币） | 越低越好 |
| 性价比 | 质量信号 ÷ 单位价格 | 越高越好 |
| 质量口碑 | 评分 × 评价/销量（log 抑制刷量） | 越高越好 |
| 卫生资质 | SC/有机/HACCP/FDA/USDA 等认证强度 | 越高越好 |
| 成分用料 | 主料含量 + 配料表干净程度（惩罚添加剂） | 越高越好 |
| 营养价值 | 营养密度/功效（适用品类） | 越高越好 |
| 包装品质 | 材质/密封/避光/环保 | 越高越好 |
| 物流邮寄 | 运费 + 时效 + 破损率综合 | 越高越好 |
| 店铺信誉 | 店铺评分 × 店铺类型可信度 | 越高越好 |

每个维度先在候选集合内做 min-max 归一化到 0~100，再按权重加权求和。**权重可由用户调节**，
所以同一批商品在「省钱党」和「品质党」眼里会排出不同的最优解。缺失数据的维度给中性分，
不偏袒也不惩罚。

## 🔌 接入真实数据（从演示 → 实时）

> ⚠️ **合规第一**：抓取前请遵守目标平台 `robots.txt` 与服务条款，控制频率，优先使用
> **官方/联盟开放 API**（合法、稳定、自带返佣链接）。大规模抓取在多数电商平台违反 ToS，
> 且需要住宅代理池、登录态与反爬对抗，长期不稳定。

**已内置的可运行真实范例：Open Food Facts**（`src/sources/openfoodfacts.mjs`，免 key、ODbL
开放数据）。`PR_OFF=1` 启用后，会真实联网拉取食品类商品的**条形码、品牌、配料、营养
(Nutri-Score)、包装、认证标签**，直接喂给成分/营养/卫生维度；由于 OFF 不含售价，价格部分
为**模拟**并在界面标注（接入下方电商联盟 API 后替换为真实价）。这条范例打通了「实时取数 →
解析 → 归一化 → 归并 → 打分」的真实链路。

1. **推荐路径（联盟/官方 API）**
   - 淘宝/天猫：开通**淘宝联盟（淘宝客）**，在 `src/sources/taobao.mjs` 的 `searchViaAffiliate()`
     里实现 TOP 网关签名与解析；凭证经 `TAOBAO_APP_KEY/SECRET` 环境变量注入。
   - 京东：京东联盟 API；拼多多：多多进宝 API；同理各建一个 `SourceAdapter` 子类。
   - Amazon：开通 **Associate** 并申请 **PA-API 5.0**，在 `src/sources/amazon.mjs` 的
     `searchViaPAAPI()` 里实现 AWS V4 签名与解析；凭证经 `AMAZON_ACCESS_KEY/SECRET/PARTNER_TAG`。
   - eBay：Browse/Finding API；Walmart / AliExpress：各自开放平台。
2. **研究用路径（H5 解析）**：`base.mjs` 已提供 `fetchHtml/fetchWithRetry/throttle/randomUA`；
   在子类里解析页面内嵌 JSON 即可。请务必低频、合规。
3. 在 `src/sources/index.mjs` 的 `LIVE_ADAPTERS` 注册你的适配器。**未配置凭证的适配器会被
   安全跳过**，演示源兜底，保证 App 始终可用；一旦某平台返回真实数据，就自动用真实数据。

每个适配器只需把平台原始字段映射成 `mapItem()` 里那套「半成品」字段，`normalize.mjs`
会负责折汇率、算单位价、生成归并键，后续打分排序全自动。

## 🗺️ 路线图 / Roadmap

- [x] 接入第一个真实数据源（Open Food Facts，免 key 范例；`PR_OFF=1`）
- [x] 条形码（GTIN/UPC）+ 营养成分表，提升跨平台归并与成分/营养维度
- [x] 实时汇率 API + 缓存 + 离线回退（`currency.refreshRates`）
- [x] 历史价格曲线、到价提醒、收藏夹
- [x] 封装为 PWA（可安装、离线可用）
- [ ] 接入电商**联盟 API**获取真实售价（淘宝客 / 京东联盟 / PA-API）→ 替换模拟价
- [ ] 用户账号与个性化偏好云同步；上架原生手机 App

## ⚖️ 声明

当前结果由**演示数据**生成，仅用于展示产品形态与算法；接入真实数据源后方为实时全网比价。
请在合法合规前提下使用，遵守各电商平台服务条款与所在地区法律法规。

许可证：MIT
