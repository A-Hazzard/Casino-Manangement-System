/**
 * Members Table Component
 * Matches the design pattern used in other tables (LocationTable, CabinetTable)
 * Shows cards on mobile and table on desktop
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { ExternalLink, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import MembersTableSkeleton from './MembersTableSkeleton';

type MemberSummary = {
  _id: string;
  fullName: string;
  address?: string;
  phoneNumber?: string;
  lastLogin?: string | Date;
  createdAt?: string | Date;
  gamingLocation?: string;
  locationName?: string;
  winLoss?: number;
};

type MembersTableProps = {
  members: MemberSummary[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  onViewMember: (member: MemberSummary) => void;
  forcedLocationId?: string;
};

export default function MembersTable({
  members,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onViewMember,
  forcedLocationId,
}: MembersTableProps) {
  const router = useRouter();
  const tableRef = useRef<HTMLTableElement>(null);

  if (loading) {
    return <MembersTableSkeleton forcedLocationId={forcedLocationId} />;
  }

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return null;
    return (
      <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
        {sortOrder === 'desc' ? '▼' : '▲'}
      </span>
    );
  };

  return (
    <div>
      {/* Mobile View: Cards */}
      <div className="space-y-3 lg:hidden">
        {members.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-lg text-gray-500">No members found</span>
          </div>
        ) : (
          members.map(member => (
            <div
              key={member._id}
              className="relative mx-auto w-full rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-foreground">
                    {member.fullName}
                  </h3>
                  {!forcedLocationId && member.locationName && (
                    <button
                      onClick={() =>
                        member.gamingLocation &&
                        router.push(`/locations/${member.gamingLocation}`)
                      }
                      className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-left text-xs text-blue-600 underline decoration-dotted hover:text-blue-800"
                      title={member.locationName}
                      disabled={!member.gamingLocation}
                    >
                      <span className="truncate">
                        {member.locationName || 'No Location'}
                      </span>
                      {member.gamingLocation && (
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`text-sm font-medium ${
                      member.winLoss && member.winLoss >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(member.winLoss || 0)}
                  </span>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <span className="truncate text-xs font-medium">
                    {member.address || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="truncate text-xs font-medium">
                    {member.phoneNumber || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Last Login
                  </span>
                  <span className="truncate text-xs font-medium">
                    {formatDate(member.lastLogin)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="truncate text-xs font-medium">
                    {formatDate(member.createdAt)}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex h-9 w-full items-center justify-center gap-1.5 text-xs"
                  onClick={() => onViewMember(member)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="xs:inline hidden">View</span>
                  <span className="xs:hidden">View Details</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden overflow-x-auto bg-white shadow lg:block">
        <Table ref={tableRef} className="w-full">
          <TableHeader>
            <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
              <TableHead
                isFirstColumn={true}
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('fullName')}
              >
                <span>FULL NAME</span>
                {getSortIcon('fullName')}
              </TableHead>
              <TableHead
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('address')}
              >
                <span>ADDRESS</span>
                {getSortIcon('address')}
              </TableHead>
              <TableHead
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('phoneNumber')}
              >
                <span>PHONE NUMBER</span>
                {getSortIcon('phoneNumber')}
              </TableHead>
              <TableHead
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('lastLogin')}
              >
                <span>LAST LOGIN</span>
                {getSortIcon('lastLogin')}
              </TableHead>
              <TableHead
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('createdAt')}
              >
                <span>CREATED AT</span>
                {getSortIcon('createdAt')}
              </TableHead>
              <TableHead
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('winLoss')}
              >
                <span>WIN/LOSS</span>
                {getSortIcon('winLoss')}
              </TableHead>
              {!forcedLocationId && (
                <TableHead
                  className="relative cursor-pointer font-semibold text-white"
                  onClick={() => onSort('locationName')}
                >
                  <span>LOCATION</span>
                  {getSortIcon('locationName')}
                </TableHead>
              )}
              <TableHead className="font-semibold text-white">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={forcedLocationId ? 7 : 8}
                  className="p-8 text-center text-gray-500"
                >
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map(member => (
                <TableRow
                  key={member._id}
                  className="border-b hover:bg-muted/30"
                >
                  <TableCell
                    isFirstColumn={true}
                    className="bg-white p-3 text-sm"
                  >
                    {member.fullName}
                  </TableCell>
                  <TableCell className="bg-white p-3 text-sm">
                    {member.address || '-'}
                  </TableCell>
                  <TableCell className="bg-white p-3 text-sm">
                    {member.phoneNumber || '-'}
                  </TableCell>
                  <TableCell className="bg-white p-3 text-sm">
                    {formatDate(member.lastLogin)}
                  </TableCell>
                  <TableCell className="bg-white p-3 text-sm">
                    {formatDate(member.createdAt)}
                  </TableCell>
                  <TableCell className="bg-white p-3 text-sm">
                    <div
                      className={`font-medium ${
                        member.winLoss && member.winLoss >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(member.winLoss || 0)}
                    </div>
                  </TableCell>
                  {!forcedLocationId && (
                    <TableCell className="bg-white p-3 text-sm">
                      <button
                        onClick={() =>
                          member.gamingLocation &&
                          router.push(`/locations/${member.gamingLocation}`)
                        }
                        className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800"
                        disabled={!member.gamingLocation}
                      >
                        {member.locationName || 'Unknown'}
                        {member.gamingLocation && (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </button>
                    </TableCell>
                  )}
                  <TableCell className="bg-white p-3 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => onViewMember(member)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

