import { useEffect, useState } from "react";
import { engineClient } from "../services/engineClient.js";

const POLL_MS = 60_000;

type Status = "checking" | "online" | "offline" | "not_configured";

const DOT: Record<Exclude<Status, "not_configured">, string> = {
  online: "bg-accentBrt",
  offline: "bg-statusError",
  checking: "bg-statusFlagged animate-pulse",
};

/**
 * Footer chip showing live pvlib engine connectivity: green dot + version
 * when the deployed engine answers /health, red when unreachable, hidden
 * entirely when VITE_ENGINE_URL is not configured.
 */
export function EngineHealth() {
  const [status, setStatus] = useState<Status>(
    engineClient.isConfigured() ? "checking" : "not_configured",
  );
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!engineClient.isConfigured()) return;

    let cancelled = false;
    const check = async () => {
      const health = await engineClient.checkHealth();
      if (cancelled) return;
      if (health) {
        setStatus("online");
        setVersion(health.engine_version);
      } else {
        setStatus("offline");
      }
    };

    void check();
    const interval = setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (status === "not_configured") return null;

  return (
    <div className="flex items-center gap-1.5" data-testid="engine-health">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      <span className="font-mono text-[10px] tracking-[0.02em] text-textMuted">
        Engine {status === "online" ? `v${version}` : status}
      </span>
    </div>
  );
}
