import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AboutPage from "@/pages/about";
import CompliancePage from "@/pages/compliance";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";

import IssuerDashboard from "@/pages/issuer/dashboard";
import IssuerProjects from "@/pages/issuer/projects";
import NewProject from "@/pages/issuer/project-new";
import ProjectDetail from "@/pages/issuer/project-detail";
import IssuerOfferings from "@/pages/issuer/offerings";
import NewOffering from "@/pages/issuer/offering-new";
import OfferingDetail from "@/pages/issuer/offering-detail";

import InvestorDashboard from "@/pages/investor/dashboard";
import InvestorMarketplace from "@/pages/investor/marketplace";
import InvestorOfferingDetail from "@/pages/investor/offering-detail";
import InvestorPortfolio from "@/pages/investor/portfolio";
import InvestorWallet from "@/pages/investor/wallet";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminOfferings from "@/pages/admin/offerings";

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
    const redirectPath = user.role === "ADMIN" ? "/admin" : user.role === "ISSUER" ? "/issuer" : "/investor";
    return <Redirect to={redirectPath} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/compliance" component={CompliancePage} />
      
      {/* Auth Routes */}
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      
      {/* Issuer Routes */}
      <Route path="/issuer">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <IssuerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/issuer/projects">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <IssuerProjects />
        </ProtectedRoute>
      </Route>
      <Route path="/issuer/projects/new">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <NewProject />
        </ProtectedRoute>
      </Route>
      <Route path="/issuer/projects/:id">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <ProjectDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/issuer/offerings">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <IssuerOfferings />
        </ProtectedRoute>
      </Route>
      <Route path="/issuer/offerings/new">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <NewOffering />
        </ProtectedRoute>
      </Route>
      <Route path="/issuer/offerings/:id">
        <ProtectedRoute allowedRoles={["ISSUER"]}>
          <OfferingDetail />
        </ProtectedRoute>
      </Route>

      {/* Investor Routes */}
      <Route path="/investor">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/marketplace">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorMarketplace />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/offerings/:id">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorOfferingDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/portfolio">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorPortfolio />
        </ProtectedRoute>
      </Route>
      <Route path="/investor/wallet">
        <ProtectedRoute allowedRoles={["INVESTOR"]}>
          <InvestorWallet />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/offerings">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminOfferings />
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
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
