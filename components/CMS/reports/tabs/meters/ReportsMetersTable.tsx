/**
 * Reports Meters Table Component
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
 *
 * @module components/reports/tabs/meters/ReportsMetersTable
 */

'use client';

import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';
import ReportsMachineCard from '@/components/CMS/reports/common/ReportsMachineCard';
import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { formatMachineIdForDisplay } from '@/lib/helpers/reports/metersTabHelpers';
import { getFinancialColorClass } from '@/lib/utils/financial';
import type { MetersReportData } from '@/shared/types/meters';
import { ExternalLink, Eye, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ReportsMetersTableProps = {
  paginatedMetersData: MetersReportData[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  hasData: boolean;
};

/**
 * Main ReportsMetersTable Component
 */
export default function ReportsMetersTable({
  paginatedMetersData,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  hasData,
}: ReportsMetersTableProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const router = useRouter();

  // ============================================================================
  // Render
  // ============================================================================

  if (!hasData) {
    return (
      <>
        {/* Search bar - Always visible, even when no data */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="Search by Serial Number, Custom Name, or Location..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10 text-gray-900 placeholder:text-gray-500"
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
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            type="text"
            placeholder="Search by Serial Number, Custom Name, or Location..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 text-gray-900 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Desktop Table View - lg and above */}
      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <div className="min-w-full">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Machine ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center">
                    Meters In
                    <CalculationHelp
                      title="Meters In"
                      formula="SAS: coinIn"
                      description="The lifetime total of all money wagered/played on the machine."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center">
                    Meters Out
                    <CalculationHelp
                      title="Meters Out"
                      formula="SAS: totalWonCredits"
                      description="The lifetime total of all credits won by players."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center">
                    Jackpot
                    <CalculationHelp
                      title="Jackpot"
                      formula="SAS: jackpot"
                      description="The lifetime total of all hand-paid jackpot events."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center">
                    Bill In
                    <CalculationHelp
                      title="Bill In"
                      formula="SAS: drop (stacker)"
                      description="The lifetime total of all physical cash inserted into the machine."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center">
                    Voucher Out
                    <CalculationHelp
                      title="Voucher Out"
                      formula="SAS: totalCancelledCredits + jackpot"
                      description="The total of all winning tickets printed plus hand-paid jackpots."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center whitespace-nowrap">
                    Hand Paid
                    <CalculationHelp
                      title="Att. Paid Credits"
                      formula="SAS: totalHandPaidCancelledCredits"
                      description="Credits that were paid out manually by an attendant."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <div className="flex items-center whitespace-nowrap">
                    Games Played
                    <CalculationHelp
                      title="Games Played"
                      formula="SAS: gamesPlayed"
                      description="The total number of games initiated on the machine."
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedMetersData.map((item, index) => {
                const formatted = formatMachineIdForDisplay(item);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      {formatted.hasLink && formatted.machineDocumentId ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              router.push(
                                `/cabinets/${formatted.machineDocumentId}`
                              );
                            }}
                            className="group flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                          >
                            <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                              {formatted.mainIdentifier} (
                              {formatted.displayParts.map((part, idx) => (
                                <span key={idx}>
                                  {part.isError ? (
                                    <span className="text-red-600">
                                      {part.text}
                                    </span>
                                  ) : (
                                    part.text
                                  )}
                                  {idx < formatted.displayParts.length - 1 &&
                                    ', '}
                                </span>
                              ))}
                              )
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                          </button>
                          <CopyMachineFieldsButtons
                            machineId={formatted.machineDocumentId}
                            gmNumber={item.customName}
                            serialNumber={item.serialNumber}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="font-mono text-sm text-gray-900">
                            {formatted.mainIdentifier} (
                            {formatted.displayParts.map((part, idx) => (
                              <span key={idx}>
                                {part.isError ? (
                                  <span className="text-red-600">
                                    {part.text}
                                  </span>
                                ) : (
                                  part.text
                                )}
                                {idx < formatted.displayParts.length - 1 &&
                                  ', '}
                              </span>
                            ))}
                            )
                          </div>
                          {formatted.machineDocumentId ? (
                            <>
                              <CopyMachineFieldsButtons
                                machineId={formatted.machineDocumentId}
                                gmNumber={item.customName}
                                serialNumber={item.serialNumber}
                              />
                            </>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {item.location}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.metersIn)}`}
                      >
                        {item.metersIn.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.metersOut)}`}
                      >
                        {item.metersOut.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.jackpot)}`}
                      >
                        {item.jackpot.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.billIn)}`}
                      >
                        {item.billIn.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.voucherOut)}`}
                      >
                        {item.voucherOut.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div
                        className={`text-sm ${getFinancialColorClass(item.attPaidCredits)}`}
                      >
                        {item.attPaidCredits.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
                      <div className="text-sm text-gray-900">
                        {item.gamesPlayed.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left">
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

      {/* Card View - mobile and tablet */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {paginatedMetersData.map((item, index) => {
          const formatted = formatMachineIdForDisplay(item);
          const machineHref = formatted.hasLink
            ? `/cabinets/${formatted.machineDocumentId}`
            : undefined;

          return (
            <ReportsMachineCard
              key={`${item.machineId}-${index}`}
              title={
                <>
                  {formatted.mainIdentifier} (
                  {formatted.displayParts.map((part, partIndex) => (
                    <span key={partIndex}>
                      {part.isError ? (
                        <span className="text-red-600">{part.text}</span>
                      ) : (
                        part.text
                      )}
                      {partIndex < formatted.displayParts.length - 1 && ', '}
                    </span>
                  ))}
                  )
                </>
              }
              machineHref={machineHref}
              copyMachineId={formatted.machineDocumentId}
              copyGmNumber={item.customName}
              copySerialNumber={item.serialNumber}
              subtitle={new Date(item.createdAt).toLocaleDateString()}
              locationName={item.location}
              locationHref={
                item.locationId ? `/locations/${item.locationId}` : undefined
              }
              metrics={[
                {
                  label: 'Meters In',
                  value: item.metersIn.toLocaleString(),
                  valueClassName: getFinancialColorClass(item.metersIn),
                },
                {
                  label: 'Meters Out',
                  value: item.metersOut.toLocaleString(),
                  valueClassName: getFinancialColorClass(item.metersOut),
                },
                {
                  label: 'Jackpot',
                  value: item.jackpot.toLocaleString(),
                  valueClassName: getFinancialColorClass(item.jackpot),
                },
                {
                  label: 'Bill In',
                  value: item.billIn.toLocaleString(),
                  valueClassName: getFinancialColorClass(item.billIn),
                },
                {
                  label: 'Voucher Out',
                  value: item.voucherOut.toLocaleString(),
                  valueClassName: getFinancialColorClass(item.voucherOut),
                },
                {
                  label: 'Hand Paid',
                  value: item.attPaidCredits.toLocaleString(),
                  valueClassName: getFinancialColorClass(item.attPaidCredits),
                },
                {
                  label: 'Games Played',
                  value: item.gamesPlayed.toLocaleString(),
                },
              ]}
              footer={
                machineHref ? (
                  <Button
                    onClick={() => router.push(machineHref)}
                    variant="outline"
                    size="sm"
                    className="flex w-full items-center justify-center gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Machine
                  </Button>
                ) : undefined
              }
            />
          );
        })}
      </div>

      {/* Pagination Controls - Mobile Responsive */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        setCurrentPage={onPageChange}
        showTotalCount
      />
    </div>
  );
}
