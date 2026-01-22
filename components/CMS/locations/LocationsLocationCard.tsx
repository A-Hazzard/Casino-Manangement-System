/**
 * Locations Location Card Component
 *
 * Displays location information in a card format for mobile/smaller screens.
 *
 * Features:
 * - Location name with status icons (SMIB, Local Server, Membership, etc.)
 * - Machine status badges (online/offline counts)
 * - Financial metrics (Money In, Money Out, Gross)
 * - Action buttons (View, Edit)
 * - Conditional rendering based on location properties
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import CurrencyValueWithOverflow from '@/components/shared/ui/CurrencyValueWithOverflow';
import { LocationCardData } from '@/lib/types/location';
import { formatCurrency } from '@/lib/utils/currency';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financial';
import { hasMissingCoordinates } from '@/lib/utils/location';
import {
  BadgeCheck,
  Eye,
  FileWarning,
  HelpCircle,
  Home,
  MapPinOff,
  Pencil,
  Server,
} from 'lucide-react';
import { useRef } from 'react';

export default function LocationsLocationCard({
  location,
  onLocationClick,
  onEdit,
  canManageLocations = true,
  selectedFilters = [],
}: {
  location: LocationCardData['location'];
  onLocationClick: LocationCardData['onLocationClick'];
  onEdit: LocationCardData['onEdit'];
  canManageLocations?: boolean;
  selectedFilters?: Array<string | null | ''>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className="relative mx-auto w-full rounded-lg border border-border bg-container p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex flex-col gap-2">
        {/* Location Name with Membership Icon */}
        <button
          onClick={e => {
            e.stopPropagation();
            const locationId = (location.location as string) || location._id;
            // Navigate to location details page when clicked
            if (locationId) {
              onLocationClick(locationId);
            }
          }}
          className="inline-flex cursor-pointer items-start gap-1.5 text-left text-base font-semibold hover:text-blue-600 hover:underline"
          title="Click to view location details"
        >
          <span className="break-words">
            {(location as Record<string, unknown>).locationName as string}
          </span>
          {/* SMIB Icon - Show if location has SMIB machines */}
          {Boolean(
            (location as { hasSmib?: boolean }).hasSmib ||
              !(location as { noSMIBLocation?: boolean }).noSMIBLocation
          ) && (
            <div className="relative mt-0.5 inline-flex flex-shrink-0">
              <div className="group inline-flex items-center">
                <Server className="h-4 w-4 text-blue-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  SMIB Location
                </div>
              </div>
            </div>
          )}
          {/* Local Server Icon - Show if location uses local server */}
          {Boolean((location as { isLocalServer?: boolean }).isLocalServer) && (
            <div className="relative mt-0.5 inline-flex flex-shrink-0">
              <div className="group inline-flex items-center">
                <Home className="h-4 w-4 text-purple-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Local Server
                </div>
              </div>
            </div>
          )}
          {/* Membership Icon - Show if location has membership enabled */}
          {Boolean(
            (location as { membershipEnabled?: boolean }).membershipEnabled
          ) && (
            <div className="relative mt-0.5 inline-flex flex-shrink-0">
              <div className="group inline-flex items-center">
                <BadgeCheck className="h-4 w-4 text-green-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Membership enabled
                </div>
              </div>
            </div>
          )}
          {/* Warning Icon - Show if location has no recent collection report and NoSMIBLocation filter is active */}
          {selectedFilters.some(f => f === 'NoSMIBLocation') &&
            Boolean(
              (location as { hasNoRecentCollectionReport?: boolean })
                .hasNoRecentCollectionReport
            ) && (
              <div className="relative mt-0.5 inline-flex flex-shrink-0">
                <div className="group inline-flex items-center">
                  <FileWarning className="h-4 w-4 text-red-600" />
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    No collection report in past 3 months
                  </div>
                </div>
              </div>
            )}
          {/* Missing Coordinates Icon */}
          {hasMissingCoordinates(location) && (
            <div className="relative mt-0.5 inline-flex flex-shrink-0">
              <div className="group inline-flex items-center">
                <MapPinOff className="h-4 w-4 text-red-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  This location&apos;s coordinates have not been set
                </div>
              </div>
            </div>
          )}
          {/* Unknown Type Icon - Show if location doesn't match any known type */}
          {(() => {
            const hasSmib = Boolean(
              (location as { hasSmib?: boolean }).hasSmib ||
                !(location as { noSMIBLocation?: boolean }).noSMIBLocation
            );
            const isLocalServer = Boolean(
              (location as { isLocalServer?: boolean }).isLocalServer
            );
            const hasMembership = Boolean(
              (location as { membershipEnabled?: boolean }).membershipEnabled ||
                (location as { enableMembership?: boolean }).enableMembership
            );
            const hasMissingCoords = hasMissingCoordinates(location);

            // Show unknown icon if location doesn't match any known type (no SMIB, no local server, no membership, no missing coords)
            const isUnknownType =
              !hasSmib && !isLocalServer && !hasMembership && !hasMissingCoords;

            return isUnknownType ? (
              <div className="relative mt-0.5 inline-flex flex-shrink-0">
                <div className="group inline-flex items-center">
                  <HelpCircle className="h-4 w-4 text-gray-500" />
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    Unknown location type
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </button>

        {/* Status Badges: Machine Online/Offline Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Show machine status badge if location has machine counts */}
          {typeof location.onlineMachines === 'number' &&
            typeof location.totalMachines === 'number' &&
            (() => {
              const online = location.onlineMachines;
              const total = location.totalMachines;
              const isAllOnline = total > 0 && online === total;
              const isAllOffline = total > 0 && online === 0;
              const hasMachines = total > 0;

              let badgeClass =
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';
              let dotClass = 'h-1.5 w-1.5 rounded-full';

              // Determine badge styling based on machine status
              if (!hasMachines) {
                // Gray badge if no machines
                badgeClass += ' bg-gray-50 text-gray-600 ring-gray-200';
                dotClass += ' bg-gray-400';
              } else if (isAllOffline) {
                // Red badge if all machines are offline
                badgeClass += ' bg-red-50 text-red-700 ring-red-600/20';
                dotClass += ' bg-red-500';
              } else if (isAllOnline) {
                // Green badge if all machines are online
                badgeClass += ' bg-green-50 text-green-700 ring-green-600/20';
                dotClass += ' bg-green-500';
              } else {
                // Yellow badge if some machines are online/offline
                badgeClass +=
                  ' bg-yellow-50 text-yellow-700 ring-yellow-600/20';
                dotClass += ' bg-yellow-500';
              }

              return (
                <span className={badgeClass}>
                  <span className={dotClass}></span>
                  {online}/{total} Online
                </span>
              );
            })()}
          {/* Membership Count Badge - Show if location has member count */}
          {typeof (location as { memberCount?: number }).memberCount ===
            'number' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              {(location as { memberCount?: number }).memberCount} Members
            </span>
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-col space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Money In</span>
          <CurrencyValueWithOverflow
            value={location.moneyIn ?? 0}
            className={`break-words text-right font-semibold ${getMoneyInColorClass()}`}
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
            // Navigate to location details page
            if (locationId) {
              onLocationClick(locationId);
            }
          }}
          variant="outline"
          size="sm"
          className="flex flex-1 items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </Button>
        {/* Show Edit button only if user can manage locations */}
        {canManageLocations && (
          <Button
            onClick={() => onEdit(location)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        )}
      </div>
    </div>
  );
}

