import React from "react";
import { formatCurrency } from "@/lib/utils";

/**
 * Renders a table of accepted bills grouped by denomination.
 * @param data - Array of AcceptedBill objects.
 * @returns Bill validator table component.
 */
type ExtendedBillValidatorTableProps = {
  bills: Array<{ denomination: number; quantity: number; subtotal?: number }>;
};

const DEFAULT_DENOMS = [20, 100, 500, 1000, 2000, 5000];

export const BillValidatorTable: React.FC<ExtendedBillValidatorTableProps> = ({
  bills,
}) => {
  // Group and sum quantities by denomination
  const denomMap = new Map<number, number>();
  for (const bill of bills) {
    denomMap.set(
      bill.denomination,
      (denomMap.get(bill.denomination) || 0) + bill.quantity
    );
  }
  const tableRows = DEFAULT_DENOMS.map((denom) => {
    const quantity = denomMap.get(denom) || 0;
    const subtotal = quantity * denom;
    return { denomination: denom, quantity, subtotal };
  });
  const totalQty = tableRows.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = tableRows.reduce((sum, r) => sum + r.subtotal, 0);

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-[350px] w-full border border-border rounded-lg shadow-md">
          <thead>
            <tr className="bg-blueHighlight text-container">
              <th className="py-2 px-4 text-center rounded-tl-lg">
                Denomination
              </th>
              <th className="py-2 px-4 text-center">Quantity</th>
              <th className="py-2 px-4 text-center rounded-tr-lg">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-container">
            {tableRows.map((row) => (
              <tr
                key={row.denomination}
                className="border-b border-border last:border-b-0"
              >
                <td className="py-2 px-4">{row.denomination}</td>
                <td className="py-2 px-4">{row.quantity}</td>
                <td className="py-2 px-4">
                  {row.subtotal === 0 ? 0 : formatCurrency(row.subtotal)}
                </td>
              </tr>
            ))}
            <tr className="bg-background font-bold border-t border-border">
              <td className="py-2 px-4">Total</td>
              <td className="py-2 px-4">{totalQty}</td>
              <td className="py-2 px-4">{formatCurrency(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-3 w-full">
        {tableRows.map((row) => (
          <div
            key={row.denomination}
            className="bg-white rounded-xl shadow-md overflow-hidden w-full"
          >
            <div className="bg-blueHighlight text-white px-4 py-2 font-semibold text-sm">
              Denomination: {row.denomination}
            </div>
            <div className="p-4 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Quantity</span>
                <span className="font-medium">{row.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-medium">
                  {row.subtotal === 0 ? "0" : formatCurrency(row.subtotal)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Total Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden w-full border-2 border-blueHighlight">
          <div className="bg-background text-gray-800 px-4 py-2 font-bold text-sm">
            Total Summary
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">
                Total Quantity
              </span>
              <span className="font-bold">{totalQty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Total Amount</span>
              <span className="font-bold text-blueHighlight">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillValidatorTable;
