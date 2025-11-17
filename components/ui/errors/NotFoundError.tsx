'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
type NotFoundErrorProps = {
  title?: string;
  message?: string;
  resourceType?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
  customBackText?: string;
  customBackHref?: string;
};

/**
 * 404 Not Found Error Component with animated design
 * Displays when a specific resource (cabinet, location, etc.) is not found
 * Automatically determines context-aware navigation based on current route
 */
export default function NotFoundError({
  title = 'Resource Not Found',
  message = 'The requested resource could not be found.',
  resourceType = 'resource',
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = true,
  customBackText,
  customBackHref,
}: NotFoundErrorProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine context-aware navigation
  const getContextualNavigation = () => {
    // If custom navigation is provided, use it
    if (customBackText && customBackHref) {
      return {
        text: customBackText,
        href: customBackHref,
        isDashboard: false,
      };
    }

    // Determine based on current path
    if (pathname.includes('/cabinets/')) {
      return {
        text: 'Back to Cabinets',
        href: '/cabinets',
        isDashboard: false,
      };
    }

    if (pathname.includes('/locations/')) {
      return {
        text: 'Back to Locations',
        href: '/locations',
        isDashboard: false,
      };
    }

    if (pathname.includes('/members/')) {
      return {
        text: 'Back to Members',
        href: '/members',
        isDashboard: false,
      };
    }

    if (pathname.includes('/sessions/')) {
      return {
        text: 'Back to Sessions',
        href: '/sessions',
        isDashboard: false,
      };
    }

    if (pathname.includes('/collection-report/report/')) {
      return {
        text: 'Back to Collection Reports',
        href: '/collection-reports',
        isDashboard: false,
      };
    }

    if (pathname.includes('/reports/')) {
      return {
        text: 'Back to Reports',
        href: '/reports',
        isDashboard: false,
      };
    }

    // Default to dashboard for unknown routes
    return {
      text: 'Go to Dashboard',
      href: '/',
      isDashboard: true,
    };
  };

  const navigation = getContextualNavigation();

  const handleNavigation = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.push(navigation.href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-lg text-center"
      >
        {/* Large 404 Number */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          className="mb-6"
        >
          <h1 className="mb-2 text-8xl font-bold text-buttonActive">404</h1>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4 text-3xl font-bold text-gray-800"
        >
          {title}
        </motion.h2>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8 text-lg leading-relaxed text-gray-600"
        >
          {message}
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col justify-center gap-4 sm:flex-row"
        >
          {showGoBack && (
            <Button
              onClick={handleNavigation}
              className={`flex items-center gap-2 px-6 py-3 ${
                navigation.isDashboard
                  ? 'bg-buttonActive hover:bg-buttonActive/90'
                  : 'bg-button hover:bg-buttonActive'
              }`}
            >
              {navigation.isDashboard ? (
                <Home className="h-5 w-5" />
              ) : (
                <ArrowLeft className="h-5 w-5" />
              )}
              {navigation.text}
            </Button>
          )}

          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex items-center gap-2 border-2 px-6 py-3"
            >
              <RefreshCw className="h-5 w-5" />
              Try Again
            </Button>
          )}
        </motion.div>

        {/* Additional Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-sm text-gray-500"
        >
          <p className="mb-3">
            If this {resourceType} should exist, please check:
          </p>
          <ul className="mx-auto max-w-sm space-y-1 text-left">
            <li>• The URL is correct</li>
            <li>• You have permission to access it</li>
            <li>• The {resourceType} hasn&apos;t been deleted</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
