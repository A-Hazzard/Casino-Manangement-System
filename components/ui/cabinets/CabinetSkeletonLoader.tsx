'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';


/**
 * Cabinet Table Skeleton Loader
 * Matches the exact structure of CabinetTable component
 */
export function CabinetTableSkeleton() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Don't render on server to prevent hydration mismatch
  }

  return (
    <div className="w-full overflow-x-auto bg-white shadow">
      <table className="w-full">
        <thead>
          <tr className="bg-[#00b517] hover:bg-[#00b517]">
            <th className="relative w-[240px] p-3 text-left font-semibold text-white">
              <span>ASSET NUMBER</span>
            </th>
            <th className="relative p-3 text-center font-semibold text-white">
              <span>MONEY IN</span>
            </th>
            <th className="relative p-3 text-center font-semibold text-white">
              <span>MONEY OUT</span>
            </th>
            <th className="relative p-3 text-center font-semibold text-white">
              <span>JACKPOT</span>
            </th>
            <th className="relative p-3 text-center font-semibold text-white">
              <span>GROSS</span>
            </th>
            <th className="p-3 text-center font-semibold text-white">
              <span>ACTIONS</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200 hover:bg-grayHighlight/10">
              {/* Asset/Status Column - matches CabinetTable structure */}
              <td className="w-[240px] p-3">
                <div className="space-y-1">
                  {/* Row 1: Serial Number/Asset Number */}
                  <div className="min-w-0">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  {/* Row 2: Location Name with icon */}
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-3 rounded flex-shrink-0" />
                  </div>
                  {/* Row 3: SMIB and Status Badge */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                  </div>
                  {/* Row 4: Last Activity */}
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded flex-shrink-0" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </td>
              {/* Financial Columns (Centered) */}
              {[...Array(4)].map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="p-3 text-center align-middle text-sm"
                >
                  <Skeleton className="mx-auto h-4 w-20" />
                </td>
              ))}
              {/* Actions Column (Centered) */}
              <td className="p-3 text-center align-middle text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
