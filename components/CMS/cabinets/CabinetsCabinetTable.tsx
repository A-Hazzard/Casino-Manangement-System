/**
 * Cabinets Cabinet Table Component
 *
 * Displays machine/cabinet information in a table format for desktop screens.
 *
 * Features:
 * - Sortable columns
 * - Status indicators (online/offline)
 * - SMIB details with copy to clipboard
 * - Financial metrics display
 * - Action buttons (View, Edit, Delete)
 *
 * @module components/CMS/cabinets/CabinetsCabinetTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { IMAGES } from '@/lib/constants';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import {
    getGrossColorClass,
    getMoneyInColorClass,
} from '@/lib/utils/financial';
import type { DataTableProps } from '@/shared/types/components';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { ClockIcon, Cross1Icon, MobileIcon } from '@radix-ui/react-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, Eye, RotateCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { toast } from 'sonner';

type CabinetsCabinetTableProps = Omit<
  DataTableProps<Cabinet>,
  'loading' | 'onPageChange'
> & {
  onMachineClick?: (machineId: string) => void;
  onRestore?: (cabinet: Cabinet) => void;
  onPermanentDelete?: (cabinet: Cabinet) => void;
  canViewArchived?: boolean;
  canPermanentlyDeleteMachines?: boolean;
  showLocation?: boolean;
  showStatus?: boolean;
  showMetrics?: boolean;
  canEditMachines?: boolean; // If false, hide edit button
  canDeleteMachines?: boolean; // If false, hide delete button
  /**
   * When false, disable header click sorting.
   * Used on pages that provide separate sort controls.
   */
  enableHeaderSorting?: boolean;
  /**
   * When false, hide the sort direction icon in the header.
   */
  showSortIcons?: boolean;
  showArchived?: boolean;
  includeJackpot?: boolean;
  hideFinancials?: boolean;
};

export default function CabinetsCabinetTable({
  data: cabinets,
  sortOption,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  canEditMachines = true,
  canDeleteMachines = true,
  canViewArchived = false,
  canPermanentlyDeleteMachines = false,
  enableHeaderSorting = true,
  showSortIcons = true,
  hideFinancials = false,
  showArchived = false,
  includeJackpot = false,
}: CabinetsCabinetTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const router = useRouter();
  const { displayCurrency } = useCurrencyFormat();
  const formatCurrency = (amount: number | null | undefined) => formatCurrencyWithCodeString(amount, displayCurrency);

  // Navigate to cabinet detail page
  const navigateToCabinet = (cabinetId: string) => {
    router.push(`/cabinets/${cabinetId}`);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text.trim() === '' || text === 'N/A') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text.trim());
      toast.success(`${label} copied to clipboard`);
    } catch {
      // Fallback for older browsers or when clipboard API is not available
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text.trim();
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          toast.success(`${label} copied to clipboard`);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
        toast.error(`Failed to copy ${label}. Please try again.`);
      }
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-auto bg-white shadow">
      <Table ref={tableRef} className="w-full">
        <TableHeader>
          <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
            <TableHead
              className="relative w-[240px] font-semibold text-white"
              onClick={
                enableHeaderSorting && onSort ? () => onSort('assetNumber') : undefined
              }
              isFirstColumn={true}
            >
              <span>ASSET NUMBER</span>
              {showSortIcons && sortOption === 'assetNumber' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>

            <TableHead
              className="relative font-semibold text-white"
              onClick={
                enableHeaderSorting && onSort ? () => onSort('moneyIn') : undefined
              }
            >
              <span>MONEY IN</span>
              {showSortIcons && sortOption === 'moneyIn' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative font-semibold text-white"
              onClick={
                enableHeaderSorting && onSort ? () => onSort('moneyOut') : undefined
              }
            >
              <span>MONEY OUT</span>
              {showSortIcons && sortOption === 'moneyOut' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative font-semibold text-white"
              onClick={
                enableHeaderSorting && onSort ? () => onSort('jackpot') : undefined
              }
            >
              <span>JACKPOT</span>
              {showSortIcons && sortOption === 'jackpot' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative font-semibold text-white"
              onClick={enableHeaderSorting && onSort ? () => onSort('gross') : undefined}
            >
              <span>GROSS</span>
              {showSortIcons && sortOption === 'gross' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            {showArchived && (
              <>
                <TableHead className="font-semibold text-white">
                  ARCHIVED WHEN
                </TableHead>
                <TableHead className="font-semibold text-white">
                  ARCHIVED FOR
                </TableHead>
              </>
            )}
            <TableHead className="font-semibold text-white">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cabinets.map(cab => {
            const isOnline = cab.online !== undefined ? cab.online : (
              cab.lastOnline &&
              new Date(cab.lastOnline) > new Date(Date.now() - 3 * 60 * 1000)
            );
            const lastOnlineText = cab.offlineTimeLabel || (cab.lastOnline
              ? formatDistanceToNow(new Date(cab.lastOnline), {
                  addSuffix: true,
                })
              : 'Never');

            const smbId = cab.smbId || '';
            // Archived machines have a deletedAt date of Jan 1st 2025 or later
            const isArchived = Boolean(cab.deletedAt) &&
                             new Date(cab.deletedAt!) >= new Date('2025-01-01');

            return (
              <TableRow key={cab._id} className={`hover:bg-grayHighlight/10 ${isArchived ? 'bg-gray-50' : ''}`}>
                <TableCell isFirstColumn={true} className="w-[240px]">
                  <div className="space-y-1">
                    {/* Row 1: Serial Number/Asset Number - Navigate to cabinet details */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigateToCabinet(cab._id);
                        }}
                        className="cursor-pointer whitespace-normal break-words text-left text-sm font-medium hover:text-blue-600 hover:underline"
                        title="Click to view cabinet details"
                      >
                        {formatMachineDisplayNameWithBold(cab)}
                      </button>
                      {isArchived && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px] px-1.5 py-0">
                          ARCHIVED
                        </Badge>
                      )}
                    </div>
                    {/* Row 2: Location Name - Navigate to location details with icon */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (cab.locationId) {
                            router.push(`/locations/${cab.locationId}`);
                          }
                        }}
                        className="flex cursor-pointer items-center gap-1 whitespace-normal break-words text-xs font-semibold text-gray-600 hover:text-blue-600 hover:underline"
                        title="Click to view location details"
                        disabled={!cab.locationId}
                      >
                        {cab.locationName || '(No Location)'}
                      </button>
                      {cab.locationId && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            router.push(`/locations/${cab.locationId}`);
                          }}
                          className="flex-shrink-0"
                          title="View location details"
                        >
                          <ExternalLink className="h-3 w-3 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                        </button>
                      )}
                    </div>

                    {/* Row 2: SMIB and Status */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (smbId) {
                            copyToClipboard(smbId, 'SMIB');
                          }
                        }}
                        className={`whitespace-normal break-words text-xs ${smbId ? 'cursor-pointer text-gray-500 hover:text-blue-600 hover:underline' : 'text-gray-400'}`}
                        title={smbId ? 'Click to copy SMIB' : 'No SMIB'}
                        disabled={!smbId}
                      >
                        SMIB: {smbId || <span className="font-bold text-red-600">NO SMIB</span>}
                      </button>
                      {!isArchived && (
                        <Badge
                          variant={isOnline ? 'default' : 'destructive'}
                          className={`ml-auto inline-block w-fit flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
                            isOnline
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          } flex items-center gap-1`}
                        >
                          {isOnline ? (
                            <MobileIcon className="h-3 w-3" />
                          ) : (
                            <Cross1Icon className="h-3 w-3" />
                          )}
                          {isOnline ? 'Online' : 'Offline'}
                        </Badge>
                      )}
                    </div>

                    {/* Row 3: Last Activity - Only show time for offline machines */}
                    {!isOnline && !isArchived && (
                      <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="whitespace-normal break-words">
                            {lastOnlineText === 'Never' ? 'Never Online' : `Offline ${lastOnlineText}`}
                          </span>
                        </div>
                        {cab.actualOfflineTime && cab.actualOfflineTime !== lastOnlineText && (
                          <div className="ml-4 text-[10px] opacity-70 italic">
                            (Actual Offline Time: {cab.actualOfflineTime})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span
                    className={`font-semibold ${!hideFinancials ? getMoneyInColorClass() : 'text-gray-500'}`}
                  >
                    {hideFinancials ? '-' : formatCurrency(cab.moneyIn)}
                  </span>
                </TableCell>
                <TableCell>
                  {hideFinancials ? (
                    <span className="text-gray-500">-</span>
                  ) : (
                    <MoneyOutCell
                      moneyOut={cab.moneyOut || 0}
                      moneyIn={cab.moneyIn || 0}
                      jackpot={cab.jackpot || 0}
                      displayValue={formatCurrency(cab.moneyOut)}
                      includeJackpot={!!(cab.includeJackpot ?? includeJackpot)}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-gray-500">
                    {hideFinancials ? '-' : formatCurrency(cab.jackpot)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${!hideFinancials ? getGrossColorClass(cab.gross) : 'text-gray-500'}`}
                  >
                    {hideFinancials ? '-' : formatCurrency(cab.gross)}
                  </span>
                </TableCell>
                {showArchived && (
                  <>
                    <TableCell className="text-gray-600">
                      {cab.deletedAt ? (
                        <>
                          {format(new Date(cab.deletedAt), 'MMM d, yyyy • h:mm a')}
                          <span className="ml-1 text-xs opacity-70">
                            ({formatDistanceToNow(new Date(cab.deletedAt), { addSuffix: true })})
                          </span>
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {cab.deletedAt ? formatDistanceToNow(new Date(cab.deletedAt), { addSuffix: true }) : '-'}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <div className="action-buttons flex items-center justify-center gap-2">
                    {/* Common actions */}
                    {!isArchived && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={e => {
                            e.stopPropagation();
                            navigateToCabinet(cab._id);
                          }}
                          className="h-8 w-8 p-1 hover:bg-accent"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditMachines && (
                          <Button
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              onEdit?.(cab);
                            }}
                            className="h-8 w-8 p-1 hover:bg-accent"
                            title="Edit"
                          >
                            <Image
                              src={IMAGES.editIcon}
                              alt="Edit"
                              width={16}
                              height={16}
                              className="h-4 w-4"
                            />
                          </Button>
                        )}
                        {canDeleteMachines && (
                          <Button
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              onDelete?.(cab);
                            }}
                            className="h-8 w-8 p-1 hover:bg-accent"
                            title="Delete"
                          >
                            <Image
                              src={IMAGES.deleteIcon}
                              alt="Delete"
                              width={16}
                              height={16}
                              className="h-4 w-4"
                            />
                          </Button>
                        )}
                      </>
                    )}

                    {/* Archive management actions */}
                    {isArchived && (
                      <>
                        {canViewArchived && (
                          <Button
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              onRestore?.(cab);
                            }}
                            className="h-8 w-8 p-1 hover:bg-amber-100 text-amber-600"
                            title="Restore machine"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {canPermanentlyDeleteMachines && (
                          <Button
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              onPermanentDelete?.(cab);
                            }}
                            className="h-8 w-8 p-1 hover:bg-red-100 text-red-600"
                            title="PERMANENTLY delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
