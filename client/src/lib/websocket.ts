import { WebSocketMessage } from "./types";

export function createWebSocketConnection(
  onMessage: (data: WebSocketMessage) => void,
  onConnect: () => void,
  onDisconnect: () => void
): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log("WebSocket connected");
    onConnect();
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      onMessage(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };
  
  socket.onclose = () => {
    console.log("WebSocket disconnected");
    onDisconnect();
    
    // Try to reconnect after 5 seconds
    setTimeout(() => {
      createWebSocketConnection(onMessage, onConnect, onDisconnect);
    }, 5000);
  };
  
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    socket.close();
  };
  
  return socket;
}

export function sendWebSocketMessage(socket: WebSocket | null, message: any): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.error("WebSocket is not connected");
  }
}
