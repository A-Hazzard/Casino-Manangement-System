/**
 * VariationCheckPanel
 *
 * Pre-submit variation check UI. Consumes the streaming check state from
 * `useVariationStreamCheck` and shows, verbosely, each machine being checked with a
 * live count, then the result (machines with variation) before the user confirms
 * submission. Replaces the old VariationCheckPopover.
 *
 * @module components/CMS/collectionReport/variations/VariationCheckPanel
 */

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import type {
  MachineVariationRow,
  VariationCheckResult,
  VariationCheckStatus,
} from '@/lib/hooks/collectionReport/useVariationStreamCheck';

type VariationCheckPanelProps = {
  isOpen: boolean;
  status: VariationCheckStatus;
  done: number;
  total: number;
  currentMachineName: string | null;
  result: VariationCheckResult | null;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
};

const fmt = (value: number | null): string =>
  value == null ? '—' : value.toLocaleString();

export function VariationCheckPanel({
  isOpen,
  status,
  done,
  total,
  currentMachineName,
  result,
  error,
  onConfirm,
  onCancel,
  onRetry,
}: VariationCheckPanelProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !isOpen) return null;

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const variationMachines: MachineVariationRow[] =
    result?.machines.filter(m => m.variation !== null && m.variation !== 0) ?? [];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-auto fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/50 p-3 sm:p-4"
        onPointerDownCapture={e => e.stopPropagation()}
        onMouseDownCapture={e => e.stopPropagation()}
      >
        <motion.div
          className="pointer-events-auto flex max-h-[92vh] w-auto min-w-[300px] max-w-[95vw] flex-col rounded-lg bg-white p-4 shadow-xl sm:max-h-[85vh] sm:max-w-2xl sm:p-6"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          exit={{ y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Checking — verbose per-machine progress */}
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-lg font-semibold text-gray-800">
                Checking for variations…
              </p>
              <p className="text-center text-sm text-gray-600">
                {done} / {total} machines checked
              </p>
              {currentMachineName && (
                <p className="max-w-xs truncate text-center text-xs text-gray-500">
                  Checking: {currentMachineName}
                </p>
              )}
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <Button variant="outline" onClick={onCancel} className="mt-2 w-full max-w-xs">
                Cancel
              </Button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-lg font-semibold text-gray-800">
                Error checking variations
              </p>
              <p className="text-center text-sm text-gray-600">{error}</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onRetry} className="flex-1">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Done — no variations */}
          {status === 'done' && !result?.hasVariations && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-gray-800">
                No variations found
              </p>
              <p className="text-center text-sm text-gray-600">
                Checked {result?.machines.length ?? 0} machines — all in sync with SAS
                data
              </p>
              <div className="flex w-full gap-2 pt-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Submit
                </Button>
              </div>
            </div>
          )}

          {/* Done — variations found */}
          {status === 'done' && result?.hasVariations && (
            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-10 w-10 text-amber-500" />
                <p className="text-lg font-semibold text-gray-800">
                  Variations found
                </p>
                <p className="text-sm text-gray-600">
                  {variationMachines.length} / {result.machines.length} machines with
                  variation
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-md border border-gray-100">
                <table className="w-full min-w-[26rem] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Machine</th>
                      <th className="px-2 py-1.5 text-right font-medium">Machine Gross</th>
                      <th className="px-2 py-1.5 text-right font-medium">SAS Gross</th>
                      <th className="px-2 py-1.5 text-right font-medium">Variation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variationMachines.map(machine => (
                      <tr key={machine.machineId} className="border-t border-gray-100">
                        <td className="max-w-[8rem] truncate px-2 py-1.5 sm:max-w-[18rem]">
                          {machine.machineName}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                          {fmt(machine.meterGross)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                          {fmt(machine.sasGross)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums ${
                            (machine.variation ?? 0) < 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {fmt(machine.variation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={onCancel} className="w-full">
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="w-full border-b-4 border-green-800 bg-green-600 font-bold hover:bg-green-700"
                >
                  Confirm &amp; Submit with Variation
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
