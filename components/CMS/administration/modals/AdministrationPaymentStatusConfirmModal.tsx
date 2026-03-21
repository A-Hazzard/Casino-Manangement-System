/**
 * Payment Status Confirm Modal Component
 * Confirmation modal for toggling licencee payment status.
 *
 * Features:
 * - Payment status toggle confirmation
 * - Current and new status display
 * - Expiry date calculation (30 days from now)
 * - Date formatting
 * - GSAP animations
 * - Licencee name display
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
  licenceeName: string;
  currentExpiryDate?: Date | string;
};

function AdministrationPaymentStatusConfirmModal({
  open,
  onClose,
  onConfirm,
  currentStatus,
  licenceeName,
  currentExpiryDate,
}: AdministrationPaymentStatusConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  if (!open) return null;

  const newStatus = !currentStatus;
  const currentDate = new Date();
  const newExpiryDate = getNext30DaysDate();

  return (
    <div className="fixed inset-0 z-[100000]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-md bg-container shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive text-center flex-1">
                Confirm Payment Status Change
              </h2>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-grayHighlight hover:bg-buttonInactive/10 h-8 w-8 p-0 shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-lg font-semibold text-grayHighlight">
                  Are you sure you want to change the payment status for{' '}
                  <span className="font-bold text-buttonActive">
                    &quot;{licenceeName}&quot;
                  </span>{' '}
                  from{' '}
                  <span
                    className={`font-bold ${
                      currentStatus ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {currentStatus ? 'Paid' : 'Unpaid'}
                  </span>{' '}
                  to{' '}
                  <span
                    className={`font-bold ${
                      newStatus ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {newStatus ? 'Paid' : 'Unpaid'}
                  </span>
                  ?
                </p>

                {!currentStatus && newStatus && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 text-left">
                    <p className="mb-2 text-sm text-blue-800 dark:text-blue-300 font-medium">
                      Note: This licence will expire 30 days from today.
                    </p>
                    <div className="grid grid-cols-1 gap-2 text-xs text-grayHighlight">
                      <div className="flex justify-between">
                        <span className="font-medium">Current Date:</span>
                        <span>{formatDate(currentDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">New Expiry Date:</span>
                        <span>{formatDate(newExpiryDate)}</span>
                      </div>
                      {currentExpiryDate && (
                        <div className="flex justify-between">
                          <span className="font-medium">Previous Expiry:</span>
                          <span>{formatDate(currentExpiryDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={onConfirm}
                className={newStatus ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              >
                Confirm Change
              </Button>
              <Button
                onClick={onClose}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default AdministrationPaymentStatusConfirmModal;

