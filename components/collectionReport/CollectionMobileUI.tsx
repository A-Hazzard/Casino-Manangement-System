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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CollectionMobileUIProps } from "@/lib/types/componentProps";

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
  mobilePaginationRef,
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
            <div
              ref={mobilePaginationRef}
              className="flex justify-center items-center space-x-2 mt-4"
            >
              <button
                onClick={() => onPaginateMobile(1)}
                disabled={mobilePage === 1}
                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                title="First page"
              >
                <ChevronLeft size={12} className="inline mr-[-4px]" />
                <ChevronLeft size={12} className="inline" />
              </button>
              <button
                onClick={() => onPaginateMobile(mobilePage - 1)}
                disabled={mobilePage === 1}
                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-gray-700 text-sm">Page</span>
              <input
                type="number"
                min={1}
                max={mobileTotalPages}
                value={mobilePage}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > mobileTotalPages) val = mobileTotalPages;
                  onPaginateMobile(val);
                }}
                className="w-16 px-2 py-1 border rounded text-center text-sm"
                aria-label="Page number"
              />
              <span className="text-gray-700 text-sm">
                of {mobileTotalPages}
              </span>
              <button
                onClick={() => onPaginateMobile(mobilePage + 1)}
                disabled={mobilePage === mobileTotalPages}
                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => onPaginateMobile(mobileTotalPages)}
                disabled={mobilePage === mobileTotalPages}
                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                title="Last page"
              >
                <ChevronRight size={12} className="inline mr-[-4px]" />
                <ChevronRight size={12} className="inline" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CollectionMobileUI;
