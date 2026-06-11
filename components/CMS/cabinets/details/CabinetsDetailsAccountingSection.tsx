/**
 * Cabinets Details Accounting Section Component
 *
 * Manages the accounting and metrics tabs for a cabinet.
 *
 * Features:
 * - Tab navigation for different data views
 * - Accounting details display
 * - Live meters monitoring
 * - Bill validator history
 * - Activity logs
 * - Collection history and settings
 * - Device configurations
 */

'use client';

import CabinetsDetailsAccountingDetails from '@/components/CMS/cabinets/details/CabinetsDetailsAccountingDetails';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import { useUserStore } from '@/lib/store/userStore';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

type CabinetsDetailsAccountingSectionProps = {
  cabinet: Cabinet;
  activeTab: string;
  loading?: boolean;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
};

export default function CabinetsDetailsAccountingSection({
  cabinet,
  activeTab,
  loading = false,
  onTabChange,
  onRefresh,
}: CabinetsDetailsAccountingSectionProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { user } = useUserStore();

  // ============================================================================
  // Computed
  // ============================================================================
  const isTechnicianOnly = user?.roles?.[0] == 'technician';
  const isDeveloper = user?.roles?.includes('developer') ?? false;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-8 w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Date Filters */}
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full min-w-0 flex-1">
          {isTechnicianOnly ? (
            <div className="flex h-10 items-center rounded-lg bg-blue-50 px-4 text-sm font-medium text-blue-700">
              <span className="mr-2 italic">
                Showing data within the last hour
              </span>
            </div>
          ) : (
            <DateFilters
              hideAllTime={false}
              showQuarterly={true}
              onCustomRangeGo={onRefresh}
              enableTimeInputs={true}
            />
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] w-full max-w-full overflow-x-auto">
        <CabinetsDetailsAccountingDetails
          cabinet={cabinet}
          loading={loading}
          activeMetricsTabContent={activeTab}
          setActiveMetricsTabContent={onTabChange}
          isDeveloper={isDeveloper}
        />
      </div>
    </div>
  );
}
