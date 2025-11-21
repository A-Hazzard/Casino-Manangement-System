'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import formatCurrency from '@/lib/utils/currency';
import { formatDistanceToNow } from 'date-fns';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import type { DataTableProps } from '@/shared/types/components';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { toast } from 'sonner';
import { Eye, ExternalLink } from 'lucide-react';
type CabinetTableProps = DataTableProps<Cabinet> & {
  onMachineClick?: (machineId: string) => void;
  showLocation?: boolean;
  showStatus?: boolean;
  showMetrics?: boolean;
  canEditMachines?: boolean; // If false, hide edit button
  canDeleteMachines?: boolean; // If false, hide delete button
};
import { ClockIcon, Cross1Icon, MobileIcon } from '@radix-ui/react-icons';
import { IMAGES } from '@/lib/constants/images';

export default function CabinetTable({
  data: cabinets,
  loading: _loading,
  sortOption,
  sortOrder,
  onSort,
  onPageChange: _onPageChange,
  onEdit,
  onDelete,
  canEditMachines = true, // Default to true for backward compatibility
  canDeleteMachines = true, // Default to true for backward compatibility
}: CabinetTableProps) {
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
    <div className="overflow-x-auto bg-white shadow">
      <Table ref={tableRef} className="w-full">
        <TableHeader>
          <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
            <TableHead
              className="relative cursor-pointer font-semibold text-white w-[240px]"
              onClick={() => onSort('assetNumber')}
              isFirstColumn={true}
            >
              <span>ASSET NUMBER</span>
              {sortOption === 'assetNumber' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative cursor-pointer font-semibold text-white"
              onClick={() => onSort('moneyIn')}
            >
              <span>MONEY IN</span>
              {sortOption === 'moneyIn' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative cursor-pointer font-semibold text-white"
              onClick={() => onSort('moneyOut')}
            >
              <span>MONEY OUT</span>
              {sortOption === 'moneyOut' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative cursor-pointer font-semibold text-white"
              onClick={() => onSort('jackpot')}
            >
              <span>JACKPOT</span>
              {sortOption === 'jackpot' && (
                <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </span>
              )}
            </TableHead>
            <TableHead
              className="relative cursor-pointer font-semibold text-white"
              onClick={() => onSort('gross')}
            >
              <span>GROSS</span>
              {sortOption === 'gross' && (
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
              <TableRow
                key={cab._id}
                className="hover:bg-grayHighlight/10"
              >
                <TableCell isFirstColumn={true} className="w-[240px]">
                  <div className="space-y-1">
                    {/* Row 1: Serial Number/Asset Number - Navigate to cabinet details */}
                    <div className="min-w-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigateToCabinet(cab._id);
                        }}
                        className="font-medium text-sm hover:text-blue-600 hover:underline cursor-pointer text-left break-words whitespace-normal"
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
                        className="text-xs font-semibold text-gray-600 hover:text-blue-600 hover:underline cursor-pointer break-words whitespace-normal flex items-center gap-1"
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
                          <ExternalLink
                            className="h-3 w-3 text-gray-500 hover:text-blue-600 cursor-pointer transition-transform hover:scale-110"
                          />
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
                        className={`text-xs break-words whitespace-normal ${smbId ? 'text-gray-500 hover:text-blue-600 hover:underline cursor-pointer' : 'text-gray-400'}`}
                        title={smbId ? 'Click to copy SMIB' : 'No SMIB'}
                        disabled={!smbId}
                      >
                        SMIB: {smbId || 'N/A'}
                      </button>
                      <Badge
                        variant={isOnline ? 'default' : 'destructive'}
                        className={`ml-auto inline-block w-fit rounded-full px-2 py-0.5 text-xs flex-shrink-0 ${
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
                      <span className="break-words whitespace-normal">{lastOnlineText}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(cab.moneyIn)}</TableCell>
                <TableCell>{formatCurrency(cab.moneyOut)}</TableCell>
                <TableCell>
                  <span className="font-semibold">
                    {formatCurrency(cab.jackpot)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-green-600">
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
