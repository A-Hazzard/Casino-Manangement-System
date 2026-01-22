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
 * @module components/cabinets/CabinetsCabinetTable
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { IMAGES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/currency';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financial';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import type { DataTableProps } from '@/shared/types/components';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { ClockIcon, Cross1Icon, MobileIcon } from '@radix-ui/react-icons';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Eye } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { toast } from 'sonner';

type CabinetsCabinetTableProps = Omit<
  DataTableProps<Cabinet>,
  'loading' | 'onPageChange'
> & {
  onMachineClick?: (machineId: string) => void;
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
};

export default function CabinetsCabinetTable({
  data: cabinets,
  sortOption,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  canEditMachines = true, // Default to true for backward compatibility
  canDeleteMachines = true, // Default to true for backward compatibility
  enableHeaderSorting = true,
  showSortIcons = true,
}: CabinetsCabinetTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const router = useRouter();

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
                enableHeaderSorting ? () => onSort('assetNumber') : undefined
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
                enableHeaderSorting ? () => onSort('moneyIn') : undefined
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
                enableHeaderSorting ? () => onSort('moneyOut') : undefined
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
                enableHeaderSorting ? () => onSort('jackpot') : undefined
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
              onClick={enableHeaderSorting ? () => onSort('gross') : undefined}
            >
              <span>GROSS</span>
              {showSortIcons && sortOption === 'gross' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead className="font-semibold text-white">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cabinets.map(cab => {
            const isOnline =
              cab.lastOnline &&
              new Date(cab.lastOnline) > new Date(Date.now() - 5 * 60 * 1000);
            const lastOnlineText = cab.lastOnline
              ? formatDistanceToNow(new Date(cab.lastOnline), {
                  addSuffix: true,
                })
              : 'Never';

            const smbId = cab.smbId || '';

            return (
              <TableRow key={cab._id} className="hover:bg-grayHighlight/10">
                <TableCell isFirstColumn={true} className="w-[240px]">
                  <div className="space-y-1">
                    {/* Row 1: Serial Number/Asset Number - Navigate to cabinet details */}
                    <div className="min-w-0">
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
                        SMIB: {smbId || 'N/A'}
                      </button>
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
                    </div>

                    {/* Row 3: Last Activity */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-normal break-words">
                        {lastOnlineText}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${getMoneyInColorClass()}`}
                  >
                    {formatCurrency(cab.moneyIn)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${getMoneyOutColorClass(cab.moneyOut, cab.moneyIn)}`}
                  >
                    {formatCurrency(cab.moneyOut)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">
                    {formatCurrency(cab.jackpot)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${getGrossColorClass(cab.gross)}`}
                  >
                    {formatCurrency(cab.gross)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="action-buttons flex items-center justify-center gap-2">
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

