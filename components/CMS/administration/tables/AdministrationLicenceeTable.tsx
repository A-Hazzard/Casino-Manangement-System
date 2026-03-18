/**
 * Licencee Table Component
 * Desktop table view for displaying licencees with payment status and actions.
 *
 * Features:
 * - Licencee information display (name, country, dates, payment status)
 * - Payment status indicators
 * - Action dropdown menu (edit, delete, payment history, toggle payment)
 * - Payment status toggle functionality
 * - Date formatting
 * - Click outside to close dropdown
 * - Responsive design (desktop only)
 *
 * @param props - Component props
 */
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import type { Licencee } from '@/lib/types/common';
import {
    canChangePaymentStatus,
    formatLicenceeDate,
    isLicenceePaid,
} from '@/lib/utils/licencee';
import creditCardIcon from '@/public/creditCardIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import editIcon from '@/public/editIcon.svg';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type AdministrationLicenceeTableProps = {
  licencees: Licencee[];
  onEdit: (licencee: Licencee) => void;
  onDelete: (licencee: Licencee) => void;
  onPaymentHistory: (licencee: Licencee) => void;
  onTogglePaymentStatus: (licencee: Licencee) => void;
};

function AdministrationLicenceeTable({
  licencees,
  onEdit,
  onDelete,
  onPaymentHistory,
  onTogglePaymentStatus,
}: AdministrationLicenceeTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tableRef.current &&
        !tableRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={tableRef} className="hidden lg:block">
      <Table className="rounded-lg bg-white shadow-md">
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="font-semibold text-white">NAME</TableHead>
            <TableHead centered className="font-semibold text-white">
              COUNTRY
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              VALID FROM
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              EXPIRES
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              PAYMENT STATUS
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              SUBTRACT JACKPOT
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              LAST EDITED
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              ACTIONS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licencees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-6 text-center text-gray-500">
                No licencees found.
              </TableCell>
            </TableRow>
          ) : (
            licencees.map(licencee => {
              const isPaid = isLicenceePaid(licencee);
              return (
                <TableRow
                  key={licencee._id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <TableCell className="font-medium text-gray-700">
                    {licencee.name}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {licencee.countryName || licencee.country}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {formatLicenceeDate(licencee.startDate)}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {formatLicenceeDate(licencee.expiryDate)}
                  </TableCell>
                  <TableCell centered>
                    {!isPaid || canChangePaymentStatus(licencee) ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === licencee._id
                                  ? null
                                  : licencee._id
                              )
                            }
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              isPaid
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {isPaid ? 'Paid' : 'Unpaid'}
                            <ChevronDownIcon
                              className={`h-3 w-3 transition-transform ${
                                openDropdown === licencee._id
                                  ? 'rotate-180'
                                  : ''
                              }`}
                            />
                          </button>
                          {openDropdown === licencee._id && (
                            <div className="absolute left-1/2 top-full z-20 mt-1 min-w-[80px] -translate-x-1/2 transform rounded-md border border-gray-200 bg-white shadow-lg">
                              <button
                                className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                                  !isPaid
                                    ? 'font-medium text-red-600'
                                    : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  if (isPaid) {
                                    onTogglePaymentStatus(licencee);
                                  }
                                  setOpenDropdown(null);
                                }}
                                disabled={!isPaid}
                              >
                                Unpaid
                              </button>
                              <button
                                className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                                  isPaid
                                    ? 'font-medium text-green-600'
                                    : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  if (!isPaid) {
                                    onTogglePaymentStatus(licencee);
                                  }
                                  setOpenDropdown(null);
                                }}
                                disabled={isPaid}
                              >
                                Paid
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            isPaid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                          style={{ minWidth: 70, textAlign: 'center' }}
                        >
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell centered>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        licencee.subtractJackpot
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {licencee.subtractJackpot ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {formatLicenceeDate(licencee.lastEdited)}
                  </TableCell>
                  <TableCell centered>
                    <div className="flex items-center justify-center gap-3">
                      <Image
                        src={creditCardIcon}
                        alt="Payment History"
                        width={20}
                        height={20}
                        className="cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => onPaymentHistory(licencee)}
                      />
                      <Image
                        src={editIcon}
                        alt="Edit"
                        width={20}
                        height={20}
                        className="cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => onEdit(licencee)}
                      />
                      <Image
                        src={deleteIcon}
                        alt="Delete"
                        width={20}
                        height={20}
                        className="cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => onDelete(licencee)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default AdministrationLicenceeTable;
