import React from "react";
import CollectionReportFilters from "@/components/collectionReport/CollectionReportFilters";
import CollectionReportTable from "@/components/collectionReport/CollectionReportTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CollectionDesktopUIProps } from "@/lib/types/componentProps";

const CollectionDesktopUI: React.FC<CollectionDesktopUIProps> = ({
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
  desktopCurrentItems,
  desktopTotalPages,
  desktopPage,
  onPaginateDesktop,
  desktopPaginationRef,
  desktopTableRef,
}) => {
  return (
    <div className="hidden lg:block">
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
      {/* Optional: <CollectionReportDateButtons /> if they were part of desktop and not mobile only */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-buttonActive"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          No collection reports found.
        </p>
      ) : (
        <>
          <div ref={desktopTableRef}>
            <CollectionReportTable data={desktopCurrentItems} />
          </div>
          <div className="flex flex-col items-center mt-4 space-y-3">
            {desktopTotalPages > 1 && (
              <div
                ref={desktopPaginationRef}
                className="flex justify-center items-center space-x-2"
              >
                <button
                  onClick={() => onPaginateDesktop(1)}
                  disabled={desktopPage === 1}
                  className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                  title="First page"
                >
                  <ChevronLeft size={12} className="inline mr-[-4px]" />
                  <ChevronLeft size={12} className="inline" />
                </button>
                <button
                  onClick={() => onPaginateDesktop(desktopPage - 1)}
                  disabled={desktopPage === 1}
                  className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-gray-700 text-sm">Page</span>
                <input
                  type="number"
                  min={1}
                  max={desktopTotalPages}
                  value={desktopPage}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > desktopTotalPages) val = desktopTotalPages;
                    onPaginateDesktop(val);
                  }}
                  className="w-16 px-2 py-1 border rounded text-center text-sm"
                  aria-label="Page number"
                />
                <span className="text-gray-700 text-sm">
                  of {desktopTotalPages}
                </span>
                <button
                  onClick={() => onPaginateDesktop(desktopPage + 1)}
                  disabled={desktopPage === desktopTotalPages}
                  className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => onPaginateDesktop(desktopTotalPages)}
                  disabled={desktopPage === desktopTotalPages}
                  className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                  title="Last page"
                >
                  <ChevronRight size={12} className="inline mr-[-4px]" />
                  <ChevronRight size={12} className="inline" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionDesktopUI;
