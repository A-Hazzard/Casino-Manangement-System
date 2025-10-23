import React from "react";
import CollectionReportTable from "@/components/collectionReport/CollectionReportTable";
import CollectionReportTableSkeleton from "@/components/collectionReport/CollectionReportTableSkeleton";
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
  selectedFilters,
  onFilterChange,
  onClearFilters,
  isSearching,
  reportIssues,
  onEdit,
  onDelete,
  // Sorting props
  sortField,
  sortDirection,
  onSort,
}) => {
  return (
    <div className="hidden lg:block">
      {/* Filter Container - positioned at the top */}
      <div>
        <CollectionReportFilters
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          search={search}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          showUncollectedOnly={showUncollectedOnly}
          onShowUncollectedOnlyChange={onShowUncollectedOnlyChange}
          selectedFilters={selectedFilters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          isSearching={isSearching}
        />
      </div>

      {/* Table Content - directly below filters */}
      <div className="bg-white shadow w-full min-w-0">
        {loading ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2">
            <CollectionReportTableSkeleton />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2">
            <p className="text-center text-gray-500 py-10">
              No collection reports found.
            </p>
          </div>
        ) : (
          <div
            ref={desktopTableRef}
            className="animate-in fade-in-0 slide-in-from-bottom-2"
          >
            <CollectionReportTable
              data={desktopCurrentItems}
              reportIssues={reportIssues}
              onEdit={onEdit}
              onDelete={onDelete}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </div>
        )}
      </div>

      {/* Pagination - below table */}
      {!loading && filteredReports.length > 0 && (
        <div className="flex flex-col items-center mt-4 space-y-3">
          {desktopTotalPages > 1 && (
            <div
              className="animate-in fade-in-0 slide-in-from-bottom-2"
              style={{ animationDelay: "200ms" }}
            >
              <PaginationControls
                currentPage={desktopPage - 1}
                totalPages={desktopTotalPages}
                setCurrentPage={(page) => onPaginateDesktop(page + 1)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionDesktopUI;
