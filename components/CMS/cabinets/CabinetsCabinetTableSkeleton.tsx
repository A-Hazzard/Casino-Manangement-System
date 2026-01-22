/**
 * Cabinets Cabinet Table Skeleton Component
 *
 * Loading skeleton for the cabinet table view.
 * Matches the exact structure of CabinetsCabinetTable component.
 *
 * @module components/cabinets/CabinetsCabinetTableSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';
import { useEffect, useState } from 'react';

export default function CabinetsCabinetTableSkeleton() {
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
              {/* Asset/Status Column - matches CabinetsCabinetTable structure */}
              <td className="w-[240px] p-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                </div>
              </td>
              {/* Money In */}
              <td className="p-3">
                <div className="flex justify-center">
                  <Skeleton className="h-5 w-20" />
                </div>
              </td>
              {/* Money Out */}
              <td className="p-3">
                <div className="flex justify-center">
                  <Skeleton className="h-5 w-20" />
                </div>
              </td>
              {/* Jackpot */}
              <td className="p-3">
                <div className="flex justify-center">
                  <Skeleton className="h-5 w-20" />
                </div>
              </td>
              {/* Gross */}
              <td className="p-3">
                <div className="flex justify-center">
                  <Skeleton className="h-5 w-20" />
                </div>
              </td>
              {/* Actions */}
              <td className="p-3">
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

