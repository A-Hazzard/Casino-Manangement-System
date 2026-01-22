/**
 * Floating Action Buttons Component
 * Combined floating buttons container with refresh and feedback buttons.
 *
 * Features:
 * - Fixed position floating buttons container
 * - Refresh button appears on scroll
 * - Feedback button always visible
 * - Vertical stack layout (refresh above feedback)
 * - Framer Motion animations
 * - Proper z-index management
 * - Responsive design
 *
 * @param showRefresh - Whether the refresh button should be visible
 * @param refreshing - Whether refresh is in progress
 * @param onRefresh - Callback when refresh is clicked
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import FeedbackForm from '@/components/shared/ui/FeedbackForm';
import { useState, useEffect } from 'react';

type FloatingActionButtonsProps = {
  showRefresh: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export const FloatingActionButtons = ({
  showRefresh,
  refreshing,
  onRefresh,
}: FloatingActionButtonsProps) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid rendering on the server to prevent hydration mismatches
  if (!mounted) {
    return null;
  }

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3"
      >
        {/* Refresh Button - appears on scroll */}
        <AnimatePresence>
          {showRefresh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-button p-3 text-container shadow-lg transition-colors duration-200 hover:bg-buttonActive disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`}
                />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Button - always visible */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setIsFeedbackOpen(true)}
              className="h-14 w-14 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700"
              size="icon"
              aria-label="Provide feedback"
            >
              <MessageSquare className="h-6 w-6 text-white" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Feedback Form Modal */}
      <FeedbackForm
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </>
  );
};

