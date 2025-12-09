/**
 * Collection Report Cards Component
 * Mobile-friendly card view for displaying collection reports.
 *
 * Features:
 * - Collection report data display
 * - Grid or single column layout
 * - Issue indicators for reports with problems
 * - Edit and delete actions (role-based)
 * - Navigation to report details
 * - Currency formatting
 * - Status badges
 * - Responsive design (mobile only)
 *
 * @param data - Array of collection report rows
 * @param gridLayout - Whether to use grid layout
 * @param reportIssues - Issues data for reports
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 * @param editableReportIds - Set of report IDs that can be edited
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportRow } from '@/lib/types/componentProps';
import { getGrossColorClass } from '@/lib/utils/financialColors';
import { hasAdminAccess, hasManagerAccess } from '@/lib/utils/permissions';
import { AlertTriangle, Edit3, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

// Import SVG icons for pre-rendering
import detailsIcon from '@/public/details.svg';

type ExtendedCollectionReportCardsProps = {
  data: CollectionReportRow[];
  gridLayout?: boolean; // New prop to control grid vs single column layout
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  editableReportIds?: Set<string>; // Set of locationReportIds that can be edited
};

export default function CollectionReportCards({
  data,
  gridLayout = false,
  reportIssues,
  onEdit,
  onDelete,
  editableReportIds,
}: ExtendedCollectionReportCardsProps) {
  const router = useRouter();
  const {
    formatAmount: _formatAmount,
    shouldShowCurrency: _shouldShowCurrency,
  } = useCurrencyFormat();
  const user = useUserStore(state => state.user);

  // Check if user has admin access to see issue highlights
  const isAdminUser = user?.roles ? hasAdminAccess(user.roles) : false;

  // Check if user can edit/delete reports
  // Collectors and technicians cannot edit/delete - they can only create
  const canEditDelete = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors and technicians cannot edit/delete
    if (userRoles.includes('collector') || userRoles.includes('technician')) {
      return false;
    }
    // Only manager-level access and above can edit/delete
    return hasManagerAccess(user.roles);
  }, [user]);
  return (
    <div
      className={`mt-4 flex w-full min-w-0 flex-col gap-4 px-2 md:px-4 ${
        gridLayout ? 'lg:hidden' : 'md:hidden'
      }`}
    >
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
                    {row?.gross || 0}
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
                  <span className="text-sm font-semibold">
                    {row?.collected || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Uncollected
                  </span>
                  <span className="text-sm font-semibold">
                    {row?.uncollected || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Variation
                  </span>
                  <span className="text-sm font-semibold">
                    {row?.variation || 'No Variance'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Balance
                  </span>
                  <span className="text-sm font-semibold">
                    {row?.balance || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Location Revenue
                  </span>
                  <span className="text-sm font-semibold">
                    {row?.locationRevenue !== undefined &&
                    row?.locationRevenue !== null
                      ? row.locationRevenue
                      : '-'}
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
                          row?.locationReportId || ''
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
                    editableReportIds?.has(row?.locationReportId || '') && (
                      <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                        {onEdit && (
                          <Button
                            variant="outline"
                            className="flex w-full items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white md:w-auto"
                            onClick={() => onEdit(row?.locationReportId || '')}
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
