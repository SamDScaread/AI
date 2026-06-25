// 浏览器端联网层 / Browser-side networking layer.
// 用法 / Usage:
//   import { GameClient } from '/js/net/client.mjs';
//   const c = new GameClient('ws://localhost:3001');
//   c.on('lobby', (m) => render(m)).on('error', (m) => alert(m.message));
//   await c.connect();
//   c.create('我的名字');           // 或 c.join('ABCD', '我的名字')
//   c.ready(true); c.start(); c.action({ take: 2 });
import { C2S, S2C } from '/shared/protocol.mjs';

export class GameClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = {};      // type -> [fn]
    this.playerId = null;    // 入房后服务器分配的身份
    this.room = null;        // 房间码
    this._queue = [];        // 连接就绪前的待发消息
    this._hb = null;         // 心跳定时器
  }

  // 注册回调。type 可以是 S2C.* 之一，或 '*'(收到任何消息)、'disconnected'。
  on(type, fn) { (this.handlers[type] ||= []).push(fn); return this; }
  _emit(type, msg) { (this.handlers[type] || []).forEach((fn) => fn(msg)); }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = () => {
        this._flush();
        this._hb = setInterval(() => this._send({ type: C2S.PING }), 20000);
        this._emit('connected', {});
        resolve();
      };
      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.type === S2C.JOINED) { this.playerId = msg.playerId; this.room = msg.room; }
        this._emit(msg.type, msg);
        this._emit('*', msg);
      };
      ws.onclose = () => { clearInterval(this._hb); this._emit('disconnected', {}); };
      ws.onerror = (err) => { this._emit('neterror', err); reject(err); };
    });
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
    else this._queue.push(obj);
  }
  _flush() { const q = this._queue; this._queue = []; q.forEach((o) => this._send(o)); }

  // —— 便捷方法 ——
  create(name) { this._send({ type: C2S.CREATE, name }); }
  join(room, name) { this._send({ type: C2S.JOIN, room, name }); }
  ready(v) { this._send({ type: C2S.READY, ready: v }); }
  start() { this._send({ type: C2S.START }); }
  action(action) { this._send({ type: C2S.ACTION, action }); }
  leave() { this._send({ type: C2S.LEAVE }); }
  disconnect() { clearInterval(this._hb); if (this.ws) this.ws.close(); }
}
