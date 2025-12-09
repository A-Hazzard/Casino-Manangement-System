/**
 * Collection Report Table Component
 * Desktop table view for displaying collection reports with sorting and actions.
 *
 * Features:
 * - Collection report data display
 * - Sortable columns
 * - Issue indicators for reports with problems
 * - Edit and delete actions (role-based)
 * - Navigation to report details
 * - Currency formatting
 * - Status badges
 * - Responsive design (desktop only)
 *
 * @param data - Array of collection report rows
 * @param reportIssues - Issues data for reports
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 * @param sortField - Current sort field
 * @param sortDirection - Current sort direction
 * @param onSort - Callback to request column sort
 * @param editableReportIds - Set of report IDs that can be edited
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import { useMemo } from 'react';

// Import SVG icons for pre-rendering
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportRow } from '@/lib/types/componentProps';
import { getGrossColorClass } from '@/lib/utils/financialColors';
import { hasAdminAccess, hasManagerAccess } from '@/lib/utils/permissions';
import detailsIcon from '@/public/details.svg';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type ExtendedCollectionReportTableProps = {
  data: CollectionReportRow[];
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
  sortField?: keyof CollectionReportRow;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof CollectionReportRow) => void;
  editableReportIds?: Set<string>; // Set of locationReportIds that can be edited
};

export default function CollectionReportTable({
  data,
  reportIssues,
  onEdit,
  onDelete,
  sortField = 'time',
  sortDirection = 'desc',
  onSort,
  editableReportIds,
}: ExtendedCollectionReportTableProps) {
  const {
    formatAmount: _formatAmount,
    shouldShowCurrency: _shouldShowCurrency,
  } = useCurrencyFormat();
  const router = useRouter();
  const user = useUserStore(state => state.user);

  // Check if user has admin access to see issue highlights
  const isAdminUser = user?.roles ? hasAdminAccess(user.roles) : false;

  // Check if user can edit/delete reports (admin, evo admin, or manager)
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
    <div className="hidden w-full min-w-0 overflow-x-auto bg-white shadow lg:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead
              className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
              centered={false}
              isFirstColumn={true}
            >
              <div
                className="flex items-center gap-1"
                onClick={() => onSort?.('collector')}
              >
                COLLECTOR
                {sortField === 'collector' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
              centered={false}
            >
              <div
                className="flex items-center gap-1"
                onClick={() => onSort?.('location')}
              >
                LOCATION
                {sortField === 'location' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.('gross')}
              >
                GROSS
                {sortField === 'gross' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.('machines')}
              >
                MACHINES
                {sortField === 'machines' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.('collected')}
              >
                COLLECTED
                {sortField === 'collected' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead className="font-semibold text-white" centered={true}>
              UNCOLLECTED
            </TableHead>
            <TableHead className="font-semibold text-white" centered={true}>
              VARIATION
            </TableHead>
            <TableHead className="font-semibold text-white" centered={true}>
              BALANCE
            </TableHead>
            <TableHead className="font-semibold text-white" centered={true}>
              LOCATION REVENUE
            </TableHead>
            <TableHead
              className="cursor-pointer select-none font-semibold text-white hover:bg-button/80"
              centered={true}
            >
              <div
                className="flex items-center justify-center gap-1"
                onClick={() => onSort?.('time')}
              >
                TIME
                {sortField === 'time' &&
                  (sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </div>
            </TableHead>
            <TableHead className="font-semibold text-white" centered={true}>
              DETAILS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row, index) => {
            const hasIssues =
              isAdminUser && reportIssues?.[row.locationReportId]?.hasIssues;
            const issueCount =
              reportIssues?.[row.locationReportId]?.issueCount || 0;

            return (
              <TableRow
                key={`${row?.collector || 'unknown'}-${
                  row?.location || 'unknown'
                }-${row?.time || 'unknown'}-${index}`}
                className={`hover:bg-lighterGreenHighlight ${
                  hasIssues ? 'border-l-4 border-l-yellow-500 bg-yellow-50' : ''
                }`}
              >
                <TableCell
                  className="font-medium"
                  centered={false}
                  isFirstColumn={true}
                >
                  <div className="flex items-center gap-2">
                    {hasIssues && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {row.collectorUserNotFound ? (
                      <div className="group relative">
                        <span className="cursor-help border-b-2 border-dotted border-orange-500 text-orange-600">
                          {row.collectorFullName || row.collector || '-'}
                        </span>
                        <div className="absolute left-0 top-full z-50 mt-1 hidden w-max rounded bg-orange-600 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                          ⚠️ User no longer exists (ID: {row.collector})
                        </div>
                      </div>
                    ) : row.collectorFullName ? (
                      <div className="group relative">
                        <span className="cursor-help border-b border-dotted border-gray-400">
                          {row.collectorFullName}
                        </span>
                        <div className="absolute left-0 top-full z-50 mt-1 hidden w-max max-w-xs rounded bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
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
                      <span>{row.collector || '-'}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell centered={false}>{row?.location || '-'}</TableCell>
                <TableCell centered={true}>
                  <span
                    className={getGrossColorClass(
                      typeof row?.gross === 'string'
                        ? parseFloat(row.gross) || 0
                        : row?.gross || 0
                    )}
                  >
                    {row?.gross || 0}
                  </span>
                </TableCell>
                <TableCell centered={true}>{row?.machines || '0/0'}</TableCell>
                <TableCell centered={true}>{row?.collected || 0}</TableCell>
                <TableCell centered={true}>{row?.uncollected || '-'}</TableCell>
                <TableCell centered={true}>
                  {row?.variation || 'No Variance'}
                </TableCell>
                <TableCell centered={true}>{row?.balance || 0}</TableCell>
                <TableCell centered={true}>
                  {row?.locationRevenue || 0}
                </TableCell>
                <TableCell centered={true}>{row?.time || '-'}</TableCell>
                <TableCell centered={true}>
                  <div className="flex items-center gap-2">
                    {hasIssues && (
                      <Badge variant="destructive" className="text-xs">
                        {issueCount} issue{issueCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group h-8 w-8 p-0 text-buttonActive hover:bg-buttonActive/10 hover:text-white"
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
                        <div className="flex gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                              onClick={() =>
                                onEdit(row?.locationReportId || '')
                              }
                              aria-label="Edit Report"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
