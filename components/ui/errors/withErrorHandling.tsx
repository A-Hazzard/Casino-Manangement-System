"use client";

import React, { ComponentType, useState, useCallback } from "react";
import { classifyError, type ApiError } from "@/lib/utils/errorHandling";
import { showErrorNotification } from "@/lib/utils/errorNotifications";
import ConnectionError from "./ConnectionError";

export interface WithErrorHandlingProps {
  onError?: (error: ApiError) => void;
  onRetry?: () => void;
  showErrorUI?: boolean;
  errorTitle?: string;
  errorDescription?: string;
}

/**
 * Higher-order component that adds error handling to any component
 * 
 * @param WrappedComponent - The component to wrap with error handling
 * @param options - Configuration options for error handling
 * @returns Enhanced component with error handling
 */
export function withErrorHandling<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithErrorHandlingProps = {}
) {
  const {
    onError,
    onRetry,
    showErrorUI = true,
    errorTitle = "Something went wrong",
    errorDescription = "An error occurred while loading this content. Please try again.",
  } = options;

  return function ErrorHandledComponent(props: P) {
    const [error, setError] = useState<ApiError | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((err: unknown) => {
    const apiError = classifyError(err);
    setError(apiError);
    
    // Show notification
    showErrorNotification(apiError);
    
    // Call custom error handler
    onError?.(apiError);
  }, []);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    
    try {
      // Call custom retry handler
      await onRetry?.();
    } catch (err) {
      handleError(err);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

    // If there's an error and we should show error UI
    if (error && showErrorUI) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <ConnectionError
            error={error.message}
            onRetry={handleRetry}
            isRetrying={isRetrying}
            title={errorTitle}
            description={errorDescription}
          />
        </div>
      );
    }

    // Render the wrapped component with error handling props
    return (
      <WrappedComponent
        {...props}
        onError={handleError}
        onRetry={handleRetry}
        error={error}
        isRetrying={isRetrying}
      />
    );
  };
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandling() {
  const [error, setError] = useState<ApiError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((err: unknown) => {
    const apiError = classifyError(err);
    setError(apiError);
    showErrorNotification(apiError);
  }, []);

  const handleRetry = useCallback(async (retryFn?: () => Promise<void>) => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await retryFn?.();
    } catch (err) {
      handleError(err);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  return {
    error,
    isRetrying,
    handleError,
    handleRetry,
    clearError,
  };
}
