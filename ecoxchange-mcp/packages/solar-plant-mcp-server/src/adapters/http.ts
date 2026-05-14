import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { REQUEST_TIMEOUT_MS } from "../constants.js";
import type { SupportedBrand } from "@ecoxchange/shared";

export async function brandRequest<T>(
  brand: SupportedBrand,
  plantId: string,
  config: AxiosRequestConfig,
): Promise<T> {
  try {
    const res = await axios.request<T>({
      timeout: REQUEST_TIMEOUT_MS,
      ...config,
    });
    return res.data;
  } catch (err) {
    throw mapBrandError(brand, plantId, err);
  }
}

export function mapBrandError(
  brand: SupportedBrand,
  plantId: string,
  err: unknown,
): McpError {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError;
    const status = ax.response?.status;
    if (status === 401 || status === 403) {
      return new McpError(
        ErrorCode.InvalidParams,
        `Invalid API key for ${brand} plant ${plantId}. Verify the key has monitoring read access.`,
      );
    }
    if (status === 404) {
      return new McpError(
        ErrorCode.InvalidParams,
        `Plant ID ${plantId} not found in ${brand} portal.`,
      );
    }
    if (status === 429) {
      return new McpError(
        ErrorCode.InternalError,
        `${brand} API rate limit exceeded for plant ${plantId}. Retry after cooldown.`,
      );
    }
    if (ax.code === "ECONNABORTED" || ax.code === "ETIMEDOUT") {
      return new McpError(
        ErrorCode.InternalError,
        `${brand} API did not respond within 30s. Retry or check brand status page.`,
      );
    }
    return new McpError(
      ErrorCode.InternalError,
      `${brand} API error for plant ${plantId}: ${ax.message}`,
    );
  }
  if (err instanceof McpError) return err;
  return new McpError(
    ErrorCode.InternalError,
    `Unexpected error calling ${brand} API: ${(err as Error)?.message ?? String(err)}`,
  );
}
