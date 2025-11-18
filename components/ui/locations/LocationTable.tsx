'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LocationTableProps } from '@/lib/types/location';

import React from 'react';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';

const LocationTable: React.FC<LocationTableProps> = ({
  locations,
  sortOption,
  sortOrder,
  onSort,
  onLocationClick,
  onAction,
  formatCurrency,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleRowClick = (locationId: string) => {
    onLocationClick(locationId);
  };

  return (
    <>
      <div className="overflow-x-auto bg-white shadow">
        <Table ref={tableRef} className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
              <TableHead
                className="relative cursor-pointer font-semibold text-white"
                onClick={() => onSort('locationName')}
                isFirstColumn={true}
              >
                <span>LOCATION NAME</span>
                {sortOption === 'locationName' && (
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
                onClick={() => onSort('gross')}
              >
                <span>GROSS</span>
                {sortOption === 'gross' && (
                  <span className="sort-icon absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {sortOrder === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </TableHead>
              <TableHead className="font-semibold text-white">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map(loc => {
              const location = loc as Record<string, unknown>;
              return (
                <TableRow
                  key={location.locationName as string}
                  className="cursor-pointer hover:bg-muted"
                  onClick={e => {
                    if (!(e.target as HTMLElement).closest('td:last-child')) {
                      handleRowClick(location.location as string);
                    }
                  }}
                >
                  <TableCell isFirstColumn={true}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {(location.locationName as string) ||
                          'Unknown Location'}
                      </span>
                      {typeof location.onlineMachines === 'number' && typeof location.totalMachines === 'number' && (() => {
                        const online = location.onlineMachines;
                        const total = location.totalMachines;
                        const isAllOnline = total > 0 && online === total;
                        const isAllOffline = total > 0 && online === 0;
                        const hasMachines = total > 0;
                        
                        let badgeClass = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';
                        let dotClass = 'h-1.5 w-1.5 rounded-full';
                        
                        if (!hasMachines) {
                          badgeClass += ' bg-gray-50 text-gray-600 ring-gray-200';
                          dotClass += ' bg-gray-400';
                        } else if (isAllOffline) {
                          badgeClass += ' bg-red-50 text-red-700 ring-red-600/20';
                          dotClass += ' bg-red-500';
                        } else if (isAllOnline) {
                          badgeClass += ' bg-green-50 text-green-700 ring-green-600/20';
                          dotClass += ' bg-green-500';
                        } else {
                          badgeClass += ' bg-yellow-50 text-yellow-700 ring-yellow-600/20';
                          dotClass += ' bg-yellow-500';
                        }
                        
                        return (
                          <span className={badgeClass}>
                            <span className={dotClass}></span>
                            {online}/{total} Online
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(loc.moneyIn || 0)}</TableCell>
                  <TableCell>{formatCurrency(loc.moneyOut || 0)}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(loc.gross || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          onAction('edit', loc);
                        }}
                        className="h-8 w-8 p-1 hover:bg-accent"
                      >
                        <Image
                          src={editIcon}
                          alt="Edit"
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          onAction('delete', loc);
                        }}
                        className="h-8 w-8 p-1 hover:bg-accent"
                      >
                        <Image
                          src={deleteIcon}
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
    </>
  );
};

export default LocationTable;
