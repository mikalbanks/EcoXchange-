import { Component } from "react";
import type { ReactNode } from "react";
import { ErrorState } from "./ErrorState.js";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches render-time errors in the page tree and shows a friendly card instead
// of a blank screen. Logs the technical detail to the console only.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorState onRetry={this.handleReset} />;
    }
    return this.props.children;
  }
}
