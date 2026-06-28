'use client';

import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { Skeleton } from '@/components/shared/ui/skeleton';
import type { AggregatedLocation } from '@/shared/types/entities';
import {
  getGrossColorClass,
  getMoneyInColorClass,
} from '@/lib/utils/financial';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';

export type ReportsLocationCardProps = {
  location: AggregatedLocation;
  formatCurrency: (amount: number | null | undefined) => string;
  onLocationClick?: (location: AggregatedLocation) => void;
  variant?: 'full' | 'revenue';
  headerExtra?: ReactNode;
};

function getLocationId(location: AggregatedLocation): string | undefined {
  return location.location || location._id;
}

function getLocationName(location: AggregatedLocation): string {
  return String(
    location.locationName || location.name || 'Unknown Location'
  );
}

export function ReportsLocationCardSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-1 border-t border-gray-200 pt-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-1">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsLocationCard({
  location,
  formatCurrency,
  onLocationClick,
  variant = 'full',
  headerExtra,
}: ReportsLocationCardProps) {
  const locationId = getLocationId(location);
  const locationName = getLocationName(location);
  const holdPercentage =
    (location.moneyIn || 0) > 0
      ? ((location.gross || 0) / (location.moneyIn || 1)) * 100
      : 0;
  const avgWagerPerGame =
    location.gamesPlayed && location.gamesPlayed > 0
      ? (location.moneyIn || 0) / location.gamesPlayed
      : 0;
  const netWin = (location.coinIn || 0) - (location.coinOut || 0);

  const handleCardClick = () => {
    if (onLocationClick) {
      onLocationClick(location);
    }
  };

  return (
    <div
      className={`relative w-full rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md md:p-4 ${
        onLocationClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleCardClick}
      onKeyDown={event => {
        if (onLocationClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleCardClick();
        }
      }}
      role={onLocationClick ? 'button' : undefined}
      tabIndex={onLocationClick ? 0 : undefined}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {locationId ? (
            <Link
              href={`/locations/${locationId}`}
              onClick={event => event.stopPropagation()}
              className="group inline-flex max-w-full items-start gap-1.5"
            >
              <span className="break-words text-base font-semibold text-gray-900 group-hover:text-blue-600 group-hover:underline">
                {locationName}
              </span>
              <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-buttonActive" />
            </Link>
          ) : (
            <p className="break-words text-base font-semibold text-gray-900">
              {locationName}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {location.totalMachines ?? 0} machines
            {variant === 'full' ? (
              <>
                {' · '}
                {(location.gamesPlayed || 0).toLocaleString()} games played
              </>
            ) : null}
          </p>
        </div>
        {headerExtra}
      </div>

      <div className="border-t border-gray-200 pt-2">
        <div className="mb-1 flex divide-x divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/50">
          <div className="min-w-0 flex-1 px-2 py-1.5">
            <span className="block text-[10px] text-gray-500">Money In</span>
            <p
              className={`truncate text-xs font-medium ${getMoneyInColorClass(location.moneyIn)}`}
            >
              {formatCurrency(location.moneyIn)}
            </p>
          </div>
          <div className="min-w-0 flex-1 px-2 py-1.5">
            <span className="block text-[10px] text-gray-500">Money Out</span>
            <MoneyOutCell
              moneyOut={location.moneyOut || 0}
              moneyIn={location.moneyIn || 0}
              jackpot={location.jackpot || 0}
              displayValue={formatCurrency(location.moneyOut)}
              includeJackpot={!!location.includeJackpot}
              showInfoIcon={true}
              className="text-xs font-medium"
            />
          </div>
        </div>

        <div className="mb-1 grid grid-cols-2 gap-1">
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
            <span className="block text-[10px] text-gray-500">Gross</span>
            <p
              className={`truncate text-xs font-medium ${getGrossColorClass(location.gross)}`}
            >
              {formatCurrency(location.gross)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
            <span className="block text-[10px] text-gray-500">Hold %</span>
            <p className="truncate text-xs font-medium text-gray-900">
              {holdPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {variant === 'full' ? (
          <>
            <div className="mb-1 grid grid-cols-2 gap-1">
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <span className="block text-[10px] text-gray-500">Handle</span>
                <p className="truncate text-xs font-medium text-gray-900">
                  {formatCurrency(location.coinIn || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <span className="block text-[10px] text-gray-500">Win</span>
                <p
                  className={`truncate text-xs font-medium ${getGrossColorClass(netWin)}`}
                >
                  {formatCurrency(netWin)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <span className="block text-[10px] text-gray-500">
                  Avg. Wager
                </span>
                <p className="truncate text-xs font-medium text-gray-900">
                  {formatCurrency(avgWagerPerGame)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5">
                <span className="block text-[10px] text-gray-500">Jackpot</span>
                <p className="truncate text-xs font-medium text-gray-900">
                  {formatCurrency(location.jackpot || 0)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
            <span>Online: {location.onlineMachines ?? 0}</span>
            <span>
              {location.onlineMachines ?? 0}/{location.totalMachines ?? 0}{' '}
              machines online
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
