'use client';

import React, { Component, ErrorInfo } from 'react';
import type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
} from '@/lib/types/errorBoundary';

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console with a warning instead of error to prevent Next.js issues
    console.warn('🚨 Error caught by boundary:', error.message);
    console.warn('Error details:', errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="p-8 text-center">
              <h1 className="mb-4 text-2xl font-bold text-gray-900">
                Something went wrong
              </h1>
              <p className="mb-6 text-gray-600">
                We&apos;re sorry, but something unexpected happened. Please try
                refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Hook to handle async errors
export function useAsyncError() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.warn('🚨 Async error caught:', error.message);
    setError(error);
  }, []);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('🚨 Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser behavior
    };

    const handleError = (event: ErrorEvent) => {
      console.warn('🚨 Unhandled error:', event.error);
      event.preventDefault(); // Prevent the default browser behavior
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      window.removeEventListener('error', handleError);
    };
  }, []);

  return { error, resetError, handleError };
}
