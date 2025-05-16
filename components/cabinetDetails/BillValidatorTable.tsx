import React from "react";
import { formatCurrency } from "@/lib/utils";

/**
 * Renders a table of accepted bills grouped by denomination.
 * @param data - Array of AcceptedBill objects.
 * @returns Bill validator table component.
 */
type BillValidatorTableProps = {
  bills: Array<{ denomination: number; count: number }>;
};

const DEFAULT_DENOMS = [20, 100, 500, 1000, 2000, 5000];

export const BillValidatorTable: React.FC<BillValidatorTableProps> = ({
  bills,
}) => {
  // Group and sum quantities by denomination
  const denomMap = new Map<number, number>();
  for (const bill of bills) {
    denomMap.set(
      bill.denomination,
      (denomMap.get(bill.denomination) || 0) + bill.count
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
    <div className="overflow-x-auto">
      <table className="min-w-[350px] w-full border border-border rounded-lg shadow-md">
        <thead>
          <tr className="bg-blueHighlight text-container">
            <th className="py-2 px-4 text-left rounded-tl-lg">Denomination</th>
            <th className="py-2 px-4 text-left">Quantity</th>
            <th className="py-2 px-4 text-left rounded-tr-lg">Subtotal</th>
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
  );
};

export default BillValidatorTable;
