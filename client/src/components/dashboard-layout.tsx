import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderKanban,
  FileSearch,
  Users,
  LogOut,
  Shield,
  ChevronRight,
  Search,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";

const developerNavItems = [
  { title: "Overview", url: "/developer", icon: LayoutDashboard },
  { title: "Projects", url: "/developer/projects", icon: FolderKanban },
  { title: "Performance", url: "/performance", icon: BarChart3 },
];

const investorNavItems = [
  { title: "Overview", url: "/investor", icon: LayoutDashboard },
  { title: "Offerings", url: "/investor/deals", icon: Search },
  { title: "My Investments", url: "/investor/interests", icon: TrendingUp },
  { title: "Performance", url: "/performance", icon: BarChart3 },
];

const adminNavItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Review Queue", url: "/admin/projects", icon: ClipboardCheck },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Performance", url: "/performance", icon: BarChart3 },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function DashboardLayout({ 
  children, 
  title, 
  description,
  actions,
  breadcrumbs
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = user?.role === "ADMIN" 
    ? adminNavItems 
    : user?.role === "DEVELOPER" 
    ? developerNavItems 
    : investorNavItems;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-gradient-dark">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">E</span>
                </div>
                <span className="font-semibold text-sidebar-foreground text-sm" data-testid="text-sidebar-brand">EcoXchange</span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
                {user?.role === "ADMIN" ? "Administration" : user?.role === "DEVELOPER" ? "Issuer Portal" : "Investor Portal"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.url || 
                      (item.url !== "/" && item.url !== "/developer" && item.url !== "/investor" && item.url !== "/admin" && location.startsWith(item.url));
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive}
                          className={cn(
                            "hover-elevate",
                            isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={logout}
                      className="text-destructive hover-elevate cursor-pointer"
                      data-testid="button-sidebar-logout"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur px-4">
            <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
            
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                  <span key={index} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <div className="ml-auto flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{user.role === "DEVELOPER" ? "ISSUER" : user.role}</span>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-header-email">
                    {user.name || user.email}
                  </span>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 max-w-7xl">
              {(title || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    {title && <h1 className="text-2xl font-semibold" data-testid="text-page-title">{title}</h1>}
                    {description && <p className="text-muted-foreground mt-1">{description}</p>}
                  </div>
                  {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
