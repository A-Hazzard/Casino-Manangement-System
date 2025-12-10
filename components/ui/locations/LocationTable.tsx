'use client';

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
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { BadgeCheck, Eye, FileWarning, Home, Server } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';

import deleteIcon from '@/public/deleteIcon.svg';
import editIcon from '@/public/editIcon.svg';
import React from 'react';

const LocationTable: React.FC<LocationTableProps> = ({
  locations,
  sortOption,
  sortOrder,
  onSort,
  onLocationClick,
  onAction,
  formatCurrency,
  canManageLocations = true, // Default to true for backward compatibility
  selectedFilters = [], // Add selectedFilters prop
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

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
                  className="hover:bg-muted"
                >
                  <TableCell isFirstColumn={true}>
                    <div className="flex flex-col gap-1.5">
                      {/* Row 1: Location name with membership icon */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const locationId = location.location as string;
                          if (locationId) {
                            onLocationClick(locationId);
                          }
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-left font-medium text-gray-900 hover:text-blue-600 hover:underline"
                        title="Click to view location details"
                        disabled={!location.location}
                      >
                        {(location.locationName as string) ||
                          'Unknown Location'}
                        {/* SMIB Icon - Show if location has SMIB machines */}
                        {Boolean(
                          (location as { hasSmib?: boolean }).hasSmib ||
                            !(location as { noSMIBLocation?: boolean })
                              .noSMIBLocation
                        ) && (
                          <div className="group relative inline-flex flex-shrink-0">
                            <Server className="h-4 w-4 text-blue-600" />
                            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              SMIB Location
                            </div>
                          </div>
                        )}
                        {/* Local Server Icon */}
                        {Boolean(
                          (location as { isLocalServer?: boolean })
                            .isLocalServer
                        ) && (
                          <div className="group relative inline-flex flex-shrink-0">
                            <Home className="h-4 w-4 text-purple-600" />
                            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              Local Server
                            </div>
                          </div>
                        )}
                        {Boolean(
                          (location as { membershipEnabled?: boolean })
                            .membershipEnabled
                        ) && (
                          <div className="group relative inline-flex flex-shrink-0">
                            <BadgeCheck className="h-4 w-4 text-green-600" />
                            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              Membership enabled
                            </div>
                          </div>
                        )}
                        {selectedFilters.some(f => f === 'NoSMIBLocation') &&
                          Boolean(
                            (
                              location as {
                                hasNoRecentCollectionReport?: boolean;
                              }
                            ).hasNoRecentCollectionReport
                          ) && (
                            <div className="group relative inline-flex flex-shrink-0">
                              <FileWarning className="h-4 w-4 text-red-600" />
                              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                No collection report in past 3 months
                              </div>
                            </div>
                          )}
                      </button>

                      {/* Row 2: Status badges - machine online/offline and member count */}
                      <div className="flex flex-wrap items-center gap-1.5">
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

                            if (!hasMachines) {
                              badgeClass +=
                                ' bg-gray-50 text-gray-600 ring-gray-200';
                              dotClass += ' bg-gray-400';
                            } else if (isAllOffline) {
                              badgeClass +=
                                ' bg-red-50 text-red-700 ring-red-600/20';
                              dotClass += ' bg-red-500';
                            } else if (isAllOnline) {
                              badgeClass +=
                                ' bg-green-50 text-green-700 ring-green-600/20';
                              dotClass += ' bg-green-500';
                            } else {
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
                        {typeof (location as { memberCount?: number })
                          .memberCount === 'number' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            {(location as { memberCount?: number }).memberCount}{' '}
                            Members
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold ${getMoneyInColorClass(loc.moneyIn)}`}
                    >
                      {formatCurrency(loc.moneyIn || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold ${getMoneyOutColorClass(loc.moneyOut, loc.moneyIn)}`}
                    >
                      {formatCurrency(loc.moneyOut || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold ${getGrossColorClass(loc.gross)}`}
                    >
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
                          onLocationClick(location.location as string);
                        }}
                        className="h-8 w-8 p-1 hover:bg-accent"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManageLocations && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              onAction('edit', loc);
                            }}
                            className="h-8 w-8 p-1 hover:bg-accent"
                            title="Edit"
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
                            title="Delete"
                          >
                            <Image
                              src={deleteIcon}
                              alt="Delete"
                              width={16}
                              height={16}
                              className="h-4 w-4"
                            />
                          </Button>
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
    </>
  );
};

export default LocationTable;
