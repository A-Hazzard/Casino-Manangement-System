import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import type { Licensee } from "@/lib/types/licensee";

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
  status: "completed" | "overdue" | "cancelled";
};

export default function PaymentHistoryModal({
  open,
  onClose,
  licensee,
}: PaymentHistoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Enhanced dummy payment data matching the design requirements
  const payments: Payment[] = [
    {
      id: "1",
      type: "Monthly Subscription Payment",
      datePaid: "10/06/2025",
      nextBilling: "10/22/2025",
      amount: "$1,200",
      status: "completed",
    },
    {
      id: "2",
      type: "Monthly Subscription Payment",
      datePaid: "09/06/2025",
      nextBilling: "10/08/2025",
      amount: "$1,200",
      status: "overdue",
    },
    {
      id: "3",
      type: "Monthly Subscription Payment",
      datePaid: "08/06/2025",
      nextBilling: "10/07/2025",
      amount: "$1,200",
      status: "cancelled",
    },
    {
      id: "4",
      type: "Monthly Subscription Payment",
      datePaid: "07/06/2025",
      nextBilling: "08/06/2025",
      amount: "$1,200",
      status: "completed",
    },
  ];

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  if (!open || !licensee) return null;

  const getStatusDisplay = (payment: Payment) => {
    switch (payment.status) {
      case "cancelled":
        return (
          <div className="text-right">
            <div className="text-red-600 font-bold text-lg">Cancelled</div>
          </div>
        );
      case "overdue":
        return (
          <div className="text-right">
            <div className="text-orange-600 font-bold text-lg">
              {payment.amount}
            </div>
            <div className="text-orange-600 text-sm">Overdue</div>
          </div>
        );
      case "completed":
        return (
          <div className="text-right">
            <div className="text-green-600 font-bold text-lg">
              {payment.amount}
            </div>
            <div className="text-green-600 text-sm">Completed</div>
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-white border-b border-gray-200 px-6 py-6">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Main Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2 pr-12">
            Payment History
          </h2>

          {/* Subtitle/Context */}
          <p className="text-lg text-gray-600">{licensee.name}</p>
        </div>

        {/* Payment Records Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-6 py-6">
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left Section - Payment Details */}
                    <div className="flex-1 min-w-0">
                      {/* Payment Type */}
                      <h3 className="font-bold text-gray-900 text-lg mb-3">
                        {payment.type}
                      </h3>

                      {/* Date Paid */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-gray-700 font-medium">
                          Date Paid:
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {payment.datePaid}
                        </span>
                      </div>

                      {/* Next Billing */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-700 font-medium">
                          Next Billing:
                        </span>
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
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
              <div className="text-center text-gray-500 py-12">
                <div className="text-lg font-medium">
                  No payment history found
                </div>
                <div className="text-sm mt-1">
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
