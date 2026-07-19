# 深空轮盘 · Deep-Space Standoff

深空轮盘是一个原创的赛博朋克 1v1 对决游戏：在实弹与空包组成的弹仓前选择瞄准自己或对手。它提供 Three.js 体素风 3D 前端、单人 AI 对局，以及由服务器裁决的 WebSocket 联机模式。

本仓库的当前主项目是**深空轮盘**；保留的「侠盗猎码」文件属于历史项目，不在当前维护范围内。

## 玩法

- 三局两胜，双方初始生命按 4 → 3 → 2 递减。
- 实弹会随每次装填递增，弹序始终由规则引擎/服务器保密。
- 扫描仪、过载芯、退弹器、磁锁、香烟与相位护盾会随对局阶段开放；相位护盾仅在决胜局与怜悯局掉落。
- 胜者可选择进入「怜悯决战」：再胜得双倍奖励，翻车则受到双倍惩罚。
- 单人模式使用本地规则引擎；联机模式使用权威服务器，每名玩家只收到自己的视图。
- 3D 单人练习提供训练、标准、猎杀三档 AI；所有档位都只读取公开视图，不会窥视隐藏弹序。
- 联机结算后，双方确认即可在原房间自动再战，无需重新建房或交换房号。

## 本地运行

前端和联机服务器是两个进程。先安装用于测试的开发依赖：

```bash
npm install
```

终端一：启动静态前端服务器。

```bash
npm start
# http://localhost:8080/deepspace.html
```

终端二：启动权威 WebSocket 服务器。

```bash
npm run start:server
# ws://localhost:3001
```

在游戏主菜单选择「联机模式」，两名玩家填入同一服务器地址；一人建房、另一人用房号加入并准备后，由房主开始对局。

`deepspace-flat.html` 是不依赖 3D 场景的低配单人版本。当前尚未承诺具体浏览器/设备支持范围；联机与 3D 模式应优先在支持 WebGL 的现代桌面浏览器验证。

## 验证

```bash
npm test
```

默认测试覆盖深空轮盘规则、真实双客户端 WebSocket 流程，以及通用房间/WebSocket 传输层。完整执行历史项目的测试可运行：

```bash
npm run test:all
```

## 部署

- 静态前端可部署到 GitHub Pages、Netlify 等静态站点；深空轮盘的资源与模块使用相对路径，兼容 GitHub Pages 的项目子路径。
- WebSocket 服务器可部署到 Render、Railway、Fly.io 或自有 Node 主机，启动命令为 `node server/server.mjs`，健康检查地址为 `/healthz`。
- HTTPS 页面必须连接 `wss://` 服务端。联机界面会在 HTTPS 页面中默认使用 `wss://`，但部署到独立域名时仍需填写正确的服务器地址。

详细步骤见 [联机部署指南](docs/联机部署指南.md)。

## 结构

```text
deepspace.html              3D 主入口
deepspace-flat.html         低配单人入口
js/deepspace-3d.mjs         3D 场景、HUD、单人/联机渲染
js/deepspace-online.mjs     联机大厅
server/games/deepspace.mjs  纯规则引擎与玩家视图裁剪
server/lib/                 WebSocket、房间与消息引擎
server/test/                规则、传输层与双客户端集成测试
docs/                       游戏设计与部署说明
```

## 历史项目

仓库中的 `index.html`、`js/interp/`、`js/levels.js`、`tests/` 等「侠盗猎码」文件会继续保留，但不会随深空轮盘迭代而修改；其回归测试仅在 `npm run test:legacy` 或 `npm run test:all` 中运行。
