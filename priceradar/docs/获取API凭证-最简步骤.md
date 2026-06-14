# 获取电商 API 凭证 · 最简步骤

> 目标：拿到 key 后填进环境变量，PriceRadar 就用真实数据。**先做"准备"，再挑一个平台照做即可。**

## 准备（只做一次）
1. 准备一个**实名账号**（绑支付宝/实名）。
2. 准备一个**推广位媒体**——三选一，**推荐公众号或社媒（免备案、最快）**：
   - 公众号 / 抖音 / 小红书 账号，或
   - 一个网站/App（可直接用部署上线的 PriceRadar 充当）。

---

## 京东联盟（最易，建议首选）
1. 打开 **union.jd.com** → 用京东账号登录 → 完成实名。
2. 顶部「推广管理」→ 按你的媒体类型建：网站 / APP / 社交媒体 → 提交审核（1–3 天）。
3. 审核通过 → 进入应用/推广位详情 → 复制 **appkey** 和 **secretkey**。
4. 填环境变量：
   ```bash
   export JD_APP_KEY=你的appkey
   export JD_SECRET_KEY=你的secretkey
   export JD_SITE_ID=你的推广位ID   # 可选，用于返佣
   ```
   > 若调用提示无权限：发邮件到 `cps-qxsq@jd.com` 申请开通对应接口。

## 拼多多 · 多多进宝
1. 打开 **jinbao.pinduoduo.com** → 登录 → **实名认证**。
2. 申请「多多客联盟」资质 → 审核通过。
3. 进「开发者中心 / 应用管理」→ 复制 **client_id** 和 **client_secret**；再到「推广位」建一个，得到 **PID**。
4. 填环境变量：
   ```bash
   export PDD_CLIENT_ID=你的client_id
   export PDD_CLIENT_SECRET=你的client_secret
   export PDD_PID=你的PID            # 可选
   ```

## 淘宝联盟（阿里妈妈）
1. 打开 **pub.alimama.com** → 用淘宝账号登录 → 成为淘宝客。
2. 「媒体管理」→ 做**媒体备案**（网站/App/其它）→ 审核通过。
3. 进「淘宝联盟开放平台」→「新建应用」（选你刚备案的媒体）→ 复制 **appkey / appsecret**。
   > 基础接口可自助申请；高级选品接口是**邀约制**（需一定推广量）。
4. 填环境变量：
   ```bash
   export TAOBAO_APP_KEY=你的appkey
   export TAOBAO_APP_SECRET=你的appsecret
   ```

## Amazon（新版 Creators API，门槛最高）
> 旧的 PA-API 已停用，必须用 Creators API。需**已通过审核的 Amazon Associates 账号**。
1. 打开 **affiliate-program.amazon.com** → 申请 Associates 并通过审核。
2. 进 **Associates Central → Tools → Creators API** → 创建凭证，得到 **Client ID / Client Secret**；记下你的 **Partner Tag**（associate tag，形如 `yourtag-20`）。
3. 填环境变量：
   ```bash
   export AMAZON_CLIENT_ID=你的client_id
   export AMAZON_CLIENT_SECRET=你的client_secret
   export AMAZON_PARTNER_TAG=yourtag-20
   ```

## eBay（技术上最快拿到 key，可先拿来跑通）
1. 打开 **developer.ebay.com** → 注册开发者账号（免费）。
2. 「Application Keys」→ Production 下「Create a keyset」→ 拿到 App ID 等；用 Browse API 上生产前需过一次 **Application Growth Check** 审核。

---

## 拿到 key 之后
1. 把上面对应的 `export ...` 写进你的 shell 或 `.env`。
2. 启动：`cd priceradar && npm start`（接了哪个平台，哪个就走真实数据；其余自动回退演示数据）。
3. 把 key 发我（**别贴在公开仓库/PR**），我把对应适配器的字段解析按你账号返回的真实结构最终校准。

> 各平台适配器骨架（含签名/鉴权）已就位：`src/sources/{jd,pinduoduo,taobao,amazon}.mjs`。
