import { useEffect, useState } from "react";
import {
  engineClient,
  type ExpectedGenerationRequest,
  type ExpectedGenerationResponse,
} from "../services/engineClient.js";

interface UseEngineDataResult {
  data: ExpectedGenerationResponse | null;
  isLoading: boolean;
  /** true = numbers came from the live pvlib engine; false = seed/backtest fallback. */
  isFromEngine: boolean;
  error: string | null;
}

/**
 * Fetch expected generation from the live pvlib engine, falling back to
 * seed data when the engine is unconfigured or unreachable. Pass null
 * params to skip fetching entirely (e.g. while the project bundle loads).
 */
export function useEngineData(
  projectParams: ExpectedGenerationRequest | null,
): UseEngineDataResult {
  const [data, setData] = useState<ExpectedGenerationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromEngine, setIsFromEngine] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch only when the actual request content changes, not the object identity.
  const paramsKey = projectParams ? JSON.stringify(projectParams) : null;

  useEffect(() => {
    if (!paramsKey || !engineClient.isConfigured()) {
      setData(null);
      setIsFromEngine(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    engineClient
      .getExpectedGeneration(JSON.parse(paramsKey) as ExpectedGenerationRequest)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setData(result);
          setIsFromEngine(true);
        } else {
          setData(null);
          setIsFromEngine(false);
          setError("Engine unavailable — showing cached data");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setIsFromEngine(false);
        setError("Engine unavailable — showing cached data");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  return { data, isLoading, isFromEngine, error };
}
