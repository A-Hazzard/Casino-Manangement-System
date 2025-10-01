"use client";

import React from "react";
import ErrorBoundary from "@/components/ui/errors/ErrorBoundary";
import ConnectionError from "@/components/ui/errors/ConnectionError";

/**
 * Global error boundary wrapper for the entire application
 * Handles both React errors and API connection errors
 */
export default function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (process.env.NODE_ENV === "development") {
          console.error("Global Error Boundary caught an error:", error, errorInfo);
        }
        
        // In production, you might want to send this to an error reporting service
        // like Sentry, LogRocket, etc.
      }}
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <ConnectionError
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
