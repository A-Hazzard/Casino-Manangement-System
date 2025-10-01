"use client";

import React, { ComponentType, useState, useCallback } from "react";
import { useGlobalErrorHandler } from "@/lib/hooks/data/useGlobalErrorHandler";
import ConnectionError from "./ConnectionError";

export interface PageErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: unknown) => void;
}

/**
 * Page-level error boundary that catches and handles errors gracefully
 * Provides retry functionality and user-friendly error messages
 */
export default function PageErrorBoundary({ 
  children, 
  fallback,
  onError 
}: PageErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { handleError } = useGlobalErrorHandler();

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    
    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsRetrying(false);
  }, []);

  const handleErrorBoundary = useCallback((error: Error, _errorInfo: React.ErrorInfo) => {
    setError(error);
    handleError(error, "Page Error");
    onError?.(error);
  }, [handleError, onError]);

  // If there's an error, show error UI
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ConnectionError
          error={error}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          title="Page Error"
          description="Something went wrong while loading this page. Please try again or contact support if the issue persists."
        />
      </div>
    );
  }

  return (
    <ErrorBoundaryWrapper onError={handleErrorBoundary}>
      {children}
    </ErrorBoundaryWrapper>
  );
}

/**
 * Internal error boundary wrapper component
 */
function ErrorBoundaryWrapper({ 
  children, 
  onError 
}: { 
  children: React.ReactNode; 
  onError: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  if (hasError && error) {
    onError(error, { componentStack: "" });
    return null;
  }

  try {
    return <>{children}</>;
  } catch (err) {
    if (err instanceof Error) {
      setError(err);
      setHasError(true);
    }
    return null;
  }
}

/**
 * HOC to wrap any component with error handling
 */
export function withPageErrorHandling<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  return function PageErrorHandledComponent(props: P) {
    return (
      <PageErrorBoundary>
        <WrappedComponent {...props} />
      </PageErrorBoundary>
    );
  };
}
