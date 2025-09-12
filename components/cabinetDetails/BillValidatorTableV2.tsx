import React from "react";
import { formatCurrency } from "@/lib/utils";

/**
 * Bill Validator Table V2 - Uses billMeters data structure
 * This is the correct implementation that uses the billMeters schema
 * instead of the billValidator.notes array
 */
type BillMetersData = {
  dollar1?: number;
  dollar2?: number;
  dollar5?: number;
  dollar10?: number;
  dollar20?: number;
  dollar50?: number;
  dollar100?: number;
  dollar500?: number;
  dollar1000?: number;
  dollar2000?: number;
  dollar5000?: number;
  dollarTotal?: number;
  dollarTotalUnknown?: number;
};

type BillValidatorTableV2Props = {
  billMeters?: BillMetersData | null;
  billValidatorBalance?: number;
};

export const BillValidatorTableV2: React.FC<BillValidatorTableV2Props> = ({
  billMeters,
  billValidatorBalance = 0,
}) => {
  // Define the denomination mapping
  const denominationMap = [
    { key: 'dollar1', value: 1, label: '$1' },
    { key: 'dollar2', value: 2, label: '$2' },
    { key: 'dollar5', value: 5, label: '$5' },
    { key: 'dollar10', value: 10, label: '$10' },
    { key: 'dollar20', value: 20, label: '$20' },
    { key: 'dollar50', value: 50, label: '$50' },
    { key: 'dollar100', value: 100, label: '$100' },
    { key: 'dollar500', value: 500, label: '$500' },
    { key: 'dollar1000', value: 1000, label: '$1000' },
    { key: 'dollar2000', value: 2000, label: '$2000' },
    { key: 'dollar5000', value: 5000, label: '$5000' },
  ];

  // Process the bill meters data
  const tableRows = denominationMap.map(({ key, value, label }) => {
    const quantity = billMeters?.[key as keyof BillMetersData] || 0;
    const subtotal = quantity * value;
    return { 
      denomination: value, 
      label, 
      quantity, 
      subtotal 
    };
  });

  // Calculate totals
  const totalQty = tableRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = tableRows.reduce((sum, row) => sum + row.subtotal, 0);
  
  // Add unknown bills if present
  const unknownBills = billMeters?.dollarTotalUnknown || 0;
  const totalWithUnknown = totalAmount + unknownBills;

  return (
    <div className="w-full">
      {/* Current Balance Display */}
      <div className="mb-6 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Bill Validator Status
          </h3>
          <div className="flex justify-center items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(billValidatorBalance)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Bills</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalWithUnknown)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-[400px] w-full border border-gray-200 rounded-lg shadow-md">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-3 px-4 text-center rounded-tl-lg font-semibold">
                Denomination
              </th>
              <th className="py-3 px-4 text-center font-semibold">Quantity</th>
              <th className="py-3 px-4 text-center font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {tableRows.map((row) => (
              <tr
                key={row.denomination}
                className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
              >
                <td className="py-3 px-4 font-medium">{row.label}</td>
                <td className="py-3 px-4">{row.quantity}</td>
                <td className="py-3 px-4">
                  {row.subtotal === 0 ? "0" : formatCurrency(row.subtotal)}
                </td>
              </tr>
            ))}
            
            {/* Unknown Bills Row */}
            {unknownBills > 0 && (
              <tr className="border-b border-gray-200 bg-yellow-50">
                <td className="py-3 px-4 font-medium text-yellow-800">Unknown Bills</td>
                <td className="py-3 px-4 text-yellow-800">-</td>
                <td className="py-3 px-4 text-yellow-800">
                  {formatCurrency(unknownBills)}
                </td>
              </tr>
            )}
            
            {/* Total Row */}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
              <td className="py-3 px-4 rounded-bl-lg">Total</td>
              <td className="py-3 px-4">{totalQty}</td>
              <td className="py-3 px-4 rounded-br-lg">
                {formatCurrency(totalWithUnknown)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-3 w-full">
        {tableRows.map((row) => (
          <div
            key={row.denomination}
            className="bg-white rounded-xl shadow-md overflow-hidden w-full border border-gray-200"
          >
            <div className="bg-blue-600 text-white px-4 py-3 font-semibold text-sm">
              {row.label} Bills
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

        {/* Unknown Bills Card */}
        {unknownBills > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden w-full border-2 border-yellow-300">
            <div className="bg-yellow-500 text-white px-4 py-3 font-semibold text-sm">
              Unknown Bills
            </div>
            <div className="p-4 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Amount</span>
                <span className="font-medium text-yellow-600">
                  {formatCurrency(unknownBills)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total Summary Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden w-full border-2 border-blue-600">
          <div className="bg-blue-600 text-white px-4 py-3 font-bold text-sm">
            Total Summary
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Total Quantity</span>
              <span className="font-bold">{totalQty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Total Amount</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(totalWithUnknown)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Validator Balance</span>
              <span className="font-bold text-green-600">
                {formatCurrency(billValidatorBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillValidatorTableV2;
