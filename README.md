# 气闸孤注：γ-7 · AIRLOCK ANTE: GAMMA-7

《气闸孤注：γ-7》是一个原创的赛博朋克 1v1 对决游戏：在实弹与空包组成的弹仓前选择瞄准自己或对手。它提供 Three.js 体素风 3D 前端、单人 AI 对局，以及由服务器裁决的 WebSocket 联机模式。

本仓库的当前主项目是**《气闸孤注：γ-7》**；保留的「侠盗猎码」文件属于历史项目，不在当前维护或本次开源发布范围内。

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

默认测试覆盖《气闸孤注：γ-7》规则、真实双客户端 WebSocket 流程，以及通用房间/WebSocket 传输层。完整执行历史项目的测试可运行：

```bash
npm run test:all
```

## 部署

- 静态前端可部署到 GitHub Pages、Netlify 等静态站点；《气闸孤注：γ-7》的资源与模块使用相对路径，兼容 GitHub Pages 的项目子路径。
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

## 开源与贡献

《气闸孤注：γ-7》的原创代码和文档采用 [MIT 许可证](LICENSE) 开源；适用范围以许可证顶部的说明为准。
仓库内随附的 Three.js 文件继续遵循其原始 MIT 许可证，详情见
[第三方组件声明](THIRD_PARTY_NOTICES.md)。

欢迎提交问题和改进。开始前请阅读 [贡献指南](CONTRIBUTING.md)；安全问题请按
[安全策略](SECURITY.md) 私下报告。

## 历史项目

仓库中的 `index.html`、`css/style.css`、`js/editor.js`、`js/game.js`、`js/i18n.js`、`js/interp/`、
`js/levels.js` 和 `tests/` 属于保留的「侠盗猎码」历史项目。它们不会随《气闸孤注：γ-7》迭代而修改，
也不因本次发布而获得新的许可；其回归测试仅在 `npm run test:legacy` 或 `npm run test:all` 中运行。
