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
import { User, LogOut, LayoutDashboard, Leaf } from "lucide-react";

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();

  const isPublicPage = location === "/" || location === "/about" || location === "/compliance";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary glow-green">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg leading-tight" data-testid="text-brand-name">EcoXchange</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Clean Energy Market</span>
          </div>
        </Link>

        {isPublicPage && (
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-about">
              About
            </Link>
            <Link href="/compliance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-compliance">
              Compliance
            </Link>
          </nav>
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
                    href={user.role === "ADMIN" ? "/admin" : user.role === "ISSUER" ? "/issuer" : "/investor"} 
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
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
