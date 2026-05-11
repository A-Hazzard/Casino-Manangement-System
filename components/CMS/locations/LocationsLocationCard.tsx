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
import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { LocationCardData } from '@/lib/types/location';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import {
  getGrossColorClass,
  getMoneyInColorClass,
} from '@/lib/utils/financial';
import { hasMissingCoordinates } from '@/lib/utils/location';
import {
  Archive,
  BadgeCheck,
  Eye,
  FileWarning,
  HelpCircle,
  Home,
  MapPinOff,
  MonitorOff,
  Pencil,
  RotateCcw,
  Server,
  Trash2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export default function LocationsLocationCard({
  location,
  onLocationClick,
  onEdit,
  onDelete,
  onRestore,
  canManageLocations = true,
  isDeveloper = false,
  selectedFilters = [],
  showArchived = false,
}: {
  location: LocationCardData['location'];
  onLocationClick: LocationCardData['onLocationClick'];
  onEdit: LocationCardData['onEdit'];
  onDelete?: (location: LocationCardData['location']) => void;
  onRestore?: (location: LocationCardData['location']) => void;
  canManageLocations?: boolean;
  isDeveloper?: boolean;
  selectedFilters?: Array<string | null | ''>;
  showArchived?: boolean;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { displayCurrency } = useCurrencyFormat();
  const formatCurrency = (amount: number) =>
    formatCurrencyWithCodeString(amount, displayCurrency);

  return (
    <div
      ref={cardRef}
      className={`relative mx-auto w-full rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md ${showArchived ? 'border-amber-100 bg-gray-50' : 'border-border bg-white'}`}
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
          className="inline-flex cursor-pointer items-start gap-1.5 overflow-visible text-left text-lg font-bold hover:text-blue-600 hover:underline"
          title="Click to view location details"
        >
          <span className="break-words">
            {(location as Record<string, unknown>).locationName as string}
          </span>
          <TooltipProvider delayDuration={200}>
            {/* Full SMIB Icon */}
            {Boolean((location as { fullSMIBs?: boolean }).fullSMIBs) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mt-0.5 inline-flex flex-shrink-0">
                    <Server className="h-4 w-4 text-blue-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Full SMIB Location</TooltipContent>
              </Tooltip>
            )}
            {/* Semi SMIB Icon */}
            {Boolean((location as { semiSMIBs?: boolean }).semiSMIBs) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mt-0.5 inline-flex flex-shrink-0">
                    <Server className="h-4 w-4 text-amber-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Semi SMIB Location</TooltipContent>
              </Tooltip>
            )}
            {/* No SMIB Icon */}
            {Boolean(
              (location as { noSMIBLocation?: boolean }).noSMIBLocation
            ) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mt-0.5 inline-flex flex-shrink-0">
                    <MonitorOff className="h-4 w-4 text-gray-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">No SMIB Location</TooltipContent>
              </Tooltip>
            )}
            {/* Local Server Icon */}
            {Boolean(
              (location as { isLocalServer?: boolean }).isLocalServer
            ) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mt-0.5 inline-flex flex-shrink-0">
                    <Home className="h-4 w-4 text-purple-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Local Server</TooltipContent>
              </Tooltip>
            )}
            {/* Membership Icon */}
            {Boolean(
              (location as { membershipEnabled?: boolean }).membershipEnabled
            ) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mt-0.5 inline-flex flex-shrink-0">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Membership enabled</TooltipContent>
              </Tooltip>
            )}
            {/* Warning Icon - no recent collection report */}
            {selectedFilters.some(f => f === 'NoSMIBLocation') &&
              Boolean(
                (location as { hasNoRecentCollectionReport?: boolean })
                  .hasNoRecentCollectionReport
              ) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="mt-0.5 inline-flex flex-shrink-0">
                      <FileWarning className="h-4 w-4 text-red-600" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    No collection report in past 3 months
                  </TooltipContent>
                </Tooltip>
              )}
            {/* Missing Coordinates Icon */}
            {hasMissingCoordinates(location) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="mt-0.5 inline-flex flex-shrink-0">
                    <MapPinOff className="h-4 w-4 text-red-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  This location&apos;s coordinates have not been set
                </TooltipContent>
              </Tooltip>
            )}
            {/* Unknown Type Icon */}
            {(() => {
              const hasSmib = Boolean(
                (location as { fullSMIBs?: boolean }).fullSMIBs ||
                (location as { semiSMIBs?: boolean }).semiSMIBs ||
                (location as { noSMIBLocation?: boolean }).noSMIBLocation
              );
              const isLocalServer = Boolean(
                (location as { isLocalServer?: boolean }).isLocalServer
              );
              const hasMembership = Boolean(
                (location as { membershipEnabled?: boolean })
                  .membershipEnabled ||
                (location as { enableMembership?: boolean }).enableMembership
              );
              const hasMissingCoords = hasMissingCoordinates(location);
              const isUnknownType =
                !hasSmib &&
                !isLocalServer &&
                !hasMembership &&
                !hasMissingCoords;

              return isUnknownType ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="mt-0.5 inline-flex flex-shrink-0">
                      <HelpCircle className="h-4 w-4 text-gray-500" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Unknown location type
                  </TooltipContent>
                </Tooltip>
              ) : null;
            })()}
          </TooltipProvider>
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
            <button
              onClick={e => {
                e.stopPropagation();
                const locationId =
                  (location.location as string) || location._id;
                if (locationId) {
                  router.push(`/locations/${locationId}?tab=members`);
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100"
              title="Click to view members"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              {(location as { memberCount?: number }).memberCount} Members
            </button>
          )}
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
          <MoneyOutCell
            moneyOut={location.moneyOut ?? 0}
            moneyIn={location.moneyIn ?? 0}
            jackpot={location.jackpot ?? 0}
            displayValue={formatCurrency(location.moneyOut ?? 0)}
            includeJackpot={!!location.includeJackpot}
            showInfoIcon={true}
          />
        </div>
        {/* Jackpot info is shown via the info icon on Money Out — no duplicate row needed */}
      </div>

      <div className="mb-3 mt-1 flex justify-between">
        <span className="font-medium">Gross</span>
        <CurrencyValueWithOverflow
          value={location.gross ?? 0}
          className={`break-words text-right font-semibold ${getGrossColorClass(location.gross)}`}
          formatCurrencyFn={formatCurrency}
        />
      </div>

      {/* Archived Info */}
      {showArchived && (location as { deletedAt?: string }).deletedAt && (
        <div className="mb-3 flex flex-col gap-1 rounded border border-amber-100/50 bg-amber-50/50 p-2 text-[11px] text-amber-700">
          <div className="flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            <span>
              Archived:{' '}
              {format(
                new Date((location as { deletedAt: string }).deletedAt),
                'MMM d, yyyy • h:mm a'
              )}
            </span>
          </div>
          <div className="ml-[18px] italic opacity-80">
            (
            {formatDistanceToNow(
              new Date((location as { deletedAt: string }).deletedAt),
              { addSuffix: true }
            )}
            )
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        {showArchived ? (
          /* Archived view: Restore (all managers) - Delete only for developers */
          <>
            {canManageLocations && (
              <Button
                onClick={() => onRestore?.(location)}
                variant="outline"
                size="sm"
                className="flex flex-1 items-center justify-center gap-1.5 text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore</span>
              </Button>
            )}
            {isDeveloper && (
              <Button
                onClick={() => onDelete?.(location)}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            )}
          </>
        ) : (
          /* Active view: View, Edit, Delete */
          <>
            <Link
              href={`/locations/${(location.location as string) || location._id}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </Link>
            {canManageLocations && (
              <>
                <Button
                  onClick={() => onEdit(location)}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  onClick={() => onDelete?.(location)}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
