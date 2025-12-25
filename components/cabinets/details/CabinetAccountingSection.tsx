/**
 * CabinetAccountingSection Component
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

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import AccountingDetails from '@/components/cabinetDetails/AccountingDetails';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

type CabinetAccountingSectionProps = {
  cabinet: Cabinet;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
};

export default function CabinetAccountingSection({
  cabinet,
  activeTab,
  onTabChange,
  onRefresh,
}: CabinetAccountingSectionProps) {
  return (
    <div className="mt-8 w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Date Filters */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between min-w-0">
        <div className="min-w-0 flex-1 w-full">
          <DashboardDateFilters hideAllTime={false} onCustomRangeGo={onRefresh} />
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] w-full max-w-full overflow-x-auto">
        <AccountingDetails
          cabinet={cabinet}
          loading={false}
          activeMetricsTabContent={activeTab}
          setActiveMetricsTabContent={onTabChange}
        />
      </div>
    </div>
  );
}







































