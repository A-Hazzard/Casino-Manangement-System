import { Skeleton } from '@/components/shared/ui/skeleton';
import PageLayout from '@/components/shared/layout/PageLayout';

/**
 * Main skeleton component for collection report detail page
 *
 * Matches exact layout of CollectionReportDetailsPageContent.
 * Shows loading state for report header, sidebar tabs, and main content.
 */
export const CollectionReportSkeleton = () => (
  <PageLayout
    headerProps={{
      containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
      disabled: true,
    }}
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
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-64 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24 rounded" />
              <Skeleton className="h-10 w-20 rounded" />
              <Skeleton className="h-10 w-24 rounded" />
              <Skeleton className="h-10 w-28 rounded" />
            </div>
          </div>
        </div>

        {/* Mobile Back Button & Actions */}
        <div className="flex items-center justify-between px-2 pt-4 lg:hidden">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-24 rounded" />
          </div>
        </div>

        {/* Report Header Section */}
        <div className="px-2 pb-6 pt-2 lg:px-6 lg:pt-4">
          <div className="rounded-lg bg-white py-4 shadow lg:border-t-4 lg:border-lighterBlueHighlight lg:bg-container lg:py-8">
            <div className="px-4 py-2 text-center lg:py-4">
              <Skeleton className="mx-auto mb-2 h-3 w-32 rounded lg:hidden" />
              <Skeleton className="mx-auto mb-2 h-8 w-48 rounded lg:h-12 lg:w-64" />
              <Skeleton className="mx-auto mb-2 h-4 w-40 rounded lg:h-5 lg:w-48" />
              <Skeleton className="mx-auto mb-4 h-5 w-56 rounded" />
              <Skeleton className="mx-auto h-5 w-64 rounded" />
            </div>
          </div>
        </div>

        {/* Desktop Layout: Sidebar (1/4) + Content (3/4) */}
        <div className="hidden px-2 pb-6 lg:flex lg:flex-row lg:space-x-6 lg:px-6">
          <div className="mb-6 lg:mb-0 lg:w-1/4">
            <div className="space-y-2 rounded-lg bg-white p-3 shadow">
              <Skeleton className="mb-4 h-6 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </div>
          </div>
          <div className="lg:w-3/4">
            <TabContentSkeleton />
          </div>
        </div>

        {/* Mobile Layout: Select dropdown + content */}
        <div className="space-y-4 px-2 pb-6 lg:hidden lg:px-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <MobileSectionSkeleton />
        </div>
      </main>
    </div>
  </PageLayout>
);

/**
 * Skeleton component for tab content loading state (desktop)
 */
const TabContentSkeleton = () => (
  <div className="rounded-lg bg-white shadow-md">
    <div className="border-b border-gray-200 p-4">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-1/3 rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded" />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
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
    <div className="space-y-4 p-4">
      <Skeleton className="h-5 w-1/2 rounded" />
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex justify-between">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-4 w-1/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const MachineReportHistorySkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
    <div className="flex max-h-[42vh] min-h-0 flex-col space-y-2 overflow-hidden lg:max-h-full">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 bg-white p-3"
        >
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="mb-1 h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <Skeleton className="mb-4 h-12 w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-24 w-full rounded-lg" />
      <Skeleton className="mt-6 ml-auto h-10 w-44 rounded" />
    </div>
  </div>
);
