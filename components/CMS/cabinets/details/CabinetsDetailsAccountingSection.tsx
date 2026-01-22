/**
 * Cabinets Details Accounting Section Component
 *
 * Manages the accounting and metrics tabs for a cabinet.
 *
 * Features:
 * - Tab navigation for different data views
 * - Accounting details display
 * - Live metrics monitoring
 * - Bill validator history
 * - Activity logs
 * - Collection history and settings
 * - Device configurations
 */

'use client';

import CabinetsDetailsAccountingDetails from '@/components/CMS/cabinets/details/CabinetsDetailsAccountingDetails';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

type CabinetsDetailsAccountingSectionProps = {
  cabinet: Cabinet;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
};

export default function CabinetsDetailsAccountingSection({
  cabinet,
  activeTab,
  onTabChange,
  onRefresh,
}: CabinetsDetailsAccountingSectionProps) {
  return (
    <div className="mt-8 w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Date Filters */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between min-w-0">
        <div className="min-w-0 flex-1 w-full">
          <DateFilters
            hideAllTime={false}
            onCustomRangeGo={onRefresh}
            showQuarterly={true}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] w-full max-w-full overflow-x-auto">
        <CabinetsDetailsAccountingDetails
          cabinet={cabinet}
          loading={false}
          activeMetricsTabContent={activeTab}
          setActiveMetricsTabContent={onTabChange}
        />
      </div>
    </div>
  );
}

