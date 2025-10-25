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
type CabinetTableProps = DataTableProps<Cabinet> & {
  onMachineClick?: (machineId: string) => void;
  showLocation?: boolean;
  showStatus?: boolean;
  showMetrics?: boolean;
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
}: CabinetTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const router = useRouter();

  // Navigate to cabinet detail page
  const navigateToCabinet = (cabinetId: string) => {
    router.push(`/cabinets/${cabinetId}`);
  };

  return (
    <div className="overflow-x-auto bg-white shadow">
      <Table ref={tableRef} className="w-full table-fixed">
        <TableHeader>
          <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
            <TableHead
              className="relative cursor-pointer font-semibold text-white"
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

            return (
              <TableRow
                key={cab._id}
                className="cursor-pointer hover:bg-grayHighlight/10"
                onClick={e => {
                  // Don't navigate if clicking on action buttons or their container
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('.action-buttons') ||
                    target.closest('button')
                  ) {
                    return;
                  }
                  navigateToCabinet(cab._id);
                }}
              >
                <TableCell isFirstColumn={true}>
                  <div className="font-medium">
                    {cab.assetNumber || '(No Asset #)'}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {formatMachineDisplayNameWithBold(cab)}
                  </div>
                  <div className="mt-1 text-xs font-bold text-gray-600">
                    {cab.locationName || '(No Location)'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    SMIB: {cab.smbId || 'N/A'}
                  </div>
                  <Badge
                    variant={isOnline ? 'default' : 'destructive'}
                    className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs ${
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
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <ClockIcon className="h-3 w-3" /> {lastOnlineText}
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
                        onEdit?.(cab);
                      }}
                      className="h-8 w-8 p-1 hover:bg-accent"
                    >
                      <Image
                        src={IMAGES.editIcon}
                        alt="Edit"
                        width={16}
                        height={16}
                        className="h-4 w-4"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        onDelete?.(cab);
                      }}
                      className="h-8 w-8 p-1 hover:bg-accent"
                    >
                      <Image
                        src={IMAGES.deleteIcon}
                        alt="Delete"
                        width={16}
                        height={16}
                        className="h-4 w-4"
                      />
                    </Button>
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
