"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Bell } from "lucide-react";

interface LoadingOverlayProps {
  isLoading: boolean;
}

interface AuthLoadingProps {
  // No props needed for now
}

interface AccessDeniedProps {
  // No props needed for now
}

/**
 * Loading overlay for reports operations
 */
export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3"
          >
            <RefreshCw className="w-6 h-6 animate-spin text-buttonActive" />
            <span className="text-lg font-medium">Loading reports...</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Loading state while authentication is being checked
 */
export function AuthLoadingState({}: AuthLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-buttonActive" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Access denied state when user has no permissions
 */
export function AccessDeniedState({}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-gray-600 mb-4">
          You don&apos;t have permission to access any reports. Please contact
          your administrator for access.
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          className="bg-buttonActive hover:bg-buttonActive/90"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
