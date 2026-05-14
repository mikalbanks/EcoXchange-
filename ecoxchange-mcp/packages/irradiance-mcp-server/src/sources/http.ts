import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { REQUEST_TIMEOUT_MS } from "../constants.js";

export async function sourceRequest<T>(
  source: string,
  config: AxiosRequestConfig,
): Promise<T> {
  try {
    const res = await axios.request<T>({
      timeout: REQUEST_TIMEOUT_MS,
      ...config,
    });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const ax = err as AxiosError;
      const status = ax.response?.status;
      if (status === 401 || status === 403) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `${source} rejected credentials (HTTP ${status}). Check API key.`,
        );
      }
      if (status === 429) {
        throw new McpError(
          ErrorCode.InternalError,
          `${source} rate limit exceeded. Retry after cooldown.`,
        );
      }
      if (ax.code === "ECONNABORTED" || ax.code === "ETIMEDOUT") {
        throw new McpError(
          ErrorCode.InternalError,
          `${source} timed out after ${REQUEST_TIMEOUT_MS}ms.`,
        );
      }
      throw new McpError(
        ErrorCode.InternalError,
        `${source} HTTP error: ${ax.message}`,
      );
    }
    if (err instanceof McpError) throw err;
    throw new McpError(
      ErrorCode.InternalError,
      `Unexpected error calling ${source}: ${(err as Error)?.message ?? String(err)}`,
    );
  }
}
