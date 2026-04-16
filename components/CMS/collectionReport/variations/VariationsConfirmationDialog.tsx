import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';

interface VariationsConfirmationDialogProps {
  isOpen: boolean;
  machineCount: number;
  totalVariation: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VariationsConfirmationDialog({
  isOpen,
  machineCount,
  totalVariation,
  isLoading = false,
  onConfirm,
  onCancel,
}: VariationsConfirmationDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/50 p-4"
          style={{ pointerEvents: 'auto' }}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Variations Detected</h2>
                <p className="mt-2 text-sm text-gray-600">
                  You have <span className="font-semibold">{machineCount}</span> {machineCount === 1 ? 'machine' : 'machines'} with{' '}
                  <span className="font-semibold">variation{machineCount === 1 ? '' : 's'}</span> (Total: {Math.abs(totalVariation).toLocaleString(undefined, { maximumFractionDigits: 2 })}).
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Are you sure you want to submit the report with variations? You can go back and edit the machines if needed.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? 'Submitting...' : 'Continue Anyway'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
