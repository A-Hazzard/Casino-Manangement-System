/**
 * Meters Table Component
 *
 * Displays meters data in both desktop table and mobile card views
 *
 * Features:
 * - Search functionality
 * - Desktop table view (lg and above)
 * - Mobile card view (md and below)
 * - Pagination controls
 * - Machine ID formatting with links
 * - Financial color coding
 */

'use client';

import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';
import { formatMachineIdForDisplay } from '@/lib/helpers/reports/metersTabHelpers';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import type { MetersReportData } from '@/shared/types/meters';
import { ExternalLink, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

type MetersTableProps = {
  paginatedMetersData: MetersReportData[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  hasData: boolean;
};


export default function MetersTable({
  paginatedMetersData,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
  loading,
  hasData,
}: MetersTableProps) {
  const router = useRouter();

  if (!hasData) {
    return (
      <>
        {/* Search bar - Always visible, even when no data */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="Search by Serial Number, Custom Name, or Location..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-600">
            {searchTerm
              ? 'No meters data found matching your search criteria.'
              : 'No meters data found.'}
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Search bar - Right above the table */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            type="text"
            placeholder="Search by Serial Number, Custom Name, or Location..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desktop Table View - lg and above */}
      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <div className="min-w-full">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Machine ID
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Meters In
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Money Won
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Jackpot
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Bill In
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Voucher Out
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Hand Paid Cancelled Credits
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Games Played
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedMetersData.map((item, index) => {
                const formatted = formatMachineIdForDisplay(item);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {formatted.hasLink && formatted.machineDocumentId ? (
                        <button
                          onClick={() => {
                            router.push(
                              `/cabinets/${formatted.machineDocumentId}`
                            );
                          }}
                          className="group mx-auto flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                        >
                          <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                            {formatted.mainIdentifier} (
                            {formatted.displayParts.map((part, idx) => (
                              <span key={idx}>
                                {part.isError ? (
                                  <span className="text-red-600">{part.text}</span>
                                ) : (
                                  part.text
                                )}
                                {idx < formatted.displayParts.length - 1 && ', '}
                              </span>
                            ))}
                            )
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                        </button>
                      ) : (
                        <div className="font-mono text-sm text-gray-900">
                          {formatted.mainIdentifier} (
                          {formatted.displayParts.map((part, idx) => (
                            <span key={idx}>
                              {part.isError ? (
                                <span className="text-red-600">{part.text}</span>
                              ) : (
                                part.text
                              )}
                              {idx < formatted.displayParts.length - 1 && ', '}
                            </span>
                          ))}
                          )
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {item.location}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.metersIn)}`}
                      >
                        {item.metersIn.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.metersOut)}`}
                      >
                        {item.metersOut.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.jackpot)}`}
                      >
                        {item.jackpot.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.billIn)}`}
                      >
                        {item.billIn.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.voucherOut)}`}
                      >
                        {item.voucherOut.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.attPaidCredits)}`}
                      >
                        {item.attPaidCredits.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="text-sm text-gray-900">
                        {item.gamesPlayed.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="text-sm text-gray-900">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View - md and below (2x2 grid on md, single column on mobile) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        {paginatedMetersData.map((item, index) => {
          const formatted = formatMachineIdForDisplay(item);
          return (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-4 flex flex-col border-b border-gray-100 pb-3">
                <div className="mb-2 w-fit flex-shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-mono text-base font-semibold text-gray-900">
                      {formatted.mainIdentifier} (
                      {formatted.displayParts.map((part, idx) => (
                        <span key={idx}>
                          {part.isError ? (
                            <span className="text-red-600">{part.text}</span>
                          ) : (
                            part.text
                          )}
                          {idx < formatted.displayParts.length - 1 && ', '}
                        </span>
                      ))}
                      )
                    </h3>
                    <p className="mt-1 truncate text-sm text-gray-600">
                      {item.location}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Meters In
                  </p>
                  <p
                    className={`text-base font-bold ${getFinancialColorClass(item.metersIn)}`}
                  >
                    {item.metersIn.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Money Won
                  </p>
                  <p
                    className={`text-base font-bold ${getFinancialColorClass(item.metersOut)}`}
                  >
                    {item.metersOut.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Jackpot
                  </p>
                  <p
                    className={`text-base font-bold ${getFinancialColorClass(item.jackpot)}`}
                  >
                    {item.jackpot.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Bill In
                  </p>
                  <p
                    className={`text-base font-bold ${getFinancialColorClass(item.billIn)}`}
                  >
                    {item.billIn.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Voucher Out
                  </p>
                  <p
                    className={`text-base font-bold ${getFinancialColorClass(item.voucherOut)}`}
                  >
                    {item.voucherOut.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Hand Paid
                  </p>
                  <p
                    className={`text-base font-bold ${getFinancialColorClass(item.attPaidCredits)}`}
                  >
                    {item.attPaidCredits.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                    Games Played
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {item.gamesPlayed.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* View Machine Button */}
              {formatted.hasLink && formatted.machineDocumentId && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => {
                      router.push(`/cabinets/${formatted.machineDocumentId}`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Machine
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls - Mobile Responsive */}
      {!loading && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={onPageChange}
        />
      )}
    </div>
  );
}

