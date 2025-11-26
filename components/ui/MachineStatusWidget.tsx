/**
 * Machine Status Widget Component
 * Widget component displaying machine online/offline status counts.
 *
 * Features:
 * - Online and offline machine counts
 * - Total count display (optional)
 * - Loading states with skeleton
 * - Responsive design
 * - Status badges
 *
 * @param isLoading - Whether data is loading
 * @param onlineCount - Number of online machines
 * @param offlineCount - Number of offline machines
 * @param totalCount - Total machine count (optional)
 * @param showTotal - Whether to show total count
 */
import React from 'react';
import Image from 'next/image';
import cabinetsIcon from '@/public/cabinetsIcon.svg';
import { Skeleton } from '@/components/ui/skeleton';

type MachineStatusWidgetProps = {
  isLoading?: boolean;
  onlineCount: number;
  offlineCount: number;
  totalCount?: number; // Optional total count to show "X/Y" format
  showTotal?: boolean; // Whether to show total count
};

export default function MachineStatusWidget({
  isLoading = false,
  onlineCount = 0,
  offlineCount = 0,
  totalCount,
  showTotal = false,
}: MachineStatusWidgetProps) {
  const total = totalCount ?? (onlineCount + offlineCount);
  if (isLoading) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5 sm:gap-3 sm:px-4">
        <Skeleton className="h-4 w-4 flex-shrink-0 rounded sm:h-5 sm:w-5" />
        <Skeleton className="h-4 w-16 flex-shrink-0 sm:w-24" />
        <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
          <Skeleton className="h-6 w-16 flex-shrink-0 rounded-full sm:w-24" />
          <Skeleton className="h-6 w-16 flex-shrink-0 rounded-full sm:w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-gray-100 bg-white px-3 py-2.5 sm:gap-3 sm:px-4">
      <Image
        src={cabinetsIcon}
        alt="Cabinets"
        width={24}
        height={24}
        className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5"
      />
      <span className="hidden flex-shrink-0 text-xs text-gray-600 sm:block sm:text-sm">
        Machine Status
      </span>
      <span className="flex-shrink-0 text-xs text-gray-600 sm:hidden">
        Status
      </span>
      <div className="flex min-w-0 flex-1 gap-1 overflow-hidden sm:gap-2">
        <span className="flex min-w-0 flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-green-50 px-1.5 py-1 text-xs text-green-700 sm:px-2">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500 sm:h-2 sm:w-2" />
          <span className="truncate">
            {showTotal 
              ? `${onlineCount.toLocaleString()}/${total.toLocaleString()} Online`
              : `${onlineCount.toLocaleString()} Online`
            }
          </span>
        </span>
        <span className="flex min-w-0 flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-red-50 px-1.5 py-1 text-xs text-red-700 sm:px-2">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500 sm:h-2 sm:w-2" />
          <span className="truncate">
            {offlineCount.toLocaleString()} Offline
          </span>
        </span>
      </div>
    </div>
  );
}
