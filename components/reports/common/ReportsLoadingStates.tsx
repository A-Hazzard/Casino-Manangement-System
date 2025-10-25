'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RefreshCw, Bell } from 'lucide-react';
import { ReportsPageSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';
import { useRouter } from 'next/navigation';

type LoadingOverlayProps = {
  isLoading: boolean;
};

type AuthLoadingProps = Record<string, never>;

type AccessDeniedProps = Record<string, never>;

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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-3 rounded-lg bg-white p-6 shadow-xl"
          >
            <RefreshCw className="h-6 w-6 animate-spin text-buttonActive" />
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
  return <ReportsPageSkeleton />;
}

/**
 * Access denied state when user has no permissions
 */
export function AccessDeniedState({}: AccessDeniedProps) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <Bell className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Access Restricted
        </h2>
        <p className="mb-4 text-gray-600">
          You don&apos;t have permission to access any reports. Please contact
          your administrator for access.
        </p>
        <Button
          onClick={() => router.push('/')}
          className="bg-buttonActive hover:bg-buttonActive/90"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
