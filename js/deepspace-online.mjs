// 《气闸孤注：γ-7》联机大厅：连接服务器、创建/加入房间、准备/开始，然后把对局交给
// deepspace-3d 的 startOnline 来渲染。底层 WebSocket 用通用的 GameClient。
import { GameClient } from './net/client.mjs';
import { startOnline } from './deepspace-3d.mjs';

const $ = (id) => document.getElementById(id);
let client = null, myId = null, returnFn = null, myReady = false;

const defaultUrl = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname || 'localhost'}:3001`;

export function openOnline(onReturn) {
  returnFn = onReturn;
  $('menu').hidden = true; // 否则主菜单浮层会盖在对局控件上、拦截点击
  if (!$('srvUrl').value) $('srvUrl').value = defaultUrl();
  if (!$('plName').value) $('plName').value = '雇佣兵' + Math.floor(Math.random() * 90 + 10);
  showPane('connect'); msg(''); lobbyMsg('');
  $('onlineScreen').hidden = false;
}

function showPane(which) {
  $('onlineConnect').hidden = which !== 'connect';
  $('onlineLobby').hidden = which !== 'lobby';
}
const msg = (t) => { $('onlineMsg').textContent = t; };
const lobbyMsg = (t) => { $('lobbyHint').textContent = t; };
const nameVal = () => ($('plName').value || '雇佣兵').slice(0, 20);

function connect(then) {
  if (client) { try { client.disconnect(); } catch { /* ignore */ } }
  client = new GameClient(($('srvUrl').value || defaultUrl()).trim());
  wire();
  msg('连接中……');
  client.connect().then(() => { msg(''); then(); }).catch(() => msg('无法连接服务器，请检查地址是否正确、服务器是否已启动。'));
}

function wire() {
  client.on('joined', (m) => {
    myId = m.playerId; myReady = false;
    // 提前注册对局渲染处理；真正开打(收到首个 STATE)时再隐藏大厅。
    startOnline({ client, myId, onFirstState: () => { $('onlineScreen').hidden = true; } });
    $('roomCode').textContent = m.room;
    showPane('lobby');
  });
  client.on('lobby', renderLobby);
  client.on('error', (m) => { msg(m.message || '操作被拒绝。'); lobbyMsg(m.message || ''); });
  client.on('neterror', () => msg('无法连接服务器，请检查地址。'));
}

function renderLobby(m) {
  const me = m.players.find((p) => p.id === myId);
  const host = !!(me && me.host);
  myReady = !!(me && me.ready);
  // 玩家代号来自网络，必须作为纯文本插入，不能交给 innerHTML 解析。
  const rows = m.players.map((p) => {
    const row = document.createElement('div');
    row.className = `prow${p.id === myId ? ' self' : ''}`;
    const name = document.createElement('span');
    name.textContent = `${p.host ? '👑 ' : ''}${p.name}${p.id === myId ? '（你）' : ''}`;
    const status = document.createElement('span');
    status.className = p.ready ? 'rdy' : 'wait';
    status.textContent = p.host ? '房主' : p.ready ? '已准备' : '未准备';
    row.append(name, status);
    return row;
  });
  $('playerList').replaceChildren(...rows);
  $('btnReady').textContent = myReady ? '取消准备' : '准备';
  $('btnReady').style.display = host ? 'none' : '';
  const canStart = host && m.players.length >= 2 && m.players.every((p) => p.ready || p.host);
  $('btnStart').style.display = host ? '' : 'none';
  $('btnStart').disabled = !canStart;
  lobbyMsg(m.players.length < 2 ? '把房号发给对手，等他加入……' : host ? (canStart ? '可以开始了。' : '等待对手准备……') : '准备好后等房主开始。');
}

function leave() {
  if (client) { try { client.disconnect(); } catch { /* ignore */ } }
  client = null; $('onlineScreen').hidden = true; if (returnFn) returnFn();
}

export function bootOnline() {
  $('btnCreate').onclick = () => connect(() => client.create(nameVal()));
  $('btnJoin').onclick = () => {
    const code = ($('joinCode').value || '').trim().toUpperCase();
    if (code.length < 3) return msg('请输入房号。');
    connect(() => client.join(code, nameVal()));
  };
  $('btnReady').onclick = () => { myReady = !myReady; client.ready(myReady); };
  $('btnStart').onclick = () => client.start();
  $('btnLeave').onclick = leave;
  $('onlineBack').onclick = leave;
}
