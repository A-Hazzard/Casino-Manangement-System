/**
 * Floating Refresh Button Component
 * Floating refresh button that appears on scroll with animations.
 *
 * Features:
 * - Fixed position floating button
 * - Conditional visibility
 * - Loading/spinning state
 * - Framer Motion animations
 * - Hover and tap animations
 * - Accessible button
 *
 * @param show - Whether the button should be visible
 * @param refreshing - Whether refresh is in progress
 * @param onRefresh - Callback when refresh is clicked
 */
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

type FloatingRefreshButtonProps = {
  show: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export const FloatingRefreshButton = ({
  show,
  refreshing,
  onRefresh,
}: FloatingRefreshButtonProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <motion.button
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-full bg-button p-3 text-container shadow-lg transition-colors duration-200 hover:bg-buttonActive disabled:cursor-not-allowed disabled:opacity-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RefreshCw
              className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`}
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
