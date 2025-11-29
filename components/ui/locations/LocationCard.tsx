'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import CurrencyValueWithOverflow from '@/components/ui/CurrencyValueWithOverflow';
import { Eye, Pencil } from 'lucide-react';
import { LocationCardData } from '@/lib/types/location';
import formatCurrency from '@/lib/utils/currency';
import {
  getMoneyInColorClass,
  getMoneyOutColorClass,
  getGrossColorClass,
} from '@/lib/utils/financialColors';
import { toast } from 'sonner';

export default function LocationCard({
  location,
  onLocationClick,
  onEdit,
  canManageLocations = true, // Default to true for backward compatibility
}: {
  location: LocationCardData['location'];
  onLocationClick: LocationCardData['onLocationClick'];
  onEdit: LocationCardData['onEdit'];
  canManageLocations?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              const locationName = (location as Record<string, unknown>).locationName as string;
              copyToClipboard(locationName, 'Location Name');
            }}
            className="truncate text-base font-semibold hover:text-blue-600 hover:underline cursor-pointer text-left"
            title="Click to copy location name"
          >
            {(location as Record<string, unknown>).locationName as string}
          </button>
          {typeof location.onlineMachines === 'number' && typeof location.totalMachines === 'number' && (() => {
            const online = location.onlineMachines;
            const total = location.totalMachines;
            const isAllOnline = total > 0 && online === total;
            const isAllOffline = total > 0 && online === 0;
            const hasMachines = total > 0;
            
            let badgeClass = 'flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';
            let dotClass = 'h-1.5 w-1.5 rounded-full';
            
            if (!hasMachines) {
              badgeClass += ' bg-gray-50 text-gray-600 ring-gray-200';
              dotClass += ' bg-gray-400';
            } else if (isAllOffline) {
              badgeClass += ' bg-red-50 text-red-700 ring-red-600/20';
              dotClass += ' bg-red-500';
            } else if (isAllOnline) {
              badgeClass += ' bg-green-50 text-green-700 ring-green-600/20';
              dotClass += ' bg-green-500';
            } else {
              badgeClass += ' bg-yellow-50 text-yellow-700 ring-yellow-600/20';
              dotClass += ' bg-yellow-500';
            }
            
            return (
              <span className={badgeClass}>
                <span className={dotClass}></span>
                {online}/{total} Online
              </span>
            );
          })()}
        </div>
      </div>

      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Money In</span>
          <CurrencyValueWithOverflow
            value={location.moneyIn ?? 0}
            className={`break-words text-right font-semibold ${getMoneyInColorClass(location.moneyIn)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Money Out</span>
          <CurrencyValueWithOverflow
            value={location.moneyOut ?? 0}
            className={`break-words text-right font-semibold ${getMoneyOutColorClass(location.moneyOut, location.moneyIn)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
      </div>

      <div className="mb-3 mt-1 flex justify-between">
        <span className="font-medium">Gross</span>
        <CurrencyValueWithOverflow
          value={location.gross ?? 0}
          className={`break-words text-right font-semibold ${getGrossColorClass(location.gross)}`}
          formatCurrencyFn={formatCurrency}
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => {
            const locationId = (location.location as string) || location._id;
            if (locationId) {
              onLocationClick(locationId);
            }
          }}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </Button>
        {canManageLocations && (
          <Button
            onClick={() => onEdit(location)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        )}
      </div>
    </div>
  );
}
