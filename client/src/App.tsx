import { Component, type ReactNode } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import DerNetworkPage from "@/pages/der-network";
import PowerGapPage from "@/pages/power-gap";
import PrivacyPolicy from "@/pages/privacy";
import FaqPage from "@/pages/faq";
import NotFound from "@/pages/not-found";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("App error boundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return <div className="min-h-screen flex items-center justify-center bg-background p-4"><div className="max-w-md text-center space-y-4"><h1 className="text-2xl font-bold">Something went wrong</h1><button className="px-4 py-2 bg-primary text-primary-foreground rounded-md" onClick={() => window.location.href = "/"}>Return home</button></div></div>;
    }
    return this.props.children;
  }
}

function Router() {
  return <Switch>
    <Route path="/" component={LandingPage} />
    <Route path="/power-gap" component={PowerGapPage} />
    <Route path="/der-network" component={DerNetworkPage} />
    <Route path="/faq" component={FaqPage} />
    <Route path="/privacy" component={PrivacyPolicy} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><QueryClientProvider client={queryClient}><TooltipProvider><Toaster /><Router /></TooltipProvider></QueryClientProvider></ErrorBoundary>;
}
