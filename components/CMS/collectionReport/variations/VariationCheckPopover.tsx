import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import type { VariationsCheckResponse } from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';

interface VariationCheckPopoverProps {
  isOpen: boolean;
  isChecking: boolean;
  hasVariations: boolean | null;
  error: string | null;
  variationsData: VariationsCheckResponse | null;
  onMinimize: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function VariationCheckPopover({
  isOpen,
  isChecking,
  hasVariations,
  error,
  variationsData,
  onMinimize,
  onSubmit,
  onRetry,
  onClose,
  isLoading = false,
}: VariationCheckPopoverProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  const machineWithVariationsCount = variationsData?.machines.filter(m => typeof m.variation === 'number' && m.variation !== 0).length || 0;
  const totalMachinesCount = variationsData?.machines.length || 0;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/50 p-4"
        style={{ pointerEvents: 'auto' }}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
      >
        <motion.div
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          exit={{ y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Checking State */}
          {isChecking && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-12 w-12 text-blue-500" />
              </motion.div>
              <p className="text-center text-lg font-semibold text-gray-800">Checking for variations...</p>
              <p className="text-center text-sm text-gray-600">Please wait while we analyze the data</p>
            </div>
          )}

          {/* No Variations State */}
          {!isChecking && hasVariations === false && !error && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">No variations found</p>
                <p className="text-sm text-gray-600">All machines are in sync with SAS data</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
                  Submit
                </Button>
              </div>
            </div>
          )}

          {/* Variations Found State */}
          {!isChecking && hasVariations === true && !error && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                <AlertCircle className="h-12 w-12 text-amber-500" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">Variations found</p>
                <p className="text-sm text-gray-600">
                  {machineWithVariationsCount} / {totalMachinesCount} machines with variation
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={onMinimize} className="flex-1 bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100">
                    View Details
                  </Button>
                </div>
                <Button onClick={onSubmit} className="w-full bg-green-600 hover:bg-green-700 font-bold border-b-4 border-green-800 transition-all">
                  Confirm & Submit with Variation
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isChecking && error && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                <AlertCircle className="h-12 w-12 text-red-500" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">Error checking variations</p>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={onRetry}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
