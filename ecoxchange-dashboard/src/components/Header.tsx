import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="bg-darkBg text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/ecoxchange-logo.svg" alt="EcoXchange" className="h-8 w-8" />
          <span className="font-heading text-xl">EcoXchange</span>
        </Link>
        <span className="text-sm sm:text-base text-paleGreen">
          Investor Dashboard
        </span>
      </div>
    </header>
  );
}
