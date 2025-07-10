import type { Licensee } from "@/lib/types/licensee";
import Image from "next/image";
import {
  isLicenseePaid,
  formatLicenseeDate,
  canChangePaymentStatus,
} from "@/lib/utils/licensee";
import { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import creditCardIcon from "@/public/creditCardIcon.svg";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="bg-blue-500 text-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div
          className="font-bold text-base sm:text-lg truncate"
          title={licensee.name}
        >
          {licensee.name}
        </div>
      </div>
      <div className="p-3">
        <div className="space-y-2 mb-3">
          {licensee.description && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Description:</span>{" "}
              {licensee.description}
            </div>
          )}
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Country:</span>{" "}
            {licensee.countryName || licensee.country}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Valid From:</span>{" "}
            {formatLicenseeDate(licensee.startDate)}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Expires:</span>{" "}
            {formatLicenseeDate(licensee.expiryDate)}
          </div>
          <div className="text-sm text-gray-600 flex items-center justify-between">
            <span>
              <span className="font-semibold">Payment Status:</span>
            </span>
            {!isPaid || canChangePaymentStatus(licensee) ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    isPaid
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                  <ChevronDownIcon
                    className={`w-3 h-3 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg min-w-[80px]">
                    <button
                      className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                        !isPaid ? "text-red-600 font-medium" : "text-gray-700"
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
                      className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                        isPaid ? "text-green-600 font-medium" : "text-gray-700"
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
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  isPaid
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
                style={{ minWidth: 70, textAlign: "center" }}
              >
                {isPaid ? "Paid" : "Unpaid"}
              </span>
            )}
          </div>
          {licensee.lastEdited && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Last Edited:</span>{" "}
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
