'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Database, MapPin } from 'lucide-react';
import { LocationCardData } from '@/lib/types/location';
import formatCurrency from '@/lib/utils/currency';
import editIcon from '@/public/editIcon.svg';

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
      className="relative mx-auto w-full cursor-pointer rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={e => {
        if (!(e.target as HTMLElement).closest('.action-buttons')) {
          handleCardClick();
        }
      }}
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
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {(location as Record<string, unknown>).locationName as string}
        </h3>
        <div className="action-buttons flex gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              onEdit(location);
            }}
            className="text-button"
          >
            <Image src={editIcon} alt="Edit" width={20} height={20} />
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Money In</span>
          <span className="break-words text-right font-semibold text-foreground">
            {formatCurrency(location.moneyIn ?? 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Money Out</span>
          <span className="break-words text-right font-semibold text-foreground">
            {formatCurrency(location.moneyOut ?? 0)}
          </span>
        </div>
      </div>

      <div className="mb-3 mt-1 flex justify-between">
        <span className="font-medium">Gross</span>
        <span
          className={`break-words text-right font-semibold ${
            (location.gross ?? 0) < 0 ? 'text-destructive' : 'text-button'
          }`}
        >
          {formatCurrency(location.gross ?? 0)}
        </span>
      </div>

      <div className="action-buttons mt-2 flex justify-between gap-2">
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-blueHighlight px-2 py-1 text-xs text-primary-foreground"
          onClick={e => e.stopPropagation()}
        >
          <Database className="mr-1 h-3 w-3" />
          {location.totalMachines} MACHINES
        </Button>
        <Button
          className="flex h-auto items-center space-x-1 rounded-md bg-button px-2 py-1 text-xs text-primary-foreground"
          onClick={e => e.stopPropagation()}
        >
          <MapPin className="mr-1 h-3 w-3" />
          {location.onlineMachines} ONLINE
        </Button>
      </div>
    </div>
  );
}
