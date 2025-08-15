import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { CollectionReportSkeletonProps } from "@/lib/types/pages";

/**
 * Main skeleton component for collection report detail page
 */
export const CollectionReportSkeleton = ({
  pathname,
}: CollectionReportSkeletonProps) => (
  <div className="w-full md:w-[90%] lg:w-full md:mx-auto md:pl-28 md:pl-36 min-h-screen bg-background flex flex-col overflow-hidden">
    <Sidebar pathname={pathname} />
    <main className="flex-1 lg:ml-4">
      <Header
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        containerPaddingMobile="px-4 py-8 lg:px-0 lg:py-0"
        disabled={true}
      />

      <div className="px-2 lg:px-6 pt-6 hidden lg:block">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 skeleton-bg rounded-md"></div>
          <div className="h-8 w-8 skeleton-bg rounded-md"></div>
        </div>
      </div>

      <div className="px-2 lg:px-6 pt-2 lg:pt-4 pb-6">
        <div className="bg-white lg:bg-container rounded-lg shadow lg:border-t-4 lg:border-lighterBlueHighlight py-4 lg:py-8">
          <div className="text-center py-2 lg:py-4 px-4">
            <div className="h-4 w-20 skeleton-bg rounded mx-auto mb-2 lg:hidden"></div>
            <div className="h-8 lg:h-12 w-48 lg:w-64 skeleton-bg rounded mx-auto mb-2"></div>
            <div className="h-4 lg:h-5 w-32 lg:w-40 skeleton-bg rounded mx-auto mb-4"></div>
            <div className="h-6 w-40 skeleton-bg rounded mx-auto mb-4"></div>
          </div>
        </div>
      </div>

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

      <div className="px-2 lg:px-6 pb-6 lg:hidden space-y-6">
        <MobileSectionSkeleton />
        <MobileSectionSkeleton />
        <MobileSectionSkeleton />
      </div>
    </main>
  </div>
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
