// 联机消息协议 / Wire protocol.
// 这些常量同时被服务器(Node) 和浏览器客户端 import。
// serve.mjs 会把 .mjs 当作 JS 静态文件返回，所以浏览器可以直接 `import` 它。
//
// These message-type constants are shared by both the Node server and the
// browser client, so the two never drift out of sync.

// 客户端 -> 服务器 / Client -> Server
export const C2S = {
  CREATE: 'create', // {name}            建房并成为房主 / create a room, become host
  JOIN:   'join',   // {room, name}      加入已有房间 / join an existing room
  READY:  'ready',  // {ready:Boolean}   大厅里切换准备状态 / toggle ready in the lobby
  START:  'start',  // {}                房主开始对局 / host starts the match
  REMATCH:'rematch',// {ready:Boolean}   对局结束后确认同房再战 / confirm a rematch
  ACTION: 'action', // {action:{...}}    一次游戏操作 / a game move
  LEAVE:  'leave',  // {}                离开房间 / leave the room
  PING:   'ping',   // {}                心跳 / heartbeat
};

// 服务器 -> 客户端 / Server -> Client
export const S2C = {
  JOINED: 'joined', // {room, playerId}                  入房成功，分配到的身份
  LOBBY:  'lobby',  // {room, phase, players:[...]}      大厅状态（每次有人变动就广播）
  STATE:  'state',  // {view}                            该玩家视角下的游戏状态
  EVENT:  'event',  // {event:{...}}                     一次性事件（用于动画/信息流）
  OVER:   'over',   // {winnerId, view}                  对局结束
  REMATCH:'rematch',// {room, players:[{id,rematch}]}    同房再战确认状态
  ERROR:  'error',  // {code, message}                   操作被拒绝的原因
  PONG:   'pong',   // {}                                心跳回应
};

// 房间所处阶段 / Room phases.
export const PHASE = { LOBBY: 'lobby', PLAYING: 'playing', OVER: 'over' };
