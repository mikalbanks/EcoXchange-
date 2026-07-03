import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Coins, X } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext.js";
import { formatUsd } from "../../utils/formatters.js";

/**
 * Push-notification-style banner shown when a distribution lands. Slides in
 * from the top (safe-area aware), auto-dismisses after 5s (timer lives in
 * NotificationContext), taps through to the distributions page.
 */
export function DistributionBanner() {
  const { banner, dismissBanner } = useNotifications();
  const navigate = useNavigate();

  if (!banner) return null;

  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[60] animate-slide-in-top pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex max-w-xl items-stretch border-l-4 border-accentBrt bg-darkBg text-white shadow-lg sm:mt-3 sm:rounded-lg sm:border sm:border-l-4 sm:border-accentBrt/40 sm:border-l-accentBrt">
        <button
          type="button"
          onClick={() => {
            dismissBanner();
            navigate(banner.to ?? "/investor/distributions");
          }}
          className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accentBrt/20">
            <Coins className="h-5 w-5 text-accentBrt" />
          </span>
          <span>
            <span className="block text-sm font-medium">
              Distribution Received
            </span>
            <span className="block text-xs text-paleGreen">
              {formatUsd(banner.amountUsd, true)} USDC → Your Wallet · Tap to view
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={dismissBanner}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-paleGreen hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
