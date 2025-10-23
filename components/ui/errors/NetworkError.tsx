"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
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
  title = "Connection Error",
  message = "Unable to connect to the server. Please check your internet connection and try again.",
  onRetry,
  showRetry = true,
  isRetrying = false,
  errorDetails,
}: NetworkErrorProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md mx-auto"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <div className="w-24 h-24 mx-auto bg-orange-50 rounded-full flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-orange-500" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-3"
        >
          {title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-8 leading-relaxed"
        >
          {message}
        </motion.p>

        {/* Error Details (if provided) */}
        {errorDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Error Details:
                </p>
                <p className="text-xs text-gray-600 font-mono break-all">
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
                className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              {isRetrying ? "Retrying..." : "Try Again"}
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
          <ul className="text-left max-w-xs mx-auto space-y-1">
            <li>• Check your internet connection</li>
            <li>• Refresh the page</li>
            <li>• Contact support if the issue continues</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
