/**
 * Machine Evaluation Summary Component
 * Card component displaying machine evaluation summary statistics.
 *
 * Features:
 * - Pareto principle statements for key metrics (ME1-3.0 to ME1-3.3)
 * - Shows what percentage of machines contribute to what percentage of total metrics
 * - Summary text formatting matching reference design
 * - Expandable verification details for manual verification
 * - Card layout
 *
 * @param handleStatement - Pareto statement for handle (e.g., "25% of the machines contribute to 75% of the Total Handle")
 * @param winStatement - Pareto statement for win (e.g., "25% of the machines contribute to 75% of the Total Win")
 * @param gamesPlayedStatement - Pareto statement for games played (e.g., "25% of the machines contribute to 75% of the Total Games Played")
 * @param handleDetails - Verification details for handle calculation
 * @param winDetails - Verification details for win calculation
 * @param gamesPlayedDetails - Verification details for games played calculation
 */
'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { formatAmount } from '@/lib/helpers/rates';
import { useRouter } from 'next/navigation';

type VerificationDetails = {
  metricName: string;
  totalMachines: number;
  machinesWithData: number;
  topMachines: Array<{
    machineId: string;
    machineName: string;
    value: number;
    cumulative: number;
    percentageOfTotal: number;
  }>;
  allMachinesWithData: Array<{
    machineId: string;
    machineName: string;
    locationName: string;
    locationId: string;
    manufacturer: string;
    gameTitle: string;
    value: number;
    percentageOfTotal: number;
    // Include all relevant metrics for context
    coinIn?: number;
    netWin?: number;
    gamesPlayed?: number;
    drop?: number;
    gross?: number;
  }>;
  totalValue: number;
  cumulativeValue: number;
  machinePercentage: number;
  metricPercentage: number;
};

type ReportsMachinesEvaluationSummaryProps = {
  handleStatement: string;
  winStatement: string;
  gamesPlayedStatement: string;
  handleDetails?: VerificationDetails;
  winDetails?: VerificationDetails;
  gamesPlayedDetails?: VerificationDetails;
};

function MachinesWithDataModal({
  isOpen,
  onClose,
  details,
  formatValue,
}: {
  isOpen: boolean;
  onClose: () => void;
  details: VerificationDetails;
  formatValue: (value: number) => string;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Sort machines by value descending
  const sortedMachines = [...details.allMachinesWithData].sort(
    (a, b) => b.value - a.value
  );

  // Calculate pagination
  const totalPages = Math.ceil(sortedMachines.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMachines = sortedMachines.slice(startIndex, endIndex);

  // Reset to first page when modal opens or machines change
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen, sortedMachines.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            Machines with {details.metricName} Activity
          </DialogTitle>
          <DialogDescription>
            This list shows all {details.machinesWithData} machines that have
            recorded {details.metricName.toLowerCase()} activity during the
            selected time period and location filter.
          </DialogDescription>
          <p className="mt-2 text-xs text-gray-600">
            The remaining {details.totalMachines - details.machinesWithData}{' '}
            machines have no {details.metricName.toLowerCase()} activity for
            this period and are excluded from the calculation.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-orangeHighlight/30 bg-orangeHighlight/15 p-3 text-sm">
            <p className="font-semibold text-orangeHighlight">Calculation Summary:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray-800">
              <li>
                Total machines in view: {details.totalMachines}
              </li>
              <li>
                Machines with {details.metricName.toLowerCase()} activity:{' '}
                {details.machinesWithData} (excluded:{' '}
                {details.totalMachines - details.machinesWithData} machines with
                no activity)
              </li>
              <li>
                Total {details.metricName}: {formatValue(details.totalValue)}
              </li>
              <li>
                Top {details.topMachines.length} machines contribute{' '}
                {formatValue(details.cumulativeValue)} ({details.metricPercentage}% of total{' '}
                {details.metricName.toLowerCase()})
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">
              All Machines with {details.metricName} Activity (sorted by{' '}
              {details.metricName.toLowerCase()} value, highest to lowest):
            </p>
            
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    <th className="p-3 text-left font-medium text-gray-700">
                      Machine
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Location
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Manufacturer
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Game
                    </th>
                    <th className="p-3 text-right font-medium text-gray-700">
                      {details.metricName} Value
                    </th>
                    <th className="p-3 text-right font-medium text-gray-700">
                      % of Total {details.metricName}
                    </th>
                    {details.metricName === 'Handle' && (
                      <>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Net Win
                        </th>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Games Played
                        </th>
                      </>
                    )}
                    {details.metricName === 'Win' && (
                      <>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Handle
                        </th>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Games Played
                        </th>
                      </>
                    )}
                    {details.metricName === 'Games Played' && (
                      <>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Handle
                        </th>
                        <th className="p-3 text-right font-medium text-gray-700">
                          Net Win
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedMachines.map(machine => {
                    const isInTopMachines = details.topMachines.some(
                      tm => tm.machineId === machine.machineId
                    );
                    return (
                      <tr
                        key={machine.machineId}
                        className={`border-b ${
                          isInTopMachines
                            ? 'border-orangeHighlight/40 bg-orangeHighlight/20'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => {
                              router.push(`/cabinets/${machine.machineId}`);
                            }}
                            className="group flex items-center gap-1.5 text-left font-medium text-gray-900 transition-opacity hover:opacity-80"
                          >
                            <span className="underline decoration-blueHighlight decoration-dotted decoration-2 underline-offset-2">
                              {machine.machineName}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blueHighlight group-hover:text-blueHighlight/80" />
                          </button>
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {machine.locationName ? (
                            <button
                              onClick={() => {
                                router.push(`/locations/${machine.locationId}`);
                              }}
                              className="group flex items-center gap-1.5 text-left transition-opacity hover:opacity-80"
                            >
                              <span className="underline decoration-blueHighlight decoration-dotted decoration-2 underline-offset-2">
                                {machine.locationName}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blueHighlight group-hover:text-blueHighlight/80" />
                            </button>
                          ) : (
                            <span className="text-gray-500">Unknown</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {machine.manufacturer || (
                            <span className="text-gray-500">Unknown</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {machine.gameTitle || (
                            <span className="text-gray-500">Unknown</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-sm font-medium text-gray-900">
                          {formatValue(machine.value)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-700">
                          {machine.percentageOfTotal.toFixed(2)}%
                        </td>
                        {details.metricName === 'Handle' && (
                          <>
                            <td className="p-3 text-right text-sm text-gray-700">
                              {machine.netWin !== undefined
                                ? formatValue(machine.netWin)
                                : '-'}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700">
                              {machine.gamesPlayed !== undefined
                                ? machine.gamesPlayed.toLocaleString()
                                : '-'}
                            </td>
                          </>
                        )}
                        {details.metricName === 'Win' && (
                          <>
                            <td className="p-3 text-right text-sm text-gray-700">
                              {machine.coinIn !== undefined
                                ? formatValue(machine.coinIn)
                                : '-'}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700">
                              {machine.gamesPlayed !== undefined
                                ? machine.gamesPlayed.toLocaleString()
                                : '-'}
                            </td>
                          </>
                        )}
                        {details.metricName === 'Games Played' && (
                          <>
                            <td className="p-3 text-right text-sm text-gray-700">
                              {machine.coinIn !== undefined
                                ? formatValue(machine.coinIn)
                                : '-'}
                            </td>
                            <td className="p-3 text-right text-sm text-gray-700">
                              {machine.netWin !== undefined
                                ? formatValue(machine.netWin)
                                : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400 bg-gray-50 font-semibold">
                    <td colSpan={4} className="p-3 text-right text-gray-900">
                      Total:
                    </td>
                    <td className="p-3 text-right text-gray-900">
                      {formatValue(details.totalValue)}
                    </td>
                    <td className="p-3 text-right text-gray-900">100.00%</td>
                    {details.metricName === 'Handle' && (
                      <>
                        <td className="p-3 text-right text-gray-900">
                          {formatValue(
                            sortedMachines.reduce(
                              (sum, m) => sum + (m.netWin || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="p-3 text-right text-gray-900">
                          {sortedMachines
                            .reduce((sum, m) => sum + (m.gamesPlayed || 0), 0)
                            .toLocaleString()}
                        </td>
                      </>
                    )}
                    {details.metricName === 'Win' && (
                      <>
                        <td className="p-3 text-right text-gray-900">
                          {formatValue(
                            sortedMachines.reduce(
                              (sum, m) => sum + (m.coinIn || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="p-3 text-right text-gray-900">
                          {sortedMachines
                            .reduce((sum, m) => sum + (m.gamesPlayed || 0), 0)
                            .toLocaleString()}
                        </td>
                      </>
                    )}
                    {details.metricName === 'Games Played' && (
                      <>
                        <td className="p-3 text-right text-gray-900">
                          {formatValue(
                            sortedMachines.reduce(
                              (sum, m) => sum + (m.coinIn || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="p-3 text-right text-gray-900">
                          {formatValue(
                            sortedMachines.reduce(
                              (sum, m) => sum + (m.netWin || 0),
                              0
                            )
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {paginatedMachines.map(machine => {
                const isInTopMachines = details.topMachines.some(
                  tm => tm.machineId === machine.machineId
                );
                return (
                  <div
                    key={machine.machineId}
                    className={`rounded-lg border p-4 ${
                      isInTopMachines
                        ? 'border-orangeHighlight/50 bg-orangeHighlight/20 shadow-sm'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="mb-3 space-y-2">
                      <div>
                        <button
                          onClick={() => {
                            router.push(`/cabinets/${machine.machineId}`);
                          }}
                          className="group flex items-center gap-1.5 text-left"
                        >
                          <span className="text-sm font-semibold text-gray-900 underline decoration-blueHighlight decoration-dotted decoration-2 underline-offset-2">
                            {machine.machineName}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blueHighlight group-hover:text-blueHighlight/80" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        {machine.locationName ? (
                          <button
                            onClick={() => {
                              router.push(`/locations/${machine.locationId}`);
                            }}
                            className="group flex items-center gap-1 transition-opacity hover:opacity-80"
                          >
                            <span className="underline decoration-blueHighlight decoration-dotted decoration-2 underline-offset-2">
                              {machine.locationName}
                            </span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 text-blueHighlight" />
                          </button>
                        ) : (
                          <span className="text-gray-500">Unknown Location</span>
                        )}
                        {machine.manufacturer && (
                          <>
                            <span>•</span>
                            <span>{machine.manufacturer}</span>
                          </>
                        )}
                        {machine.gameTitle && (
                          <>
                            <span>•</span>
                            <span>{machine.gameTitle}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-200 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {details.metricName} Value:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatValue(machine.value)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">% of Total:</span>
                        <span className="text-gray-700">
                          {machine.percentageOfTotal.toFixed(2)}%
                        </span>
                      </div>
                      {details.metricName === 'Handle' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Net Win:</span>
                            <span className="text-gray-700">
                              {machine.netWin !== undefined
                                ? formatValue(machine.netWin)
                                : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Games Played:</span>
                            <span className="text-gray-700">
                              {machine.gamesPlayed !== undefined
                                ? machine.gamesPlayed.toLocaleString()
                                : '-'}
                            </span>
                          </div>
                        </>
                      )}
                      {details.metricName === 'Win' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Handle:</span>
                            <span className="text-gray-700">
                              {machine.coinIn !== undefined
                                ? formatValue(machine.coinIn)
                                : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Games Played:</span>
                            <span className="text-gray-700">
                              {machine.gamesPlayed !== undefined
                                ? machine.gamesPlayed.toLocaleString()
                                : '-'}
                            </span>
                          </div>
                        </>
                      )}
                      {details.metricName === 'Games Played' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Handle:</span>
                            <span className="text-gray-700">
                              {machine.coinIn !== undefined
                                ? formatValue(machine.coinIn)
                                : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Net Win:</span>
                            <span className="text-gray-700">
                              {machine.netWin !== undefined
                                ? formatValue(machine.netWin)
                                : '-'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedMachines.length)} of{' '}
                  {sortedMachines.length} machines
                </p>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-900">Notes:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>
                Machines highlighted in <span className="border border-orangeHighlight/40 bg-orangeHighlight/20 px-1.5 py-0.5 text-orangeHighlight font-medium rounded">orange</span> are
                part of the top {details.topMachines.length} machines that
                contribute {details.metricPercentage}% of the total{' '}
                {details.metricName.toLowerCase()}.
              </li>
              <li>
                Click on machine names or locations to navigate to their detail
                pages.
              </li>
              <li>
                All values shown are for the selected time period and location
                filter.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VerificationDetailsSection({
  details,
  statement,
  formatValue,
}: {
  details: VerificationDetails;
  statement: string;
  formatValue: (value: number) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="border-t border-gray-200 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-2 text-left transition-colors hover:text-gray-900"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Hide' : 'Show'} verification details for ${details.metricName}`}
      >
        <span className="text-xs font-medium text-gray-600">
          {isExpanded ? 'Hide' : 'Show'} Verification Details
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-gray-900">Statement:</p>
            <p className="text-gray-700">{statement}</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-gray-900">Summary:</p>
            <ul className="list-inside list-disc space-y-0.5 text-gray-700">
              <li>
                Total machines: {details.totalMachines} (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group inline-flex items-center gap-1 text-blueHighlight underline decoration-dotted decoration-2 underline-offset-2 transition-opacity hover:opacity-80"
                  title={`View all ${details.machinesWithData} machines with ${details.metricName.toLowerCase()} activity`}
                >
                  <span>
                    machines with {details.metricName.toLowerCase()} activity:{' '}
                    {details.machinesWithData}
                  </span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </button>
                )
              </li>
              <li>
                Top {details.topMachines.length} machines contribute{' '}
                {formatValue(details.cumulativeValue)} of{' '}
                {formatValue(details.totalValue)} total
              </li>
              <li>
                Calculation: ({details.topMachines.length} /{' '}
                {details.machinesWithData}) × 100 = {details.machinePercentage}%
                of machines
              </li>
              <li>
                Contribution: ({formatValue(details.cumulativeValue)} /{' '}
                {formatValue(details.totalValue)}) × 100 ={' '}
                {details.metricPercentage}% of total
              </li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-gray-900">
              Top Contributing Machines (sorted by {details.metricName}):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    <th className="p-2 text-left font-medium text-gray-700">
                      Machine
                    </th>
                    <th className="p-2 text-right font-medium text-gray-700">
                      Value
                    </th>
                    <th className="p-2 text-right font-medium text-gray-700">
                      Cumulative
                    </th>
                    <th className="p-2 text-right font-medium text-gray-700">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.topMachines.map(machine => {
                    const isThresholdReached =
                      machine.percentageOfTotal >= 75;
                    return (
                      <tr
                        key={machine.machineId}
                        className={`border-b ${
                          isThresholdReached
                            ? 'border-orangeHighlight/40 bg-orangeHighlight/20 font-medium'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <td className="p-2 text-gray-900">
                          {machine.machineName}
                          {isThresholdReached && (
                            <span className="ml-1 text-greenHighlight">✓</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-gray-700">
                          {formatValue(machine.value)}
                        </td>
                        <td className="p-2 text-right text-gray-700">
                          {formatValue(machine.cumulative)}
                        </td>
                        <td className="p-2 text-right text-gray-700">
                          {machine.percentageOfTotal.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <MachinesWithDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        details={details}
        formatValue={formatValue}
      />
    </div>
  );
}

export default function ReportsMachinesEvaluationSummary({
  handleStatement,
  winStatement,
  gamesPlayedStatement,
  handleDetails,
  winDetails,
  gamesPlayedDetails,
}: ReportsMachinesEvaluationSummaryProps) {
  const formatCurrency = (value: number) => formatAmount(value);
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {handleStatement && (
            <div>
              <p className="text-sm text-gray-700">{handleStatement}</p>
              {handleDetails && (
                <VerificationDetailsSection
                  details={handleDetails}
                  statement={handleStatement}
                  formatValue={formatCurrency}
                />
              )}
            </div>
          )}
          {winStatement && (
            <div>
              <p className="text-sm text-gray-700">{winStatement}</p>
              {winDetails && (
                <VerificationDetailsSection
                  details={winDetails}
                  statement={winStatement}
                  formatValue={formatCurrency}
                />
              )}
            </div>
          )}
          {gamesPlayedStatement && (
            <div>
              <p className="text-sm text-gray-700">{gamesPlayedStatement}</p>
              {gamesPlayedDetails && (
                <VerificationDetailsSection
                  details={gamesPlayedDetails}
                  statement={gamesPlayedStatement}
                  formatValue={formatNumber}
                />
              )}
            </div>
          )}
          {!handleStatement && !winStatement && !gamesPlayedStatement && (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

