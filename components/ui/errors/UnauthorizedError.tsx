'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

type UnauthorizedErrorProps = {
  title?: string;
  message?: string;
  resourceType?: 'cabinet' | 'machine' | 'location' | 'report' | 'resource';
  onGoBack?: () => void;
  customBackText?: string;
  customBackHref?: string;
};

/**
 * Unauthorized Error Component
 * Displays when a user doesn't have access to a specific resource
 */
export default function UnauthorizedError({
  title = 'Access Denied',
  message,
  resourceType = 'resource',
  onGoBack,
  customBackText,
  customBackHref,
}: UnauthorizedErrorProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const getDefaultMessage = () => {
    if (message) return message;
    
    const resourceName = resourceType === 'cabinet' 
      ? 'this cabinet' 
      : resourceType === 'machine'
      ? 'this machine'
      : resourceType === 'location'
      ? 'this location'
      : resourceType === 'report'
      ? 'this collection report'
      : 'this resource';
    
    return `You are not authorized to view details for ${resourceName}.`;
  };

  const getResourceName = () => {
    return resourceType === 'cabinet' 
      ? 'cabinet' 
      : resourceType === 'machine'
      ? 'machine'
      : resourceType === 'location'
      ? 'location'
      : resourceType === 'report'
      ? 'collection report'
      : 'resource';
  };

  const getRedirectPath = useCallback(() => {
    if (customBackHref) return customBackHref;
    if (resourceType === 'cabinet' || resourceType === 'machine') return '/cabinets';
    if (resourceType === 'location') return '/locations';
    if (resourceType === 'report') return '/collection-report';
    return '/';
  }, [customBackHref, resourceType]);

  const handleGoBack = useCallback(() => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.push(getRedirectPath());
    }
  }, [onGoBack, router, getRedirectPath]);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isRedirecting) {
      setIsRedirecting(true);
      setTimeout(() => {
        handleGoBack();
      }, 500);
    }
    return undefined;
  }, [countdown, isRedirecting, handleGoBack]);

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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
            <ShieldX className="h-12 w-12 text-red-500" />
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
          className="mb-6 leading-relaxed text-gray-600"
        >
          {getDefaultMessage()}
        </motion.p>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-left">
              <p className="mb-2 text-sm font-medium text-gray-900">
                Need access to this {getResourceName()}?
              </p>
              <p className="text-sm text-gray-700">
                Please contact your manager or customer support if you would like to have access to this {getResourceName()}.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Countdown Timer */}
        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-4 text-sm text-gray-500"
          >
            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </motion.div>
        )}

        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 text-sm text-gray-500"
          >
            Redirecting...
          </motion.div>
        )}

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleGoBack}
            className="flex items-center gap-2 bg-button hover:bg-buttonActive"
          >
            <ArrowLeft className="h-4 w-4" />
            {customBackText || 'Go Back'}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

