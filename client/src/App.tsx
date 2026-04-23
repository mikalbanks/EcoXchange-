import { Component, type ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import PublicMarketPage from "@/pages/market";
import PublicMarketProjectPage from "@/pages/market-project";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";

import DeveloperDashboard from "@/pages/developer/dashboard";
import DeveloperProjectWizard from "@/pages/developer/project-wizard";
import DeveloperProjectDetail from "@/pages/developer/project-detail";

import PrivacyPolicy from "@/pages/privacy";
import InvestorDashboard from "@/pages/investor/dashboard";
import InvestorDeals from "@/pages/investor/deals";
import InvestorDealRoom from "@/pages/investor/deal-room";
import InvestorInterests from "@/pages/investor/interests";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminProjects from "@/pages/admin/projects";
import AdminProjectReview from "@/pages/admin/project-review";
import AdminExportPacket from "@/pages/admin/export-packet";
import AdminUsers from "@/pages/admin/users";
import YieldSimulationPage from "@/pages/yield-simulation";

import PerformancePage from "@/pages/performance";
import OperationsPage from "@/pages/operations";
import BacktestReportPage from "@/pages/backtest-report";

function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    const redirectPath = user.role === "ADMIN" ? "/admin" : user.role === "DEVELOPER" ? "/developer" : "/investor";
    return <Redirect to={redirectPath} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/market" component={PublicMarketPage} />
      <Route path="/market/:id" component={PublicMarketProjectPage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/yield-simulation" component={YieldSimulationPage} />

      <Route path="/performance/:projectId" component={PerformancePage} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/backtest-report" component={BacktestReportPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      
      <Route path="/developer">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}>
          <DeveloperDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/developer/projects">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}>
          <DeveloperDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/developer/projects/new">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}>
          <DeveloperProjectWizard />
        </ProtectedRoute>
      </Route>
      <Route path="/developer/projects/:id">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}>
          <DeveloperProjectDetail />
        </ProtectedRoute>
      </Route>

      <Route path="/investor">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/deals">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorDeals />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/deals/:id">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorDealRoom />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/interests">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorInterests />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/projects/:id/export">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminExportPacket />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/projects/:id">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminProjectReview />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/projects">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminProjects />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminUsers />
        </ProtectedRoute>
      </Route>

      <Route path="/operations">
        <ProtectedRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
          <OperationsPage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
