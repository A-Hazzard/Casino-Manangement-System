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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div ref={tableRef} className="hidden lg:block">
      <Table className="bg-white rounded-lg shadow-md">
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="text-white font-semibold">NAME</TableHead>
            <TableHead centered className="text-white font-semibold">
              DESCRIPTION
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              COUNTRY
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              VALID FROM
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              EXPIRES
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              PAYMENT STATUS
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              LAST EDITED
            </TableHead>
            <TableHead centered className="text-white font-semibold">
              ACTIONS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licensees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500 py-6">
                No licensees found.
              </TableCell>
            </TableRow>
          ) : (
            licensees.map((licensee) => {
              const isPaid = isLicenseePaid(licensee);
              return (
                <TableRow
                  key={licensee._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="font-medium text-gray-700">
                    {licensee.name}
                  </TableCell>
                  <TableCell centered className="text-gray-700">
                    {licensee.description || "-"}
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
                      <div className="flex justify-center items-center w-full h-full">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === licensee._id
                                  ? null
                                  : licensee._id
                              )
                            }
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                              isPaid
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >
                            {isPaid ? "Paid" : "Unpaid"}
                            <ChevronDownIcon
                              className={`w-3 h-3 transition-transform ${
                                openDropdown === licensee._id
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                          {openDropdown === licensee._id && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg min-w-[80px]">
                              <button
                                className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                                  !isPaid
                                    ? "text-red-600 font-medium"
                                    : "text-gray-700"
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
                                className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                                  isPaid
                                    ? "text-green-600 font-medium"
                                    : "text-gray-700"
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
                      <div className="flex justify-center items-center w-full h-full">
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
