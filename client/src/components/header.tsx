import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { User, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();

  const isPublicPage =
    location === "/" ||
    location === "/about" ||
    location === "/compliance" ||
    location === "/yield-simulation" ||
    location === "/performance" ||
    location === "/backtest-report" ||
    location === "/market" ||
    location.startsWith("/market/") ||
    location === "/develop" ||
    location === "/develop/preview" ||
    location === "/invest/preview" ||
    location === "/method" ||
    location === "/faq";

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

        {isPublicPage && (
          <>
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

            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 border-border bg-background">
                  <nav className="flex flex-col gap-5 mt-8">
                    <Link href="/" className={navClass} data-testid="link-mobile-home">
                      Home
                    </Link>
                    <Link href="/market" className={navClass} data-testid="link-mobile-marketplace">
                      Marketplace
                    </Link>
                    <Link href="/develop" className={navClass} data-testid="link-mobile-develop">
                      Develop
                    </Link>
                    <Link href="/method" className={navClass} data-testid="link-mobile-method">
                      Method
                    </Link>
                    <Link href="/faq" className={navClass} data-testid="link-mobile-faq">
                      FAQ
                    </Link>
                    <Link href="/auth/signup">
                      <Button className="w-full" size="sm" data-testid="button-mobile-signup">
                        Create Account
                      </Button>
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}

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
                    href={user.role === "ADMIN" ? "/admin" : user.role === "DEVELOPER" ? "/developer" : "/investor"} 
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
