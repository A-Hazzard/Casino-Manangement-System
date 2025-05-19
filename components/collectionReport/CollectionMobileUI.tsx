import React from "react";
import type { CollectionReportRow } from "@/lib/types/componentProps";
import type { LocationSelectItem } from "@/lib/types/location";
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

interface CollectionMobileUIProps {
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void; // Added for search button click or enter
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (value: boolean) => void;
  isSearching: boolean;
  loading: boolean;
  filteredReports: CollectionReportRow[]; // Used for total count and empty check
  mobileCurrentItems: CollectionReportRow[];
  mobileTotalPages: number;
  mobilePage: number;
  onPaginateMobile: (page: number) => void;
  mobilePaginationRef: React.RefObject<HTMLDivElement | null>;
  mobileCardsRef: React.RefObject<HTMLDivElement | null>;
  itemsPerPage: number; // Used to calculate first/last item index
}

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
  itemsPerPage,
}) => {
  const mobileFirstItemIndex = (mobilePage - 1) * itemsPerPage;
  const mobileLastItemIndex = mobilePage * itemsPerPage;

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
          <div ref={mobileCardsRef}>
            <CollectionReportCards data={mobileCurrentItems} />
          </div>

          {mobileTotalPages > 1 && (
            <div
              ref={mobilePaginationRef}
              className="flex justify-center items-center space-x-2 mt-4"
            >
              <button
                onClick={() => onPaginateMobile(mobilePage - 1)}
                disabled={mobilePage === 1}
                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: Math.min(5, mobileTotalPages) }, (_, i) => {
                let pageToShow = i + 1;
                if (mobileTotalPages > 5) {
                  if (mobilePage > 3) pageToShow = mobilePage - 2 + i;
                  if (mobilePage > mobileTotalPages - 2)
                    pageToShow = mobileTotalPages - 4 + i;
                }
                return (
                  <button
                    key={pageToShow}
                    onClick={() => onPaginateMobile(pageToShow)}
                    className={`px-3 py-1 rounded-md ${
                      mobilePage === pageToShow
                        ? "bg-buttonActive text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {pageToShow}
                  </button>
                );
              })}
              <button
                onClick={() => onPaginateMobile(mobilePage + 1)}
                disabled={mobilePage === mobileTotalPages}
                className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-3">
            Showing {mobileFirstItemIndex + 1} -{" "}
            {Math.min(mobileLastItemIndex, filteredReports.length)} of{" "}
            {filteredReports.length} reports
          </p>
        </>
      )}
    </div>
  );
};

export default CollectionMobileUI;
