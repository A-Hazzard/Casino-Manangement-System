/**
 * CollectionReportCards Component
 *
 * A mobile-optimized card-based list view for scanning and managing collection reports.
 * Used primarily on small screens to provide a high-density, touch-friendly interface.
 *
 * Features:
 * - Responsive grid-to-list card transformations
 * - Visual "Issue" indicators for reports requiring attention
 * - Interactive action menus (Edit, Delete, View Details)
 * - Detailed financial summaries (In, Out, Gross, Variance)
 * - Role-based permission gating for data modifications
 * - High-contrast status badges for report workflow states
 *
 * @param data - Collection report data records to display
 * @param gridLayout - Whether to use grid layout
 * @param loading - Loading state indicator
 * @param reportIssues - Issues data for reports
 * @param onEdit - Callback to launch edit flow for a specific report
 * @param onDelete - Callback to trigger deletion confirmation
 * @param editableReportIds - Set of report IDs that can be edited
 * @param selectedLicencee - Currently selected licencee filter
 */
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportCardsProps } from '@/lib/types/components';
import { getGrossColorClass } from '@/lib/utils/financial';
import {
  hasAdminAccess,
  hasManagerAccess,
  UserRole,
} from '@/lib/utils/permissions';
import { AlertTriangle, Edit3, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

// Import SVG icons for pre-rendering
import detailsIcon from '@/public/details.svg';

import CollectionReportCardSkeleton from '../../CollectionReportCardSkeleton';

export default function CollectionReportCards({
  data,
  gridLayout = false,
  loading,
  reportIssues,
  onEdit,
  onDelete,
  editableReportIds,
  selectedLicencee,
}: CollectionReportCardsProps) {
  const router = useRouter();
    const { formatAmount } = useCurrencyFormat();
    const user = useUserStore(state => state.user);

    // Helper to format financial values with dollar signs
    const formatVal = (v: number | string | null | undefined) => {
      if (v === 'No Variance' || v === '-' || v === undefined || v === null) return v;
      const num = typeof v === 'string' ? parseFloat(v) : v;
      return isNaN(num) ? v : formatAmount(num);
    };

    const colorClass = (v: number | string | null | undefined) => {
      if (v === 'No Variance' || v === '-' || v === undefined || v === null) return '';
      const num = typeof v === 'string' ? parseFloat(v) : v;
      return isNaN(num) ? '' : getGrossColorClass(num);
    };

  // Check if user has admin access to see issue highlights
  const isAdminUser = user?.roles
    ? hasAdminAccess(user.roles as UserRole[])
    : false;

  // Check if user can edit/delete reports
  const canEditDelete = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles as UserRole[];
    if (userRoles.includes('collector') || userRoles.includes('technician')) {
      return false;
    }
    return hasManagerAccess(userRoles);
  }, [user]);

  // Show skeleton while loading (initial load or subsequent loads)
  if (loading && (!data || data.length === 0)) {
    return <CollectionReportCardSkeleton gridLayout={gridLayout} count={4} />;
  }

  // Only show "No Data Available" when NOT loading and data is empty
  if (!loading && (!data || data.length === 0)) {
    const licenceeName =
      selectedLicencee && selectedLicencee !== 'all'
        ? selectedLicencee
        : 'the selected period';
    const emptyMessage = `No collection reports found for ${licenceeName}.`;

    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md">
        <div className="mb-2 text-lg text-gray-500">No Data Available</div>
        <div className="text-center text-sm text-gray-400">{emptyMessage}</div>
      </div>
    );
  }
  return (
    <div className={`mt-4 flex w-full min-w-0 flex-col gap-4 px-2 md:px-4`}>
      <div
        className={`${
          gridLayout ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'
        }`}
      >
        {data?.map((row, index) => {
          const hasIssues =
            isAdminUser && reportIssues?.[row.locationReportId]?.hasIssues;
          const issueCount =
            reportIssues?.[row.locationReportId]?.issueCount || 0;

          return (
            <div
              key={`${row?.collector || 'unknown'}-${
                row?.location || 'unknown'
              }-${row?.time || 'unknown'}-${index}`}
              className={`card-item mb-4 transform overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out animate-in fade-in-0 slide-in-from-bottom-2 hover:scale-[1.02] hover:shadow-md ${
                hasIssues ? 'border-l-4 border-l-yellow-500 bg-yellow-50' : ''
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both',
              }}
            >
              <div
                className={`text-md rounded-t-lg px-4 py-3 font-semibold ${
                  hasIssues ? 'bg-yellow-600' : 'bg-lighterBlueHighlight'
                } text-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Collector:</span>
                    {row.collectorUserNotFound ? (
                      <span className="border-b-2 border-dotted border-orange-300 text-orange-100">
                        {row.collectorFullName || row?.collector || '-'}
                      </span>
                    ) : row.collectorFullName ? (
                      <div className="group relative inline-block">
                        <span className="cursor-help border-b border-dotted border-white/50">
                          {row.collectorFullName}
                        </span>
                        <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-max max-w-xs rounded bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                          {row.collectorTooltipData ? (
                            <div className="space-y-1">
                              {(row.collectorTooltipData.firstName ||
                                row.collectorTooltipData.lastName) && (
                                <div className="font-semibold">
                                  {[
                                    row.collectorTooltipData.firstName,
                                    row.collectorTooltipData.lastName,
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                </div>
                              )}
                              {row.collectorTooltipData.id && (
                                <div className="text-gray-300">
                                  ID: {row.collectorTooltipData.id}
                                </div>
                              )}
                              {row.collectorTooltipData.email && (
                                <div className="text-gray-300">
                                  {row.collectorTooltipData.email}
                                </div>
                              )}
                            </div>
                          ) : row.collectorFullNameTooltip &&
                            row.collectorFullNameTooltip !==
                              row.collectorFullName ? (
                            row.collectorFullNameTooltip
                          ) : (
                            `ID: ${row.collector}`
                          )}
                        </div>
                      </div>
                    ) : (
                      <span>{row?.collector || '-'}</span>
                    )}
                  </div>
                  {hasIssues && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-xs text-yellow-800"
                    >
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {issueCount} issue{issueCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {row.collectorUserNotFound && (
                  <div className="mt-1 text-xs text-orange-200">
                    ⚠️ User no longer exists (ID: {row.collector})
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 bg-white p-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Location
                  </span>
                  <span className="text-right text-sm font-semibold">
                    {row?.location || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Gross
                  </span>
                  <span
                    className={`text-sm font-semibold ${getGrossColorClass(typeof row?.gross === 'string' ? parseFloat(row.gross) || 0 : row?.gross || 0)}`}
                  >
                    {formatVal(row?.gross)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Machines
                  </span>
                  <span className="text-sm font-semibold">
                    {row?.machines || '0/0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Collected
                  </span>
                  <span className={`text-sm font-semibold ${colorClass(row?.collected)}`}>
                    {formatVal(row?.collected)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Uncollected
                  </span>
                  <span className={`text-sm font-semibold ${colorClass(row?.uncollected)}`}>
                    {formatVal(row?.uncollected)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Variation
                  </span>
                  <span className={`text-sm font-semibold ${colorClass(row?.variation)}`}>
                    {formatVal(row?.variation)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Balance
                  </span>
                  <span className={`text-sm font-semibold ${colorClass(row?.balance)}`}>
                    {formatVal(row?.balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Location Revenue
                  </span>
                  <span className={`text-sm font-semibold ${colorClass(row?.locationRevenue)}`}>
                    {formatVal(row?.locationRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Time
                  </span>
                  <span className="text-sm font-semibold">
                    {row?.time || '-'}
                  </span>
                </div>
                <div className="mt-3 flex flex-col justify-center gap-2 md:flex-row">
                  <Button
                    variant="outline"
                    className="group flex w-full items-center justify-center gap-2 border-button text-button hover:bg-button hover:text-white md:w-auto"
                    onClick={() =>
                      router.push(
                        `/collection-report/report/${
                          row?.locationReportId || row?._id || ''
                        }`
                      )
                    }
                    aria-label="View Details"
                  >
                    <Image
                      src={detailsIcon}
                      alt="Details"
                      className="h-4 w-4 group-hover:brightness-0 group-hover:invert"
                      width={16}
                      height={16}
                    />
                  </Button>
                  {canEditDelete &&
                    (!editableReportIds ||
                      editableReportIds.has(row?.locationReportId || '')) && (
                      <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                        {onEdit && (
                          <Button
                            variant="outline"
                            className="flex w-full items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white md:w-auto"
                            onClick={() => onEdit(row?._id || '')}
                            aria-label="Edit Report"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="outline"
                            className="flex w-full items-center justify-center gap-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white md:w-auto"
                            onClick={() =>
                              onDelete(row?.locationReportId || '')
                            }
                            aria-label="Delete Report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
