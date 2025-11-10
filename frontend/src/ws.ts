export function connectQueue(onMessage: (data: any) => void) {
  const url =
    (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:8000/ws/queue/';

  let ws: WebSocket | null = null;
  let retryMs = 1000;

  function open() {
    ws = new WebSocket(url);
    ws.onopen = () => {
      retryMs = 1000;
    };
    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch {
        // ignore malformed payloads
      }
    };
    ws.onclose = () => {
      setTimeout(open, Math.min(10000, (retryMs *= 2)));
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }

  open();

  return () => {
    try {
      ws?.close();
    } catch {
      // ignore
    }
  };
}

