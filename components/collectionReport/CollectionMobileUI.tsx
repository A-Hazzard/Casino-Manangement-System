import React from "react";
import CollectionReportFilters from "@/components/collectionReport/CollectionReportFilters";
import CollectionReportCards from "@/components/collectionReport/CollectionReportCards";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { CollectionMobileUIProps } from "@/lib/types/componentProps";
import PaginationControls from "@/components/ui/PaginationControls";

const CollectionMobileUI: React.FC<CollectionMobileUIProps> = ({
  locations,
  selectedLocation,
  onLocationChange,
  search,
  onSearchChange,
  onSearchSubmit,
  showUncollectedOnly,
  onShowUncollectedOnlyChange,
  isSearching,
  loading,
  filteredReports,
  mobileCurrentItems,
  mobileTotalPages,
  mobilePage,
  onPaginateMobile,
  mobileCardsRef,
}) => {
  return (
    <div className="w-full absolute left-0 right-0 lg:hidden bg-white p-4 rounded-lg shadow-md mb-4 space-y-4">
      <CollectionReportFilters
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationChange={onLocationChange}
        search={search}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit} // Pass this down
        showUncollectedOnly={showUncollectedOnly}
        onShowUncollectedOnlyChange={onShowUncollectedOnlyChange}
        isSearching={isSearching}
      />

      <div className="flex justify-center w-full">
        <Select defaultValue="today">
          <SelectTrigger className="bg-buttonActive text-white text-md font-semibold py-2.5 px-4 rounded-md h-auto w-auto min-w-[180px]">
            <SelectValue placeholder="Sort by: Today" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Sort by: Today</SelectItem>
            <SelectItem value="yesterday">Sort by: Yesterday</SelectItem>
            <SelectItem value="last7">Sort by: Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-buttonActive"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          No collection reports found.
        </p>
      ) : (
        <>
          <div ref={mobileCardsRef} className="grid grid-cols-1 gap-4">
            <CollectionReportCards data={mobileCurrentItems} />
          </div>

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
  );
};

export default CollectionMobileUI;
