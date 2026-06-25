# 多人联机服务器骨架 / Multiplayer Server Skeleton

一个**零依赖**的实时多人游戏后端（手写 WebSocket，无需 `npm install`）。
服务器是"裁判"：游戏真实状态只在服务器上，客户端只发送操作意图——天然防作弊。

## 跑起来 / Run

```bash
# 1) 启动游戏服务器（默认 :3001）
cd server
npm start                 # = node server.mjs

# 2) 另开一个终端，启动静态页面服务器（默认 :8080）
cd ..
npm start                 # = node serve.mjs

# 3) 浏览器打开两个标签页，验证联机：
#    http://localhost:8080/multiplayer.html
#    一个标签「建房」拿到房间码，另一个标签用该码「加入」，准备 → 开始。
```

## 测试 / Test

```bash
cd server
npm test          # 房间/引擎/玩法单元测试 + 真实 socket 的 WebSocket 冒烟测试
```

## 目录 / Layout

```
shared/protocol.mjs     前后端共用的消息类型常量（避免两边写法跑偏）
server/
  server.mjs            入口；换玩法只改 import 的那一行
  lib/ws.mjs            手写 WebSocket 服务器（握手 + 帧编解码 + 心跳）
  lib/rooms.mjs         房间与玩家管理（建房/加入/房主继承），不碰 socket
  lib/engine.mjs        把网络消息翻译成对房间/玩法的操作
  games/nim.mjs         示例玩法（取石子），实现下面的"玩法契约"
  test/                 单元测试 + WebSocket 冒烟测试
js/net/client.mjs       浏览器端联网层（连接/重发队列/心跳/事件回调）
multiplayer.html        最小 Demo 界面（大厅 + 游戏台）
```

## 玩法契约 / Game-module contract

要换成真正的游戏，只需新写一个 `games/xxx.mjs`，导出下面四个函数，然后把
`server.mjs` 里 `import game from './games/nim.mjs'` 改成你的模块——`lib/` 一行都不用动。

```js
export default {
  id, name, minPlayers, maxPlayers,
  createInitialState(players)            // -> 服务器私有的真实状态
  applyAction(state, playerId, action)   // -> { state, events }; 非法时 throw {code,message}
  viewFor(state, playerId)               // -> 该玩家能看到的视图（隐藏别人的秘密信息）
  result(state)                          // -> { over:Boolean, winnerId? }
};
```

> `viewFor` 是做"隐藏信息"类游戏（比如弹仓顺序只有服务器知道）的关键：每个玩家
> 只会收到自己视角下的状态，前端拿不到不该看到的数据，也就无从作弊。

## 免费部署 / Free hosting

前端（静态文件）继续放 **GitHub Pages**；服务器找一个支持 WebSocket 的免费平台：

- **Render** / **Railway** / **Fly.io** 均有免费额度，部署一个长驻 Node 进程即可。
- 平台会通过环境变量 `PORT` 指定端口（本服务器已读取），并定期访问 `/healthz` 健康检查。
- 部署后把 `multiplayer.html` 里的服务器地址改成 `wss://你的域名`（HTTPS 页面必须用 `wss://`）。

> 注意：免费额度的实例常会在闲置后休眠，首次连接可能要等几秒唤醒——做个 demo 完全够用。
