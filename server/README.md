# 深空轮盘联机服务器

这是深空轮盘的权威 WebSocket 服务器。服务器保存真实游戏状态，并按玩家视角下发经过裁剪的状态，因此客户端永远拿不到弹序或随机状态。

## 运行

从仓库根目录启动：

```bash
npm run start:server
```

服务器默认监听 `3001`，也会读取部署平台提供的 `PORT`。健康检查地址为：

```text
GET /healthz  ->  ok
```

前端另行在仓库根目录运行 `npm start`，然后打开 `http://localhost:8080/deepspace.html`。本地联机地址为 `ws://localhost:3001`；部署在 HTTPS 页面时使用 `wss://`。

## 测试

从仓库根目录运行：

```bash
npm test
```

其中包括：

- 深空轮盘规则引擎测试；
- 两个真实 TCP/WebSocket 客户端的建房、加入、准备、开局与行动流程；
- 对局结束后双方确认、同房自动再战的状态重置流程；
- 房间/消息引擎测试；
- WebSocket 握手与帧收发冒烟测试。

## 结构

```text
server.mjs                 深空轮盘服务器入口
games/deepspace.mjs        深空轮盘规则模块
lib/ws.mjs                 最小 WebSocket 传输层
lib/rooms.mjs              房间和玩家管理
lib/engine.mjs             协议消息到游戏操作的编排
test/                      规则、房间、WebSocket 与集成测试
```

`games/nim.mjs` 和 `multiplayer.html` 是早期通用联机示例，会保留但不属于深空轮盘的运行路径。
