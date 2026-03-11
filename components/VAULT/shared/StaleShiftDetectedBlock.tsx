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
  type: _type,
  children
}: StaleShiftDetectedBlockProps) {

  if (!isStale) {
    return <>{children}</>;
  }

  const shiftDate = openedAt 
    ? format(typeof openedAt === 'string' ? new Date(openedAt) : openedAt, 'MMM do, yyyy')
    : 'Unknown Date';

  return (
    <div className="flex flex-col gap-4">
      {/* Non-blocking Warning Banner */}
      <div className="bg-amber-50 border-y border-amber-200 py-3 px-6 -mx-6 mb-2 animate-in slide-in-from-top duration-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full border border-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 leading-none">
                STALE SHIFT DETECTED
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Started on {shiftDate}. Operations are restricted. Please <span className="font-bold">Close Day</span> to resolve.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-amber-600/10 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-600/20">
              Read-Only Mode Active
            </div>
          </div>
        </div>
      </div>
      
      {/* Always render children normally */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
