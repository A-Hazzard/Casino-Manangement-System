'use client';

import React, { useState, useEffect } from 'react';
import ErrorBoundary from '@/components/ui/errors/ErrorBoundary';
import ConnectionError from '@/components/ui/errors/ConnectionError';

/**
 * Global error boundary wrapper for the entire application
 * Handles both React errors and API connection errors
 */
export default function GlobalErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [globalError, setGlobalError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setGlobalError(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setGlobalError(
        new Error(event.reason?.message || 'Unhandled promise rejection')
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, []);

  if (globalError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ConnectionError
          error={globalError}
          title="Application Error"
          description="Something went wrong with the application. Please try refreshing the page or contact support if the issue persists."
          showRetryButton={true}
          onRetry={() => {
            setGlobalError(null);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error(
            'Global Error Boundary caught an error:',
            error,
            errorInfo
          );
        }

        // Set the global error state
        setGlobalError(error);

        // In production, you might want to send this to an error reporting service
        // like Sentry, LogRocket, etc.
      }}
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <ConnectionError
            error={globalError || new Error('Unknown application error')}
            title="Application Error"
            description="Something went wrong with the application. Please try refreshing the page or contact support if the issue persists."
            showRetryButton={true}
            onRetry={() => window.location.reload()}
          />
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
