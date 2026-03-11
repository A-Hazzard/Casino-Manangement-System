/**
 * Error Boundary Types
 * Types for React error boundary component.
 *
 * Defines props and state for error boundaries that catch React component
 * errors with fallback UI and error callbacks.
 */
import type { ReactNode, ErrorInfo } from 'react';

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
};

