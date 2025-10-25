import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import type { Licensee } from '@/lib/types/licensee';

type PaymentHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  licensee: Licensee | null;
};

type Payment = {
  id: string;
  type: string;
  datePaid: string;
  nextBilling: string;
  amount: string;
  status: 'completed' | 'overdue' | 'cancelled';
};

export default function PaymentHistoryModal({
  open,
  onClose,
  licensee,
}: PaymentHistoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // TODO: Replace with MongoDB data fetching
  const payments: Payment[] = [];

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [open]);

  if (!open || !licensee) return null;

  const getStatusDisplay = (payment: Payment) => {
    switch (payment.status) {
      case 'cancelled':
        return (
          <div className="text-right">
            <div className="text-lg font-bold text-red-600">Cancelled</div>
          </div>
        );
      case 'overdue':
        return (
          <div className="text-right">
            <div className="text-lg font-bold text-orange-600">
              {payment.amount}
            </div>
            <div className="text-sm text-orange-600">Overdue</div>
          </div>
        );
      case 'completed':
        return (
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {payment.amount}
            </div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        ref={modalRef}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="relative border-b border-gray-200 bg-white px-6 py-6">
          <button
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Main Title */}
          <h2 className="mb-2 pr-12 text-3xl font-bold text-gray-900">
            Payment History
          </h2>

          {/* Subtitle/Context */}
          <p className="text-lg text-gray-600">{licensee.name}</p>
        </div>

        {/* Payment Records Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-6 py-6">
            <div className="space-y-4">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left Section - Payment Details */}
                    <div className="min-w-0 flex-1">
                      {/* Payment Type */}
                      <h3 className="mb-3 text-lg font-bold text-gray-900">
                        {payment.type}
                      </h3>

                      {/* Date Paid */}
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-700">
                          Date Paid:
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                          {payment.datePaid}
                        </span>
                      </div>

                      {/* Next Billing */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-700">
                          Next Billing:
                        </span>
                        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                          {payment.nextBilling}
                        </span>
                      </div>
                    </div>

                    {/* Right Section - Status and Amount */}
                    <div className="flex-shrink-0 lg:ml-6">
                      {getStatusDisplay(payment)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {payments.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <div className="text-lg font-medium">
                  No payment history found
                </div>
                <div className="mt-1 text-sm">
                  Payment records will appear here once available
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
