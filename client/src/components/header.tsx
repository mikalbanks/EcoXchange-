import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { User, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/public-pages.css";

const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Home", testId: "link-home" },
  { href: "/market", label: "Marketplace", testId: "link-marketplace" },
  { href: "/portfolio", label: "Portfolio", testId: "link-portfolio" },
  { href: "/develop", label: "Develop", testId: "link-develop" },
  { href: "/method", label: "Method", testId: "link-method" },
  { href: "/faq", label: "FAQ", testId: "link-faq" },
] as const;

function userDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "DEVELOPER") return "/developer";
  return "/investor";
}

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/compliance" ||
    pathname === "/yield-simulation" ||
    pathname === "/performance" ||
    pathname === "/backtest-report" ||
    pathname === "/market" ||
    pathname.startsWith("/market/") ||
    pathname === "/portfolio" ||
    pathname.startsWith("/portfolio/") ||
    pathname === "/develop" ||
    pathname === "/develop/preview" ||
    pathname === "/invest/preview" ||
    pathname === "/method" ||
    pathname === "/faq" ||
    pathname === "/privacy"
  );
}

function isActiveNav(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const pathname = location.split("?")[0].split("#")[0] || "/";
  const isPublicPage = isPublicRoute(pathname);

  if (isPublicPage) {
    return (
      <header className="public-site-header">
        <div className="public-map-ticks public-map-ticks-top" aria-hidden="true" />
        <div className="public-header-inner">
          <Link href="/" className="public-brand" data-testid="link-brand-home">
            <span className="public-brand-name">EcoXchange</span>
            <span className="public-brand-tag">Clean Energy Market</span>
          </Link>

          <nav className="public-nav" aria-label="Primary navigation">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn("public-nav-link", isActiveNav(pathname, link.href) && "is-active")}
                data-testid={link.testId}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="public-nav-actions">
            {isLoading ? (
              <span className="h-4 w-20 animate-pulse bg-muted" aria-hidden="true" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-md" data-testid="button-user-menu">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Open user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-border">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium" data-testid="text-user-email">{user.email}</p>
                    <p className="text-xs font-mono text-muted-foreground">{user.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={userDashboardPath(user.role)}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid="link-dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth/login" className="public-nav-login" data-testid="button-login">
                  Log in
                </Link>
                <Link href="/market#onboard" className="public-nav-cta" data-testid="button-request-access">
                  Request access →
                </Link>
              </>
            )}
          </div>

          <div className="public-mobile-trigger">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 border-border bg-background">
                <nav className="public-mobile-nav" aria-label="Mobile navigation">
                  {PUBLIC_NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn("public-mobile-link", isActiveNav(pathname, link.href) && "is-active")}
                      data-testid={`mobile-${link.testId}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/market#onboard" className="public-btn public-btn-primary" data-testid="button-mobile-request-access">
                    Request access →
                  </Link>
                  {user ? (
                    <Link href={userDashboardPath(user.role)} className="public-btn public-btn-outline" data-testid="button-mobile-dashboard">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/auth/login" className="public-mobile-link" data-testid="link-mobile-login">
                      Log in
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  const navClass = cn(
    "text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition-colors",
    "text-muted-foreground hover:text-primary"
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 shadow-none backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/brand/ecoxchange-logo.png"
            alt="EcoXchange"
            className="h-10 w-auto"
            data-testid="img-brand-logo"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className={navClass} data-testid="link-home">
            Home
          </Link>
          <Link href="/market" className={navClass} data-testid="link-marketplace">
            Marketplace
          </Link>
          <Link href="/develop" className={navClass} data-testid="link-develop">
            Develop
          </Link>
          <Link href="/method" className={navClass} data-testid="link-method">
            Method
          </Link>
          <Link href="/faq" className={navClass} data-testid="link-faq">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-sm bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-md" data-testid="button-user-menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-border">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium" data-testid="text-user-email">{user.email}</p>
                  <p className="text-xs font-mono text-muted-foreground">{user.role}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={userDashboardPath(user.role)}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid="link-dashboard"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="rounded-md border-primary/40 text-xs uppercase tracking-wider" data-testid="button-login">
                  Log In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-md text-xs uppercase tracking-wider" data-testid="button-signup">
                  Create Account
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
