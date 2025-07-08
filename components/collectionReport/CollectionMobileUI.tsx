import React from "react";
import CollectionReportCards from "@/components/collectionReport/CollectionReportCards";
import CollectionReportFilters from "@/components/collectionReport/CollectionReportFilters";
import PaginationControls from "@/components/ui/PaginationControls";
import type { CollectionMobileUIProps } from "@/lib/types/componentProps";

const CollectionMobileUI: React.FC<CollectionMobileUIProps> = ({
  loading,
  filteredReports,
  mobileCurrentItems,
  mobileTotalPages,
  mobilePage,
  onPaginateMobile,
  mobileCardsRef,
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
    <div className="w-full absolute left-0 right-0 lg:hidden bg-white p-4 rounded-lg shadow-md mb-4 space-y-4">
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
      
      {/* Cards Content - below filters */}
      <div ref={mobileCardsRef} className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : filteredReports.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            No collection reports found.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              <CollectionReportCards data={mobileCurrentItems} />
            </div>

            {/* Pagination - below cards */}
            {mobileTotalPages > 1 && (
              <PaginationControls
                currentPage={mobilePage - 1}
                totalPages={mobileTotalPages}
                setCurrentPage={(page) => onPaginateMobile(page + 1)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionMobileUI;
