/**
 * WebSocket 实时通知
 * - 新题目导入通知
 * - 学习进度更新
 * - 系统消息
 */
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log(`[WS] 客户端连接 (在线: ${clients.size})`);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch {}
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] 客户端断开 (在线: ${clients.size})`);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });

    // 发送连接成功消息
    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
  });

  console.log('[WebSocket] 已启动: /ws');
}

/**
 * 广播消息给所有连接的客户端
 */
export function broadcast(type: string, data: any) {
  if (!clients.size) return;
  const message = JSON.stringify({ type, data, ts: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * 获取在线客户端数量
 */
export function getOnlineCount(): number {
  return clients.size;
}
