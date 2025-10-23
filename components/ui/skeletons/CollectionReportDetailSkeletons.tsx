import React from "react";

import PageLayout from "@/components/layout/PageLayout";

/**
 * Main skeleton component for collection report detail page
 */
export const CollectionReportSkeleton = () => (
  <PageLayout
    headerProps={{
      containerPaddingMobile: "px-4 py-8 lg:px-0 lg:py-0",
      disabled: true,
    }}
    pageTitle=""
    hideOptions={true}
    hideLicenceeFilter={true}
    mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
    showToaster={false}
  >
    <div className="w-full max-w-full min-h-screen bg-background flex flex-col overflow-hidden">
      <main className="flex-1">
        {/* Desktop Header - Back button, title, and action buttons */}
        <div className="px-2 lg:px-6 pt-6 hidden lg:block">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 skeleton-bg rounded-full"></div>
              <div className="h-8 w-64 skeleton-bg rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-32 skeleton-bg rounded"></div>
              <div className="h-10 w-36 skeleton-bg rounded"></div>
            </div>
          </div>
        </div>

        {/* Report Header Section */}
        <div className="px-2 lg:px-6 pt-2 lg:pt-4 pb-6">
          <div className="bg-white lg:bg-container rounded-lg shadow lg:border-t-4 lg:border-lighterBlueHighlight py-4 lg:py-8">
            <div className="text-center py-2 lg:py-4 px-4">
              <div className="h-3 w-32 skeleton-bg rounded mx-auto mb-2 lg:hidden"></div>
              <div className="h-8 lg:h-12 w-48 lg:w-64 skeleton-bg rounded mx-auto mb-2"></div>
              <div className="h-4 lg:h-5 w-40 lg:w-48 skeleton-bg rounded mx-auto mb-4"></div>
              <div className="h-6 w-32 skeleton-bg rounded mx-auto mb-4"></div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="px-2 lg:px-6 pb-6 hidden lg:flex lg:flex-row lg:space-x-6">
          <div className="lg:w-1/4 mb-6 lg:mb-0">
            <div className="space-y-2 bg-white p-3 rounded-lg shadow">
              <div className="h-10 w-full skeleton-bg rounded"></div>
              <div className="h-10 w-full skeleton-bg rounded"></div>
              <div className="h-10 w-full skeleton-bg rounded"></div>
            </div>
          </div>
          <div className="lg:w-3/4">
            <TabContentSkeleton />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="px-2 lg:px-6 pb-6 lg:hidden space-y-6">
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
export const TabContentSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md">
    <div className="h-12 w-full skeleton-bg rounded-t-lg mb-4"></div>
    <div className="p-6 space-y-4">
      <div className="h-6 w-1/3 skeleton-bg rounded"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 w-full skeleton-bg rounded"></div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-6 w-32 skeleton-bg rounded"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 skeleton-bg rounded"></div>
          <div className="h-8 w-8 skeleton-bg rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for mobile section loading state
 */
export const MobileSectionSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md">
    <div className="h-12 w-full skeleton-bg rounded-t-lg mb-4"></div>
    <div className="p-4 space-y-4">
      <div className="h-5 w-1/2 skeleton-bg rounded"></div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-1/3 skeleton-bg rounded"></div>
            <div className="h-4 w-1/4 skeleton-bg rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton component for table loading state
 */
export const TableSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-x-auto animate-pulse">
    <table className="w-full text-sm">
      <thead className="bg-button text-white">
        <tr>
          {[...Array(6)].map((_, i) => (
            <th
              key={i}
              className="p-3 text-left font-semibold whitespace-nowrap"
            >
              <div className="h-4 bg-gray-300 rounded w-full"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...Array(5)].map((_, i) => (
          <tr key={i} className="border-b border-gray-200">
            {[...Array(6)].map((_, j) => (
              <td key={j} className="p-3 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Skeleton component for card loading state
 */
export const CardSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-200 h-12 w-full"></div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton component for search bar loading state
 */
export const SearchBarSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4 mb-4">
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <div className="h-4 w-4 skeleton-bg rounded"></div>
      </div>
      <div className="h-10 w-full skeleton-bg rounded pl-10"></div>
    </div>
  </div>
);

/**
 * Skeleton component for pagination controls loading state
 */
export const PaginationSkeleton = () => (
  <div className="mt-6 flex items-center justify-center space-x-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-8 w-8 skeleton-bg rounded"></div>
    ))}
  </div>
);

/**
 * Skeleton component for action buttons loading state
 */
export const ActionButtonsSkeleton = () => (
  <div className="flex items-center gap-2">
    <div className="h-10 w-32 skeleton-bg rounded"></div>
    <div className="h-10 w-36 skeleton-bg rounded"></div>
  </div>
);

/**
 * Skeleton component for tab navigation loading state
 */
export const TabNavigationSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md">
    <div className="flex space-x-1 p-1">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-10 w-32 skeleton-bg rounded"></div>
      ))}
    </div>
  </div>
);
