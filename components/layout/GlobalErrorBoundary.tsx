/**
 * Global Error Boundary Component
 * Application-wide error boundary that catches and handles all errors.
 *
 * Features:
 * - Catches React component errors
 * - Handles global window errors
 * - Catches unhandled promise rejections
 * - Shows user-friendly error UI
 * - Provides retry functionality
 * - Logs errors in development mode
 * - Can integrate with error reporting services (Sentry, LogRocket)
 *
 * @param children - Child components to wrap with error boundary
 */
"use client";

import React, { useState, useEffect } from "react";
import ErrorBoundary from "@/components/ui/errors/ErrorBoundary";
import ConnectionError from "@/components/ui/errors/ConnectionError";

export default function GlobalErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [globalError, setGlobalError] = useState<Error | null>(null);

  // ============================================================================
  // Effects - Global Error Handlers
  // ============================================================================
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setGlobalError(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignore canceled/aborted requests - these are expected when user changes filters or navigates
      const reason = event.reason;
      if (reason && typeof reason === 'object') {
        const errorName = (reason as Error).name || (reason as { name?: string }).name;
        const errorMessage = (reason as Error).message || (reason as { message?: string }).message;
        
        if (errorName === 'AbortError' || errorName === 'CanceledError' || errorMessage === 'canceled') {
          console.log("🔍 [GlobalErrorBoundary] Ignored canceled request");
          event.preventDefault(); // Prevent default error handling
          return;
        }
      }
      
      console.error("Unhandled promise rejection:", event.reason);
      setGlobalError(
        new Error(event.reason?.message || "Unhandled promise rejection")
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  // ============================================================================
  // Render - Error UI or Error Boundary Wrapper
  // ============================================================================

  if (globalError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Global Error Boundary caught an error:",
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
        <div className="min-h-screen flex items-center justify-center p-4">
          <ConnectionError
            error={globalError || new Error("Unknown application error")}
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
