import { Link } from "react-router-dom";
import {
  SECURITIES_DEMO_DISCLOSURE,
  USDC_OPTIONAL_DISCLOSURE,
} from "../../utils/demo-config.js";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-eco-border">
      <div
        className="text-white"
        style={{
          background:
            "linear-gradient(180deg, #2C5A3B 0%, #1B4D35 100%)",
        }}
      >
        <div className="mx-auto max-w-site px-6 sm:px-8 py-16 text-center space-y-6">
          <p className="font-mono text-[11px] uppercase tracking-tag text-eco-text-light">
            Reg D 506(c) - Accredited Investors Only
          </p>
          <h2 className="font-display italic text-[28px] sm:text-[34px] text-white">
            Production-verified solar yield, settled in dollars.
          </h2>
          <p className="font-body text-[14px] sm:text-[15px] text-eco-text-light max-w-prose mx-auto">
            EcoXchange offers fractional ownership of individual solar projects
            with three-way reconciliation between inverter telemetry, utility
            meter data, and a satellite-irradiance physics model.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              to="/onboard"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-eco-cta-olive text-eco-dark border border-eco-cta-olive hover:brightness-95 transition-all duration-150"
            >
              Request Access <span aria-hidden>-&gt;</span>
            </Link>
            <a
              href="https://ecoxchange.net"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-transparent text-white border border-white/60 hover:bg-white/10 transition-all duration-150"
            >
              Return to ecoxchange.net <span aria-hidden>-&gt;</span>
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-site px-6 sm:px-8 py-10 space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted text-center">
          Demo data - Savannah 5MW backtest fallback - Supabase optional
        </p>
        <div className="border border-eco-border bg-eco-pale/45 p-4">
          <p className="font-body text-[12px] leading-6 text-eco-text-body">
            {SECURITIES_DEMO_DISCLOSURE}
          </p>
          <p className="mt-2 font-body text-[12px] leading-6 text-eco-text-body">
            {USDC_OPTIONAL_DISCLOSURE}
          </p>
        </div>
        <p className="font-mono text-[11px] text-eco-text-muted text-center">
          (c) EcoXchange
        </p>
      </div>
    </footer>
  );
}
