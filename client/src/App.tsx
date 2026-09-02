import { Component, type ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { dashboardPathForRole, loginPathWithReturn } from "@/lib/roles";

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
import PortfolioPage from "@/pages/portfolio";
import SharedPortfolioPage from "@/pages/portfolio-shared";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";

import DeveloperDashboard from "@/pages/developer/dashboard";
import DeveloperProjectDetail from "@/pages/developer/project-detail";
import DeveloperProjectIntake from "@/pages/developer/project-intake";
import DeveloperBacktestView from "@/pages/developer/backtest-view";
import DeveloperProjectDashboard from "@/pages/developer/project-dashboard";
import ProjectFinanceUnderwriting from "@/pages/developer/project-finance-underwriting";

import PrivacyPolicy from "@/pages/privacy";
import InvestorDashboard from "@/pages/investor/dashboard";
import InvestorQueueDeal from "@/pages/investor/queue-deal";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminProjects from "@/pages/admin/projects";
import AdminProjectReview from "@/pages/admin/project-review";
import AdminExportPacket from "@/pages/admin/export-packet";
import AdminUsers from "@/pages/admin/users";
import AdminVerificationPage from "@/pages/admin/verification";
import AdminDistributions from "@/pages/admin/distributions";

import PerformancePage from "@/pages/performance";
import OperationsPage from "@/pages/operations";
import BacktestReportPage from "@/pages/backtest-report";
import DegradationCertificatePage from "@/pages/degradation-certificate";
import SoilingReportPage from "@/pages/soiling-report";
import AvailabilityReportPage from "@/pages/availability-report";
import DevelopPage from "@/pages/develop";
import MethodPage from "@/pages/method";
import FaqPage from "@/pages/faq";
import InvestorDashboardPreview from "@/pages/invest-preview";
import DeveloperDashboardPreview from "@/pages/develop-preview";
import { PilotTransactionBoundary } from "@/components/pilot-transaction-boundary";

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
    return <Redirect to={loginPathWithReturn(window.location.pathname)} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Redirect to={dashboardPathForRole(user.role)} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/market" component={PublicMarketPage} />
      <Route path="/market/:id" component={PublicMarketProjectPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/portfolio/shared/:token" component={SharedPortfolioPage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/yield-simulation"><PilotTransactionBoundary surface="Yield simulation" /></Route>
      <Route path="/performance/:projectId" component={PerformancePage} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/backtest-report" component={BacktestReportPage} />
      <Route path="/reports/degradation/:projectId" component={DegradationCertificatePage} />
      <Route path="/reports/soiling/:projectId" component={SoilingReportPage} />
      <Route path="/reports/availability/:projectId" component={AvailabilityReportPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/develop" component={DevelopPage} />
      <Route path="/develop/preview" component={DeveloperDashboardPreview} />
      <Route path="/invest/preview" component={InvestorDashboardPreview} />
      <Route path="/verification" component={MethodPage} />
      <Route path="/method" component={MethodPage} />
      <Route path="/faq" component={FaqPage} />
      
      <Route path="/developer">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><DeveloperDashboard /></ProtectedRoute>
      </Route>
      <Route path="/developer/projects">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><DeveloperDashboard /></ProtectedRoute>
      </Route>
      <Route path="/developer/projects/new">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><PilotTransactionBoundary surface="Offering creation" /></ProtectedRoute>
      </Route>
      <Route path="/developer/onboard">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><DeveloperProjectIntake /></ProtectedRoute>
      </Route>
      <Route path="/developer/project-finance">
        <ProtectedRoute allowedRoles={["DEVELOPER", "ADMIN"]}><ProjectFinanceUnderwriting /></ProtectedRoute>
      </Route>
      <Route path="/developer/backtest/:id">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><DeveloperBacktestView /></ProtectedRoute>
      </Route>
      <Route path="/developer/project/:id">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><DeveloperProjectDashboard /></ProtectedRoute>
      </Route>
      <Route path="/developer/projects/:id">
        <ProtectedRoute allowedRoles={["DEVELOPER"]}><DeveloperProjectDetail /></ProtectedRoute>
      </Route>

      <Route path="/investor">
        <ProtectedRoute allowedRoles={["INVESTOR"]}><InvestorDashboard /></ProtectedRoute>
      </Route>
      <Route path="/investor/deals">
        <ProtectedRoute allowedRoles={["INVESTOR"]}><PilotTransactionBoundary surface="Investment marketplace" /></ProtectedRoute>
      </Route>
      <Route path="/investor/deals/:id">
        <ProtectedRoute allowedRoles={["INVESTOR"]}><PilotTransactionBoundary surface="Deal room and commitment" /></ProtectedRoute>
      </Route>
      <Route path="/investor/queue/:id">
        <ProtectedRoute allowedRoles={["INVESTOR"]}><InvestorQueueDeal /></ProtectedRoute>
      </Route>
      <Route path="/investor/interests">
        <ProtectedRoute allowedRoles={["INVESTOR"]}><PilotTransactionBoundary surface="Investment commitments" /></ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/admin/distributions/:spvId">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminDistributions /></ProtectedRoute>
      </Route>
      <Route path="/admin/distributions">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminDistributions /></ProtectedRoute>
      </Route>
      <Route path="/admin/projects/:id/export">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminExportPacket /></ProtectedRoute>
      </Route>
      <Route path="/admin/projects/:id/verification">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminVerificationPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/projects/:id">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminProjectReview /></ProtectedRoute>
      </Route>
      <Route path="/admin/projects">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminProjects /></ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["ADMIN"]}><AdminUsers /></ProtectedRoute>
      </Route>

      <Route path="/operations">
        <ProtectedRoute allowedRoles={["ADMIN", "DEVELOPER"]}><OperationsPage /></ProtectedRoute>
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
