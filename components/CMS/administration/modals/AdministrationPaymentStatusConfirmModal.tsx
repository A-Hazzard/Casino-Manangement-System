/**
 * Payment Status Confirm Modal Component
 * Confirmation modal for toggling licensee payment status.
 *
 * Features:
 * - Payment status toggle confirmation
 * - Current and new status display
 * - Expiry date calculation (30 days from now)
 * - Date formatting
 * - GSAP animations
 * - Licensee name display
 *
 * @param props - Component props
 */
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/shared/ui/button';
import { X } from 'lucide-react';
import { formatDate, getNext30DaysDate } from '@/lib/utils/date';

type AdministrationPaymentStatusConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: boolean;
  licenseeName: string;
  currentExpiryDate?: Date | string;
};

function AdministrationPaymentStatusConfirmModal({
  open,
  onClose,
  onConfirm,
  currentStatus,
  licenseeName,
  currentExpiryDate,
}: AdministrationPaymentStatusConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  if (!open) return null;

  const newStatus = !currentStatus;
  const currentDate = new Date();
  const newExpiryDate = getNext30DaysDate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Confirm Payment Status Change
            </h3>
            <p className="mb-4 text-gray-600">
              Are you sure you want to change the payment status for{' '}
              <span className="font-semibold">&quot;{licenseeName}&quot;</span>{' '}
              from{' '}
              <span
                className={`font-semibold ${
                  currentStatus ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {currentStatus ? 'Paid' : 'Unpaid'}
              </span>{' '}
              to{' '}
              <span
                className={`font-semibold ${
                  newStatus ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {newStatus ? 'Paid' : 'Unpaid'}
              </span>
              ?
            </p>
            {!currentStatus && newStatus && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-2 text-sm text-blue-800">
                  <strong>Note:</strong> This license will expire{' '}
                  <strong>30 days from today</strong>.
                </p>
                <div className="flex flex-col gap-1 text-xs text-gray-700">
                  <div>
                    <span className="font-semibold">Current Date:</span>{' '}
                    {formatDate(currentDate)}
                  </div>
                  <div>
                    <span className="font-semibold">New Expiry Date:</span>{' '}
                    {formatDate(newExpiryDate)}
                  </div>
                  {currentExpiryDate && (
                    <div>
                      <span className="font-semibold">
                        Previous Expiry Date:
                      </span>{' '}
                      {formatDate(currentExpiryDate)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-500 py-2 text-white transition-colors hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 rounded-lg py-2 text-white transition-colors ${
                newStatus
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Confirm Change
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdministrationPaymentStatusConfirmModal;

