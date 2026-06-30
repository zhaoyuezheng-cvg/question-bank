/**
 * WebSocket 实时通知 composable
 */
import { ref, onMounted, onUnmounted } from 'vue';

export interface WSMessage {
  type: string;
  data?: any;
  ts?: number;
}

const messages = ref<WSMessage[]>([]);
const connected = ref(false);
const onlineCount = ref(0);
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.hostname}:${Number(location.port) + 1}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connected.value = true;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      // 心跳
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        messages.value = [msg, ...messages.value.slice(0, 49)];

        // 触发注册的监听器
        const handlers = listeners.get(msg.type);
        if (handlers) {
          for (const handler of handlers) {
            handler(msg.data);
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      connected.value = false;
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      // 自动重连
      reconnectTimer = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    reconnectTimer = setTimeout(connect, 5000);
  }
}

function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  ws?.close();
  ws = null;
}

function on(type: string, handler: (data: any) => void) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(handler);
  return () => { listeners.get(type)?.delete(handler); };
}

export function useWebSocket() {
  onMounted(() => { if (!ws) connect(); });
  onUnmounted(() => { /* 不断连，全局共享 */ });

  return {
    connected,
    messages,
    onlineCount,
    on,
    connect,
    disconnect,
  };
}
