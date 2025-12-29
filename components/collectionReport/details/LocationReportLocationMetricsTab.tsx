/**
 * LocationReportLocationMetricsTab Component
 *
 * Displays aggregated location-level metrics for a collection report.
 *
 * Features:
 * - Summary table with total gross, drop/cancelled, SAS gross, and variation
 * - Detailed breakdown in 2x2 grid (desktop) or 4 cards (mobile)
 * - Responsive layout for mobile and desktop
 */

'use client';

import type { CollectionReportData } from '@/lib/types/api';
import { getFinancialColorClass } from '@/lib/utils/financialColors';

type LocationReportLocationMetricsTabProps = {
  reportData: CollectionReportData;
};

export default function LocationReportLocationMetricsTab({
  reportData,
}: LocationReportLocationMetricsTabProps) {
  const { locationMetrics } = reportData;

  return (
    <div>
      {/* Mobile layout */}
      <div className="space-y-4 lg:hidden">
        <h2 className="my-4 text-center text-xl font-bold">Location Metrics</h2>
        
        {/* Summary Card */}
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-button p-3 text-white">
            <h3 className="font-semibold">
              Collection Report Machine Total Gross
            </h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Total Drop / Total Cancelled
              </span>
              <span className="font-medium text-gray-800">
                {locationMetrics?.droppedCancelled || '0 / 0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Machine Gross</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.metersGross
                )}`}
              >
                {locationMetrics?.metersGross?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total SAS Gross</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.sasGross
                )}`}
              >
                {locationMetrics?.sasGross?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Variation</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.variation
                )}`}
              >
                {locationMetrics?.variation !== undefined &&
                locationMetrics?.variation !== null
                  ? locationMetrics.variation.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Detail Card 1: Variance, Variance Reason, Amount To Collect, Collected Amount */}
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-gray-50 p-3">
            <h3 className="font-semibold text-gray-800">Section 1</h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Variance</span>
              <span
                className={`font-medium ${
                  typeof locationMetrics?.variance === 'number'
                    ? getFinancialColorClass(locationMetrics.variance)
                    : 'text-gray-600'
                }`}
              >
                {locationMetrics?.variance !== undefined &&
                locationMetrics?.variance !== null
                  ? typeof locationMetrics.variance === 'number'
                    ? locationMetrics.variance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : String(locationMetrics.variance)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Variance Reason</span>
              <span className="font-medium text-gray-800">
                {locationMetrics?.varianceReason || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount To Collect</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.amountToCollect
                )}`}
              >
                {locationMetrics?.amountToCollect?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Collected Amount</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.collectedAmount
                )}`}
              >
                {locationMetrics?.collectedAmount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Detail Card 2: Location Revenue, Amount Uncollected, Machines Number, Reason For Shortage */}
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-gray-50 p-3">
            <h3 className="font-semibold text-gray-800">Section 2</h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Location Revenue</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.locationRevenue
                )}`}
              >
                {locationMetrics?.locationRevenue?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Uncollected</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.amountUncollected
                )}`}
              >
                {locationMetrics?.amountUncollected?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Machines Number</span>
              <span className="font-medium text-gray-800">
                {locationMetrics?.machinesNumber || '0 / 0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reason For Shortage</span>
              <span className="font-medium text-gray-800">
                {locationMetrics?.reasonForShortage || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Detail Card 3: Taxes, Advance, Previous Balance Owed, Current Balance Owed */}
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-gray-50 p-3">
            <h3 className="font-semibold text-gray-800">Section 3</h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Taxes</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.taxes
                )}`}
              >
                {locationMetrics?.taxes?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Advance</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.advance
                )}`}
              >
                {locationMetrics?.advance?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Previous Balance Owed</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.previousBalanceOwed
                )}`}
              >
                {locationMetrics?.previousBalanceOwed?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Balance Owed</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.currentBalanceOwed
                )}`}
              >
                {locationMetrics?.currentBalanceOwed?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Detail Card 4: Balance Correction, Correction Reason */}
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-gray-50 p-3">
            <h3 className="font-semibold text-gray-800">Section 4</h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Balance Correction</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  locationMetrics?.balanceCorrection
                )}`}
              >
                {locationMetrics?.balanceCorrection?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Correction Reason</span>
              <span className="font-medium text-gray-800">
                {locationMetrics?.correctionReason || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden rounded-lg bg-white shadow-md lg:block">
        {/* Top summary table */}
        <div className="rounded-t-lg bg-button px-4 py-2 font-semibold text-white">
          Collection Report Machine Total Gross
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-3 font-medium text-gray-700">
                Total Drop / Total Cancelled
              </td>
              <td className="p-3 text-right">
                {locationMetrics?.droppedCancelled || '0 / 0'}
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-3 font-medium text-gray-700">
                Total Machine Gross
              </td>
              <td
                className={`p-3 text-right ${getFinancialColorClass(
                  locationMetrics?.metersGross
                )}`}
              >
                {locationMetrics?.metersGross?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-3 font-medium text-gray-700">
                Total SAS Gross
              </td>
              <td
                className={`p-3 text-right ${getFinancialColorClass(
                  locationMetrics?.sasGross
                )}`}
              >
                {locationMetrics?.sasGross?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-gray-700">
                Total Variation
              </td>
              <td
                className={`p-3 text-right ${getFinancialColorClass(
                  locationMetrics?.variation
                )}`}
              >
                {locationMetrics?.variation !== undefined &&
                locationMetrics?.variation !== null
                  ? locationMetrics.variation.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Detail grids */}
        <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-4">
          {/* Section 1 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h4 className="mb-2 font-semibold text-gray-800">Section 1</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">Variance</td>
                  <td
                    className={`p-2 text-right ${
                      typeof locationMetrics?.variance === 'number'
                        ? getFinancialColorClass(locationMetrics.variance)
                        : 'text-gray-600'
                    }`}
                  >
                    {locationMetrics?.variance !== undefined &&
                    locationMetrics?.variance !== null
                      ? typeof locationMetrics.variance === 'number'
                        ? locationMetrics.variance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : String(locationMetrics.variance)
                      : '-'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Variance Reason
                  </td>
                  <td className="p-2 text-right text-gray-800">
                    {locationMetrics?.varianceReason || '-'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Amount To Collect
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.amountToCollect
                    )}`}
                  >
                    {locationMetrics?.amountToCollect?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium text-gray-700">
                    Collected Amount
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.collectedAmount
                    )}`}
                  >
                    {locationMetrics?.collectedAmount?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h4 className="mb-2 font-semibold text-gray-800">Section 2</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Location Revenue
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.locationRevenue
                    )}`}
                  >
                    {locationMetrics?.locationRevenue?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Amount Uncollected
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.amountUncollected
                    )}`}
                  >
                    {locationMetrics?.amountUncollected?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Machines Number
                  </td>
                  <td className="p-2 text-right text-gray-800">
                    {locationMetrics?.machinesNumber || '0 / 0'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium text-gray-700">
                    Reason For Shortage
                  </td>
                  <td className="p-2 text-right text-gray-800">
                    {locationMetrics?.reasonForShortage || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h4 className="mb-2 font-semibold text-gray-800">Section 3</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">Taxes</td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.taxes
                    )}`}
                  >
                    {locationMetrics?.taxes?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">Advance</td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.advance
                    )}`}
                  >
                    {locationMetrics?.advance?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Previous Balance Owed
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.previousBalanceOwed
                    )}`}
                  >
                    {locationMetrics?.previousBalanceOwed?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium text-gray-700">
                    Current Balance Owed
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.currentBalanceOwed
                    )}`}
                  >
                    {locationMetrics?.currentBalanceOwed?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h4 className="mb-2 font-semibold text-gray-800">Section 4</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-medium text-gray-700">
                    Balance Correction
                  </td>
                  <td
                    className={`p-2 text-right ${getFinancialColorClass(
                      locationMetrics?.balanceCorrection
                    )}`}
                  >
                    {locationMetrics?.balanceCorrection?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium text-gray-700">
                    Correction Reason
                  </td>
                  <td className="p-2 text-right text-gray-800">
                    {locationMetrics?.correctionReason || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
