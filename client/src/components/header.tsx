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
    location.startsWith("/market/");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-home">
                Home
              </Link>
              <Link href="/market" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-offerings">
                Marketplace
              </Link>
              <Link href="/performance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-performance">
                Performance
              </Link>
              <Link href="/auth/login?redirect=/investor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-investor-dashboard">
                Investor Dashboard
              </Link>
              <Link href="/auth/login?redirect=/developer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-developer-portal">
                Developer Portal
              </Link>
              <Link href="/auth/login?redirect=/operations" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-operations">
                Operations
              </Link>
              <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-signin">
                Sign In
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
                <SheetContent side="right" className="w-64">
                  <nav className="flex flex-col gap-5 mt-8">
                    <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-home">
                      Home
                    </Link>
                    <Link href="/market" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-marketplace">
                      Marketplace
                    </Link>
                    <Link href="/performance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-performance">
                      Performance
                    </Link>
                    <Link href="/auth/login?redirect=/investor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-investor-dashboard">
                      Investor Dashboard
                    </Link>
                    <Link href="/auth/login?redirect=/developer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-developer-portal">
                      Developer Portal
                    </Link>
                    <Link href="/auth/login?redirect=/operations" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-operations">
                      Operations
                    </Link>
                    <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-mobile-signin">
                      Sign In
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
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-user-menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium" data-testid="text-user-email">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
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
                <Button variant="ghost" size="sm" data-testid="button-login">
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" data-testid="button-signup">
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
