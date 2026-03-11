import CollectionReportCardSkeleton from '@/components/CMS/collectionReport/CollectionReportCardSkeleton';
import CollectionReportTableSkeleton from '@/components/CMS/collectionReport/CollectionReportTableSkeleton';
import PageLayout from '@/components/shared/layout/PageLayout';
import { CollectionNavigationSkeleton } from '@/components/shared/ui/skeletons/CollectionNavigationSkeleton';
import { CollectionReportFiltersSkeleton } from '@/components/shared/ui/skeletons/CollectionReportFiltersSkeleton';
import { DateFiltersSkeleton } from '@/components/shared/ui/skeletons/DateFiltersSkeleton';

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
          <DateFiltersSkeleton />
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
