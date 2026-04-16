/**
 * Global Error Boundary Component
 * Application-wide error boundary that catches and handles all errors.
 *
 * Behaviour by role:
 * - Developers: full technical error details (stack trace + React component stack)
 * - Everyone else: friendly "under maintenance" screen
 *
 * Error details are always logged to the server via /api/client-errors.
 *
 * @param children - Child components to wrap with error boundary
 */
'use client';

import { useState, useEffect, useCallback, ErrorInfo } from 'react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import ErrorBoundary from '@/components/shared/ui/errors/ErrorBoundary';
import { useUserStore } from '@/lib/store/userStore';
import { AlertTriangle, Copy, Check, RefreshCw, Wrench } from 'lucide-react';

// ============================================================================
// Error report sender
// ============================================================================
async function sendErrorToServer(
  error: Error,
  componentStack: string | undefined,
  context: 'window' | 'react' | 'promise'
) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: componentStack ?? '(none)',
        context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // Silent
  }
}

// ============================================================================
// Copy button
// ============================================================================
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700 transition-colors hover:bg-red-50"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy Report
        </>
      )}
    </button>
  );
}

// ============================================================================
// Developer error view — full technical details
// ============================================================================
type ErrorDetails = { error: Error; componentStack?: string };

function DeveloperErrorView({
  details,
  onRetry,
}: {
  details: ErrorDetails;
  onRetry: () => void;
}) {
  const { error, componentStack } = details;

  const report = [
    `=== Error Report ===`,
    `Time: ${new Date().toISOString()}`,
    `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
    ``,
    `Message: ${error.message}`,
    ``,
    `JS Stack:`,
    error.stack ?? '(none)',
    ``,
    `React Component Stack:`,
    componentStack ?? '(none)',
  ].join('\n');

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-red-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-6 py-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-800">
              Runtime Error{' '}
              <span className="text-sm font-normal text-red-600">
                (developer view)
              </span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-red-600">
              {error.message}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {/* Component stack — most useful in production */}
          {componentStack && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
                React Component Stack{' '}
                <span className="font-normal text-red-500">
                  (read top-down)
                </span>
              </p>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-red-200 bg-gray-950 p-3 font-mono text-[10px] leading-relaxed text-green-300">
                {componentStack}
              </pre>
            </div>
          )}

          {/* JS stack */}
          <details>
            <summary className="mb-1.5 cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-red-700">
              JS Stack Trace
            </summary>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-red-200 bg-gray-950 p-3 font-mono text-[10px] leading-relaxed text-gray-200">
              {error.stack ?? '(none)'}
            </pre>
          </details>

          <div className="flex flex-wrap items-center gap-3 border-t border-red-100 pt-2">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700 transition-colors hover:bg-red-50"
            >
              <RefreshCw className="h-3 w-3" /> Reload
            </button>
            <CopyButton text={report} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// End-user maintenance screen
// ============================================================================
function MaintenanceScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Wrench className="h-8 w-8 text-blue-600" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold text-gray-800">
          This page is currently under maintenance
        </h1>
        <p className="text-sm text-gray-500">
          We&apos;re working to resolve this as quickly as possible. Please try
          again in a few moments or contact support if the issue persists.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

// ============================================================================
// Global Error Boundary
// ============================================================================
export default function GlobalErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const { user } = useUserStore();

  const isDeveloper =
    user?.roles
      ?.filter((r): r is string => typeof r === 'string')
      ?.some(r => r === 'developer') ?? false;

  const handleWindowError = useCallback((event: ErrorEvent) => {
    const error = event.error as Error | null;
    if (!error) return;

    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('chunk') ||
      error.message?.includes('Loading chunk')
    ) {
      console.warn('[GlobalErrorBoundary] ChunkLoadError — reloading...');
      setTimeout(() => window.location.reload(), 1000);
      return;
    }

    console.error(
      '[GlobalErrorBoundary] Uncaught error:',
      error.message,
      '\nStack:',
      error.stack
    );
    sendErrorToServer(error, undefined, 'window');
    setErrorDetails({ error });
  }, []);

  const handleUnhandledRejection = useCallback(
    (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object') {
        const name = (reason as Error).name;
        const message = (reason as Error).message;
        if (
          name === 'AbortError' ||
          name === 'CanceledError' ||
          message === 'canceled'
        ) {
          event.preventDefault();
          return;
        }
      }
      const error =
        reason instanceof Error
          ? reason
          : new Error(String((reason as Error)?.message ?? reason));

      console.error(
        '[GlobalErrorBoundary] Unhandled rejection:',
        error.message
      );
      sendErrorToServer(error, undefined, 'promise');
      setErrorDetails({ error });
    },
    []
  );

  useEffect(() => {
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, [handleWindowError, handleUnhandledRejection]);

  // Reset error state when URL changes (e.g., after logout redirects)
  const pathname = usePathname();
  useEffect(() => {
    // Clear error state when URL changes to prevent stale error displays
    setErrorDetails(null);
  }, [pathname]);

  const handleReactError = useCallback((error: Error, info: ErrorInfo) => {
    const componentStack = info.componentStack ?? undefined;
    console.error(
      '[GlobalErrorBoundary] React component error:',
      error.message,
      '\nComponent stack:',
      componentStack,
      '\nJS stack:',
      error.stack
    );
    sendErrorToServer(error, componentStack, 'react');
    setErrorDetails({ error, componentStack });
  }, []);

  const retry = useCallback(() => {
    setErrorDetails(null);
    window.location.reload();
  }, []);

  if (errorDetails) {
    return isDeveloper ? (
      <DeveloperErrorView details={errorDetails} onRetry={retry} />
    ) : (
      <MaintenanceScreen onRetry={retry} />
    );
  }

  const fallback =
    isDeveloper && errorDetails ? (
      <DeveloperErrorView details={errorDetails} onRetry={retry} />
    ) : (
      <MaintenanceScreen onRetry={retry} />
    );

  return (
    <ErrorBoundary onError={handleReactError} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
