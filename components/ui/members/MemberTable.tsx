'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CasinoMember as Member } from '@/shared/types/entities';
// TODO: Move MemberSortOption to shared types
type MemberSortOption =
  | 'name'
  | 'playerId'
  | 'points'
  | 'sessions'
  | 'totalHandle'
  | 'totalWon'
  | 'totalLost'
  | 'lastSession'
  | 'status'
  | 'locationName'
  | 'winLoss'
  | 'lastLogin';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import React from 'react';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import leftHamburgerMenu from '@/public/leftHamburgerMenu.svg';

type MemberTableProps = {
  members: Member[];
  sortOption: MemberSortOption;
  sortOrder: 'asc' | 'desc';
  onSort: (column: MemberSortOption) => void;
  onMemberClick: (id: string) => void;
  onAction: (action: 'edit' | 'delete', member: Member) => void;
};

const MemberTable: React.FC<MemberTableProps> = ({
  members,
  sortOption,
  sortOrder,
  onSort,
  onMemberClick,
  onAction,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleRowClick = (memberId: string) => {
    onMemberClick(memberId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };

      return `${month} ${day}${getOrdinalSuffix(day)} ${year}`;
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <Table ref={tableRef} className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              <TableHead
                isFirstColumn={true}
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('locationName')}
              >
                <span>LOCATION</span>
                {sortOption === 'locationName' && (
                  <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {sortOrder === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </TableHead>
              <TableHead
                isFirstColumn={true}
                centered
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('name')}
              >
                <span>FULL NAME</span>
                {sortOption === 'name' && (
                  <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {sortOrder === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </TableHead>
              <TableHead
                centered
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('winLoss')}
              >
                <span>WIN/LOSS</span>
                {sortOption === 'winLoss' && (
                  <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {sortOrder === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </TableHead>
              <TableHead
                centered
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('lastSession')}
              >
                <span>JOINED</span>
                {sortOption === 'lastSession' && (
                  <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {sortOrder === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </TableHead>
              <TableHead centered className="font-semibold text-white">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => (
              <TableRow
                key={member._id}
                className="cursor-pointer hover:bg-muted"
                onClick={e => {
                  if (!(e.target as HTMLElement).closest('td:last-child')) {
                    handleRowClick(member._id);
                  }
                }}
              >
                <TableCell isFirstColumn={true}>
                  {member.locationName || 'Unknown Location'}
                </TableCell>
                <TableCell centered>
                  <div>{`${member.profile.firstName} ${member.profile.lastName}`}</div>
                  <div className="mt-1 inline-flex text-[10px] leading-tight text-primary-foreground">
                    <Badge
                      variant="secondary"
                      className="rounded-l-full rounded-r-none bg-blueHighlight px-1 py-0.5 text-white"
                    >
                      {member.profile.occupation || 'Not Specified'}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-l-none rounded-r-full bg-button px-1 py-0.5 text-white"
                    >
                      {member.points} POINTS
                    </Badge>
                  </div>
                </TableCell>
                <TableCell centered>
                  <div
                    className={`font-medium ${
                      (member.winLoss || 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(member.winLoss || 0)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    In: {formatCurrency(member.totalMoneyIn || 0)} | Out:{' '}
                    {formatCurrency(member.totalMoneyOut || 0)}
                  </div>
                </TableCell>
                <TableCell centered>
                  {formatDate(
                    typeof member.createdAt === 'string'
                      ? member.createdAt
                      : member.createdAt.toISOString()
                  )}
                </TableCell>
                <TableCell centered>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={e => {
                        e.stopPropagation();
                        onMemberClick(member._id);
                      }}
                    >
                      <Image
                        src={leftHamburgerMenu}
                        alt="Details"
                        width={16}
                        height={16}
                        className="opacity-70 hover:opacity-100"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={e => {
                        e.stopPropagation();
                        onAction('edit', member);
                      }}
                    >
                      <Image
                        src={editIcon}
                        alt="Edit"
                        width={16}
                        height={16}
                        className="opacity-70 hover:opacity-100"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={e => {
                        e.stopPropagation();
                        onAction('delete', member);
                      }}
                    >
                      <Image
                        src={deleteIcon}
                        alt="Delete"
                        width={16}
                        height={16}
                        className="opacity-70 hover:opacity-100"
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {members.length > 10 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // First page logic would be handled by the parent component
            }}
            className="bg-gray-300 p-2 text-black transition-colors hover:bg-gray-400"
          >
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Previous page logic
            }}
            className="bg-gray-300 p-2 text-black transition-colors hover:bg-gray-400"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page numbers would be generated here */}
          <Button className="scale-105 bg-buttonActive px-3 py-1 text-white">
            1
          </Button>

          <Button className="bg-gray-300 px-3 py-1 text-black hover:bg-gray-400">
            2
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Next page logic
            }}
            className="bg-gray-300 p-2 text-black transition-colors hover:bg-gray-400"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Last page logic
            }}
            className="bg-gray-300 p-2 text-black transition-colors hover:bg-gray-400"
          >
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
};

export default MemberTable;
