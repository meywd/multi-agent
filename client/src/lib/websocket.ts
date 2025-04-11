import { WebSocketMessage } from "./types";

// Define the type for message handler functions
type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = () => void;

/**
 * Creates a WebSocket connection to the server
 * @param onMessage Function to handle incoming messages
 * @param onConnect Function to handle successful connection
 * @param onDisconnect Function to handle disconnection
 * @returns The WebSocket instance
 */
export function createWebSocketConnection(
  onMessage: MessageHandler,
  onConnect: ConnectionHandler,
  onDisconnect: ConnectionHandler
): WebSocket {
  // Determine the correct WebSocket protocol (wss for HTTPS, ws for HTTP)
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  // Create the WebSocket URL - make sure this matches the path in server/routes.ts
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  console.log(`Connecting to WebSocket server at ${wsUrl}`);
  
  // Create the WebSocket connection
  const socket = new WebSocket(wsUrl);
  
  // Set up WebSocket event handlers
  socket.onopen = () => {
    console.log("WebSocket connection established");
    onConnect();
  };
  
  socket.onclose = () => {
    console.log("WebSocket connection closed");
    onDisconnect();
    
    // Optional: Attempt to reconnect after a delay
    setTimeout(() => {
      console.log("Attempting to reconnect...");
      createWebSocketConnection(onMessage, onConnect, onDisconnect);
    }, 5000);
  };
  
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log("WebSocket message received:", message);
      onMessage(message);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };
  
  return socket;
}

/**
 * Send a message through the WebSocket connection
 * @param socket The WebSocket connection
 * @param message The message to send
 * @returns Boolean indicating success
 */
export function sendWebSocketMessage(socket: WebSocket, message: any): boolean {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  } else {
    console.error("WebSocket not connected, cannot send message");
    return false;
  }
}