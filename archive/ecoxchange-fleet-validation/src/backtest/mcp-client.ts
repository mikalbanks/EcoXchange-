// Source pattern: /ecoxchange-onboarding/src/orchestration/mcp-client.ts
import axios from "axios";

export async function callMcp<T = unknown>(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs = 90_000,
): Promise<T> {
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };
  const resp = await axios.post(serverUrl, body, {
    timeout: timeoutMs,
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
  });
  const payload = resp.data;
  if (payload?.error) {
    throw new Error(
      `MCP ${toolName} error ${payload.error.code}: ${payload.error.message}`,
    );
  }
  const text = payload?.result?.content?.[0]?.text;
  if (!text) throw new Error(`MCP ${toolName}: empty response`);
  if (payload.result?.isError) {
    throw new Error(`MCP ${toolName} returned isError=true: ${text}`);
  }
  return JSON.parse(text) as T;
}
