import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface DistributionBannerPayload {
  amountUsd: number;
  /** Where tapping the banner navigates; defaults to the distributions page. */
  to?: string;
}

interface NotificationContextValue {
  banner: DistributionBannerPayload | null;
  showDistributionBanner: (payload: DistributionBannerPayload) => void;
  dismissBanner: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<DistributionBannerPayload | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const dismissBanner = useCallback(() => {
    clearTimer();
    setBanner(null);
  }, []);

  const showDistributionBanner = useCallback((payload: DistributionBannerPayload) => {
    clearTimer();
    setBanner(payload);
    timer.current = setTimeout(() => setBanner(null), AUTO_DISMISS_MS);
  }, []);

  useEffect(() => clearTimer, []);

  return (
    <NotificationContext.Provider
      value={{ banner, showDistributionBanner, dismissBanner }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return ctx;
}
