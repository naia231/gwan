import React from 'react';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.PureComponent<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)] text-white p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400">Something went wrong.</h1>
            <p className="text-gray-400 mt-2">Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
