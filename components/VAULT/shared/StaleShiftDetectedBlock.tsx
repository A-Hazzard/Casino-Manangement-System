'use client';

import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface StaleShiftDetectedBlockProps {
  isStale: boolean;
  openedAt: Date | string | null | undefined;
  type: 'cashier' | 'vault';
  children?: React.ReactNode;
}

/**
 * Reusable component to block interactions when a stale shift is detected.
 * Shows a high-prominence alert and a link to the appropriate closure page.
 */
export default function StaleShiftDetectedBlock({
  isStale,
  openedAt,
  children,
}: StaleShiftDetectedBlockProps) {
  if (!isStale) {
    return <>{children}</>;
  }

  const shiftDate = openedAt
    ? format(
        typeof openedAt === 'string' ? new Date(openedAt) : openedAt,
        'MMM do, yyyy'
      )
    : 'Unknown Date';

  return (
    <div className="flex flex-col gap-4">
      {/* Non-blocking Warning Banner */}
      <div className="-mx-6 mb-2 border-y border-amber-200 bg-amber-50 px-6 py-3 duration-500 animate-in slide-in-from-top">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-amber-300 bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-amber-900">
                STALE SHIFT DETECTED
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Started on {shiftDate}. Operations are restricted. Please{' '}
                <span className="font-bold">Close Day</span> to resolve.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full border border-amber-600/20 bg-amber-600/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
              Read-Only Mode Active
            </div>
          </div>
        </div>
      </div>

      {/* Always render children normally */}
      <div className="relative">{children}</div>
    </div>
  );
}
