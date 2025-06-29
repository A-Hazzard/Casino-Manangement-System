import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatDate, getNext30DaysDate } from "@/lib/utils/dateFormatting";

type PaymentStatusConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentStatus: boolean;
  licenseeName: string;
  currentExpiryDate?: Date | string;
};

export default function PaymentStatusConfirmModal({
  open,
  onClose,
  onConfirm,
  currentStatus,
  licenseeName,
  currentExpiryDate,
}: PaymentStatusConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirm Payment Status Change
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to change the payment status for{" "}
              <span className="font-semibold">&quot;{licenseeName}&quot;</span>{" "}
              from{" "}
              <span
                className={`font-semibold ${
                  currentStatus ? "text-green-600" : "text-red-600"
                }`}
              >
                {currentStatus ? "Paid" : "Unpaid"}
              </span>{" "}
              to{" "}
              <span
                className={`font-semibold ${
                  newStatus ? "text-green-600" : "text-red-600"
                }`}
              >
                {newStatus ? "Paid" : "Unpaid"}
              </span>
              ?
            </p>
            {!currentStatus && newStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Note:</strong> This license will expire{" "}
                  <strong>30 days from today</strong>.
                </p>
                <div className="flex flex-col gap-1 text-xs text-gray-700">
                  <div>
                    <span className="font-semibold">Current Date:</span>{" "}
                    {formatDate(currentDate)}
                  </div>
                  <div>
                    <span className="font-semibold">New Expiry Date:</span>{" "}
                    {formatDate(newExpiryDate)}
                  </div>
                  {currentExpiryDate && (
                    <div>
                      <span className="font-semibold">
                        Previous Expiry Date:
                      </span>{" "}
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
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 py-2 rounded-lg transition-colors text-white ${
                newStatus
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
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
