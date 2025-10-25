import React from 'react';
import Image from 'next/image';
import type { CollectionReportRow } from '@/lib/types/componentProps';
import { useRouter } from 'next/navigation';
import { Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { hasAdminAccess, hasManagerAccess } from '@/lib/utils/permissions';

// Import SVG icons for pre-rendering
import detailsIcon from '@/public/details.svg';

type ExtendedCollectionReportCardsProps = {
  data: CollectionReportRow[];
  gridLayout?: boolean; // New prop to control grid vs single column layout
  reportIssues?: Record<string, { issueCount: number; hasIssues: boolean }>;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
};

export default function CollectionReportCards({
  data,
  gridLayout = false,
  reportIssues,
  onEdit,
  onDelete,
}: ExtendedCollectionReportCardsProps) {
  const router = useRouter();
  const {
    formatAmount: _formatAmount,
    shouldShowCurrency: _shouldShowCurrency,
  } = useCurrencyFormat();
  const user = useUserStore(state => state.user);

  // Check if user has admin access to see issue highlights
  const isAdminUser = user?.roles ? hasAdminAccess(user.roles) : false;

  // Check if user can edit/delete reports (admin, evo admin, or manager)
  const canEditDelete = user?.roles ? hasManagerAccess(user.roles) : false;
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
                  <span>Collector: {row?.collector || '-'}</span>
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
                  <span className="text-sm font-semibold">
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
                    <span className="hidden md:inline">VIEW DETAILS</span>
                  </Button>
                  {canEditDelete && (
                    <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                      {onEdit && (
                        <Button
                          variant="outline"
                          className="flex w-full items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white md:w-auto"
                          onClick={() => onEdit(row?.locationReportId || '')}
                          aria-label="Edit Report"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="hidden md:inline">EDIT</span>
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="outline"
                          className="flex w-full items-center justify-center gap-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white md:w-auto"
                          onClick={() => onDelete(row?.locationReportId || '')}
                          aria-label="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden md:inline">DELETE</span>
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
