import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";

import DeveloperDashboard from "@/pages/developer/dashboard";
import DeveloperProjectWizard from "@/pages/developer/project-wizard";
import DeveloperProjectDetail from "@/pages/developer/project-detail";

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
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/yield-simulation" component={YieldSimulationPage} />
      
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

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
