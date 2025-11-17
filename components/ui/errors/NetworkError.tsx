'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
type NetworkErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  isRetrying?: boolean;
  errorDetails?: string;
};

/**
 * Network Error Component
 * Displays when there are API failures, network issues, or server errors
 */
export default function NetworkError({
  title = 'Connection Error',
  message = 'Unable to connect to the server. Please check your internet connection and try again.',
  onRetry,
  showRetry = true,
  isRetrying = false,
  errorDetails,
}: NetworkErrorProps) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-md text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-50">
            <WifiOff className="h-12 w-12 text-orange-500" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-3 text-2xl font-bold text-gray-900"
        >
          {title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8 leading-relaxed text-gray-600"
        >
          {message}
        </motion.p>

        {/* Error Details (if provided) */}
        {errorDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
              <div className="text-left">
                <p className="mb-1 text-sm font-medium text-gray-700">
                  Error Details:
                </p>
                <p className="break-all font-mono text-xs text-gray-600">
                  {errorDetails}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Retry Button */}
        {showRetry && onRetry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="flex items-center gap-2 bg-button hover:bg-buttonActive disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
              />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          </motion.div>
        )}

        {/* Additional Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-sm text-gray-500"
        >
          <p className="mb-2">If the problem persists:</p>
          <ul className="mx-auto max-w-xs space-y-1 text-left">
            <li>• Check your internet connection</li>
            <li>• Refresh the page</li>
            <li>• Contact support if the issue continues</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
