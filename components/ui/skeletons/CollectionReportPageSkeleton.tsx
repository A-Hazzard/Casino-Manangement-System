import PageLayout from '@/components/layout/PageLayout';
import { CollectionReportFiltersSkeleton } from './CollectionReportFiltersSkeleton';
import { CollectionNavigationSkeleton } from './CollectionNavigationSkeleton';
import { DashboardDateFiltersSkeleton } from './DashboardDateFiltersSkeleton';
import CollectionReportTableSkeleton from '@/components/collectionReport/CollectionReportTableSkeleton';
import CollectionReportCardSkeleton from '@/components/collectionReport/CollectionReportCardSkeleton';

export const CollectionReportPageSkeleton = () => {
  return (
    <PageLayout
      headerProps={{
        containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
        disabled: true,
      }}
      pageTitle=""
      hideOptions={true}
      hideLicenceeFilter={true}
      mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
      showToaster={false}
    >
      <div className="flex min-h-screen flex-col bg-background">
        {/* Navigation Tabs */}
        <div className="px-4 py-4">
          <CollectionNavigationSkeleton />
        </div>

        {/* Date Filters */}
        <div className="px-4 pb-4">
          <DashboardDateFiltersSkeleton />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 pb-4">
          {/* Filters */}
          <div className="mb-4">
            <CollectionReportFiltersSkeleton />
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <CollectionReportTableSkeleton />
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <CollectionReportCardSkeleton count={4} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
