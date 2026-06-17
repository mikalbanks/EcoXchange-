import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function ArticleCTA() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-paleGreen/60 bg-paleGreen/30 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-heading text-xl text-darkBg">
          Ready to invest in production-verified solar?
        </div>
        <p className="mt-1 text-sm text-textMuted">
          Browse open EcoXchange Solar Note offerings.
        </p>
      </div>
      <Link
        to="/investor/marketplace"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-medGreen px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg"
      >
        Browse Offerings <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
