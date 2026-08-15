import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

/**
 * Top-level error boundary. Without this, any uncaught error during render
 * unmounts the entire React tree and leaves users staring at a blank white
 * screen (see the ScenarioSave import-cycle crash). This turns that into a
 * readable fallback with a refresh action, and logs the error for debugging.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the crash somewhere useful rather than swallowing it silently.
    console.error('Uncaught error rendering the app:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
          <div className="text-lg font-semibold text-gray-900">Something went wrong.</div>
          <div className="text-sm text-gray-500 max-w-md">
            The page hit an unexpected error. Try refreshing. If it keeps happening,
            sign out and back in, or contact support.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
          {this.state.error && (
            <pre className="mt-4 max-w-2xl w-full overflow-auto rounded-md bg-gray-100 p-4 text-left text-xs text-red-700 whitespace-pre-wrap">
              {this.state.error.message}
              {this.state.componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
