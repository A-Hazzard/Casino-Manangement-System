'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo } from 'react';

import type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
} from '@/lib/types/errors';

/**
 * ErrorBoundary component to catch and handle React errors gracefully
 *
 * @param children - React components to wrap
 * @param fallback - Custom fallback UI to show when error occurs
 * @param onError - Callback function called when error occurs
 * @param resetOnPropsChange - Whether to reset error state when props change
 * @param resetKeys - Array of keys to watch for changes to reset error state
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (
        resetKeys &&
        prevProps.resetKeys &&
        resetKeys.length === prevProps.resetKeys.length
      ) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }

    if (
      hasError &&
      resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    }, 100);
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <Card className="mx-auto max-w-md border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-red-800">Something went wrong</CardTitle>
            <CardDescription className="text-red-700">
              An unexpected error occurred while loading this component.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {error && (
              <div className="rounded-md bg-red-100 p-3 text-sm text-red-600">
                <strong>Error:</strong> {error.message}
              </div>
            )}

            <Button
              onClick={this.resetErrorBoundary}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <div className="text-xs text-red-600">
              <p>
                If this problem persists, please refresh the page or contact
                support.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

