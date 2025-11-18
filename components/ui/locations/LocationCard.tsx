'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import CurrencyValueWithOverflow from '@/components/ui/CurrencyValueWithOverflow';
import { Database, MapPin, Eye, Pencil } from 'lucide-react';
import { LocationCardData } from '@/lib/types/location';
import formatCurrency from '@/lib/utils/currency';

export default function LocationCard({
  location,
  onLocationClick,
  onEdit,
}: {
  location: LocationCardData['location'];
  onLocationClick: LocationCardData['onLocationClick'];
  onEdit: LocationCardData['onEdit'];
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardClick = () => {
    onLocationClick(location._id);
  };

  return (
    <div
      ref={cardRef}
      className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {typeof location.onlineMachines === 'number' && (
        <span
          className={`absolute right-3 top-3 z-10 h-3 w-3 rounded-full border-2 border-white ${
            location.onlineMachines > 0
              ? 'animate-pulse-slow bg-green-500'
              : 'bg-red-500'
          }`}
          title={location.onlineMachines > 0 ? 'Online' : 'Offline'}
        />
      )}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate text-base font-semibold">
            {(location as Record<string, unknown>).locationName as string}
          </h3>
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
            className="break-words text-right font-semibold text-foreground"
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Money Out</span>
          <CurrencyValueWithOverflow
            value={location.moneyOut ?? 0}
            className="break-words text-right font-semibold text-foreground"
            formatCurrencyFn={formatCurrency}
          />
        </div>
      </div>

      <div className="mb-3 mt-1 flex justify-between">
        <span className="font-medium">Gross</span>
        <CurrencyValueWithOverflow
          value={location.gross ?? 0}
          className={`break-words text-right font-semibold ${
            (location.gross ?? 0) < 0 ? 'text-destructive' : 'text-button'
          }`}
          formatCurrencyFn={formatCurrency}
        />
      </div>

      <div className="mt-2 flex justify-between gap-2">
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-blueHighlight px-2 py-1 text-xs text-primary-foreground"
        >
          <Database className="mr-1 h-3 w-3" />
          {location.totalMachines} MACHINES
        </Button>
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-button px-2 py-1 text-xs text-primary-foreground"
        >
          <MapPin className="mr-1 h-3 w-3" />
          {location.onlineMachines} ONLINE
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => handleCardClick()}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View Details</span>
        </Button>
        <Button
          onClick={() => onEdit(location)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Button>
      </div>
    </div>
  );
}
