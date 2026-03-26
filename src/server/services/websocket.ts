/**
 * WebSocket Service
 * =================
 * Broadcasts real-time SCADA telemetry updates to connected dashboard clients.
 */
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer;

export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("[WS] Client connected. Total:", wss.clients.size);
    ws.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));

    ws.on("close", () => {
      console.log("[WS] Client disconnected. Total:", wss.clients.size);
    });
  });

  return wss;
}

export function broadcastTelemetry(data: {
  type: string;
  spvId: number;
  payload: unknown;
}): void {
  if (!wss) return;

  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
