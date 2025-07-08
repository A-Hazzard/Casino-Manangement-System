import React from "react";
import CollectionReportTable from "@/components/collectionReport/CollectionReportTable";
import CollectionReportFilters from "@/components/collectionReport/CollectionReportFilters";
import type { CollectionDesktopUIProps } from "@/lib/types/componentProps";
import PaginationControls from "@/components/ui/PaginationControls";

const CollectionDesktopUI: React.FC<CollectionDesktopUIProps> = ({
  loading,
  filteredReports,
  desktopCurrentItems,
  desktopTotalPages,
  desktopPage,
  onPaginateDesktop,
  desktopTableRef,
  // Filter props
  locations,
  selectedLocation,
  onLocationChange,
  search,
  onSearchChange,
  onSearchSubmit,
  showUncollectedOnly,
  onShowUncollectedOnlyChange,
  isSearching,
}) => {
  return (
    <div className="hidden lg:block">
      {/* Filter Container - positioned at the top */}
      <CollectionReportFilters
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationChange={onLocationChange}
        search={search}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        showUncollectedOnly={showUncollectedOnly}
        onShowUncollectedOnlyChange={onShowUncollectedOnlyChange}
        isSearching={isSearching}
      />
      
      {/* Table Content - directly below filters */}
      <div className="bg-white shadow w-full min-w-0">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-buttonActive"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            No collection reports found.
          </p>
        ) : (
          <div ref={desktopTableRef}>
            <CollectionReportTable data={desktopCurrentItems} />
          </div>
        )}
      </div>
      
      {/* Pagination - below table */}
      {!loading && filteredReports.length > 0 && (
        <div className="flex flex-col items-center mt-4 space-y-3">
          {desktopTotalPages > 1 && (
            <PaginationControls
              currentPage={desktopPage - 1}
              totalPages={desktopTotalPages}
              setCurrentPage={(page) => onPaginateDesktop(page + 1)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionDesktopUI;
