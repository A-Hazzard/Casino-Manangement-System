
import PageLayout from '@/components/layout/PageLayout';

/**
 * Main skeleton component for collection report detail page
 */
export const CollectionReportSkeleton = () => (
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
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-hidden bg-background">
      <main className="flex-1">
        {/* Desktop Header - Back button, title, and action buttons */}
        <div className="hidden px-2 pt-6 lg:block lg:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="skeleton-bg h-10 w-10 rounded-full"></div>
              <div className="skeleton-bg h-8 w-64 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton-bg h-10 w-32 rounded"></div>
              <div className="skeleton-bg h-10 w-36 rounded"></div>
            </div>
          </div>
        </div>

        {/* Report Header Section */}
        <div className="px-2 pb-6 pt-2 lg:px-6 lg:pt-4">
          <div className="rounded-lg bg-white py-4 shadow lg:border-t-4 lg:border-lighterBlueHighlight lg:bg-container lg:py-8">
            <div className="px-4 py-2 text-center lg:py-4">
              <div className="skeleton-bg mx-auto mb-2 h-3 w-32 rounded lg:hidden"></div>
              <div className="skeleton-bg mx-auto mb-2 h-8 w-48 rounded lg:h-12 lg:w-64"></div>
              <div className="skeleton-bg mx-auto mb-4 h-4 w-40 rounded lg:h-5 lg:w-48"></div>
              <div className="skeleton-bg mx-auto mb-4 h-6 w-32 rounded"></div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden px-2 pb-6 lg:flex lg:flex-row lg:space-x-6 lg:px-6">
          <div className="mb-6 lg:mb-0 lg:w-1/4">
            <div className="space-y-2 rounded-lg bg-white p-3 shadow">
              <div className="skeleton-bg h-10 w-full rounded"></div>
              <div className="skeleton-bg h-10 w-full rounded"></div>
              <div className="skeleton-bg h-10 w-full rounded"></div>
            </div>
          </div>
          <div className="lg:w-3/4">
            <TabContentSkeleton />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="space-y-6 px-2 pb-6 lg:hidden lg:px-6">
          <MobileSectionSkeleton />
          <MobileSectionSkeleton />
          <MobileSectionSkeleton />
        </div>
      </main>
    </div>
  </PageLayout>
);

/**
 * Skeleton component for tab content loading state
 */
const TabContentSkeleton = () => (
  <div className="rounded-lg bg-white shadow-md">
    <div className="skeleton-bg mb-4 h-12 w-full rounded-t-lg"></div>
    <div className="space-y-4 p-6">
      <div className="skeleton-bg h-6 w-1/3 rounded"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-bg h-12 w-full rounded"></div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="skeleton-bg h-6 w-32 rounded"></div>
        <div className="flex space-x-2">
          <div className="skeleton-bg h-8 w-8 rounded"></div>
          <div className="skeleton-bg h-8 w-8 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for mobile section loading state
 */
const MobileSectionSkeleton = () => (
  <div className="rounded-lg bg-white shadow-md">
    <div className="skeleton-bg mb-4 h-12 w-full rounded-t-lg"></div>
    <div className="space-y-4 p-4">
      <div className="skeleton-bg h-5 w-1/2 rounded"></div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="skeleton-bg h-4 w-1/3 rounded"></div>
            <div className="skeleton-bg h-4 w-1/4 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
