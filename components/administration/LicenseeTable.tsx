import type { Licensee } from '@/lib/types/licensee';
import Image from 'next/image';
import {
  isLicenseePaid,
  formatLicenseeDate,
  canChangePaymentStatus,
} from '@/lib/utils/licensee';
import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import creditCardIcon from '@/public/creditCardIcon.svg';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type LicenseeTableProps = {
  licensees: Licensee[];
  onEdit: (licensee: Licensee) => void;
  onDelete: (licensee: Licensee) => void;
  onPaymentHistory: (licensee: Licensee) => void;
  onTogglePaymentStatus: (licensee: Licensee) => void;
};

export default function LicenseeTable({
  licensees,
  onEdit,
  onDelete,
  onPaymentHistory,
  onTogglePaymentStatus,
}: LicenseeTableProps) {
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
              DESCRIPTION
            </TableHead>
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
              LAST EDITED
            </TableHead>
            <TableHead centered className="font-semibold text-white">
              ACTIONS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licensees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-6 text-center text-gray-500">
                No licensees found.
              </TableCell>
            </TableRow>
          ) : (
            licensees.map(licensee => {
              const isPaid = isLicenseePaid(licensee);
              return (
                <TableRow
                  key={licensee._id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <TableCell className="font-medium text-gray-700">
                    {licensee.name}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {licensee.description || '-'}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {licensee.countryName || licensee.country}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {formatLicenseeDate(licensee.startDate)}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {formatLicenseeDate(licensee.expiryDate)}
                  </TableCell>
                  <TableCell centered>
                    {!isPaid || canChangePaymentStatus(licensee) ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === licensee._id
                                  ? null
                                  : licensee._id
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
                                openDropdown === licensee._id
                                  ? 'rotate-180'
                                  : ''
                              }`}
                            />
                          </button>
                          {openDropdown === licensee._id && (
                            <div className="absolute left-1/2 top-full z-20 mt-1 min-w-[80px] -translate-x-1/2 transform rounded-md border border-gray-200 bg-white shadow-lg">
                              <button
                                className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                                  !isPaid
                                    ? 'font-medium text-red-600'
                                    : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  if (isPaid) {
                                    onTogglePaymentStatus(licensee);
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
                                    onTogglePaymentStatus(licensee);
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
                  <TableCell centered className="text-gray-700">
                    {formatLicenseeDate(licensee.lastEdited)}
                  </TableCell>
                  <TableCell centered>
                    <div className="flex items-center justify-center gap-3">
                      <Image
                        src={creditCardIcon}
                        alt="Payment History"
                        width={20}
                        height={20}
                        className="cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => onPaymentHistory(licensee)}
                      />
                      <Image
                        src={editIcon}
                        alt="Edit"
                        width={20}
                        height={20}
                        className="cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => onEdit(licensee)}
                      />
                      <Image
                        src={deleteIcon}
                        alt="Delete"
                        width={20}
                        height={20}
                        className="cursor-pointer opacity-70 hover:opacity-100"
                        onClick={() => onDelete(licensee)}
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
