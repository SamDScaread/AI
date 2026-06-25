// 游戏服务器入口 / Entry point.
// 本地运行：  node server.mjs        (或 npm start)
// 监听端口取自环境变量 PORT —— 免费托管平台(Render/Railway/Fly) 会自动注入。
import { createWsServer } from './lib/ws.mjs';
import { RoomManager } from './lib/rooms.mjs';
import { attach } from './lib/engine.mjs';
import game from './games/deepspace.mjs'; // ← 换玩法时只改这一行

const PORT = process.env.PORT || 3001;
const manager = new RoomManager(game);

const server = createWsServer({ onConnection: (conn) => attach(manager, conn) });
server.listen(PORT, () => {
  console.log(`🎮 游戏服务器已启动 / Game server (${game.name}) listening on :${PORT}`);
});
