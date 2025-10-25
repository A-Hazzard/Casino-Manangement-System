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

type LicenseeCardProps = {
  licensee: Licensee;
  onEdit: (licensee: Licensee) => void;
  onDelete: (licensee: Licensee) => void;
  onPaymentHistory: (licensee: Licensee) => void;
  onTogglePaymentStatus: (licensee: Licensee) => void;
};

export default function LicenseeCard({
  licensee,
  onEdit,
  onDelete,
  onPaymentHistory,
  onTogglePaymentStatus,
}: LicenseeCardProps) {
  const isPaid = isLicenseePaid(licensee);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="overflow-hidden rounded-lg bg-white shadow-md"
    >
      <div className="flex flex-col gap-2 bg-blue-500 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div
          className="truncate text-base font-bold sm:text-lg"
          title={licensee.name}
        >
          {licensee.name}
        </div>
      </div>
      <div className="p-3">
        <div className="mb-3 space-y-2">
          {licensee.description && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Description:</span>{' '}
              {licensee.description}
            </div>
          )}
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Country:</span>{' '}
            {licensee.countryName || licensee.country}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Valid From:</span>{' '}
            {formatLicenseeDate(licensee.startDate)}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Expires:</span>{' '}
            {formatLicenseeDate(licensee.expiryDate)}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              <span className="font-semibold">Payment Status:</span>
            </span>
            {!isPaid || canChangePaymentStatus(licensee) ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isPaid
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {isPaid ? 'Paid' : 'Unpaid'}
                  <ChevronDownIcon
                    className={`h-3 w-3 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[80px] rounded-md border border-gray-200 bg-white shadow-lg">
                    <button
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                        !isPaid ? 'font-medium text-red-600' : 'text-gray-700'
                      }`}
                      onClick={() => {
                        if (isPaid) {
                          onTogglePaymentStatus(licensee);
                        }
                        setDropdownOpen(false);
                      }}
                      disabled={!isPaid}
                    >
                      Unpaid
                    </button>
                    <button
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                        isPaid ? 'font-medium text-green-600' : 'text-gray-700'
                      }`}
                      onClick={() => {
                        if (!isPaid) {
                          onTogglePaymentStatus(licensee);
                        }
                        setDropdownOpen(false);
                      }}
                      disabled={isPaid}
                    >
                      Paid
                    </button>
                  </div>
                )}
              </div>
            ) : (
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
            )}
          </div>
          {licensee.lastEdited && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Last Edited:</span>{' '}
              {formatLicenseeDate(licensee.lastEdited)}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Image
            src={creditCardIcon}
            alt="Payment History"
            width={22}
            height={22}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onPaymentHistory(licensee)}
          />
          <Image
            src={editIcon}
            alt="Edit"
            width={22}
            height={22}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onEdit(licensee)}
          />
          <Image
            src={deleteIcon}
            alt="Delete"
            width={22}
            height={22}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onDelete(licensee)}
          />
        </div>
      </div>
    </div>
  );
}
