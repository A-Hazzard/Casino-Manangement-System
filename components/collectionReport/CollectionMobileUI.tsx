/**
 * Collection Mobile UI Component
 * Mobile layout wrapper for collection reports page.
 *
 * Features:
 * - Mobile-only display (hidden on desktop)
 * - Collection report filters
 * - Collection report cards
 * - Loading skeleton states
 * - Licensee name display
 * - Grid or single column layout
 *
 * @param loading - Whether data is loading
 * @param filteredReports - Filtered collection reports to display
 * @param mobileCardsRef - Ref for mobile cards element
 * @param reportIssues - Issues data for reports
 * @param locations - Available locations list
 * @param selectedLocation - Currently selected location
 * @param onLocationChange - Callback when location changes
 * @param search - Current search value
 * @param onSearchChange - Callback when search changes
 * @param onSearchSubmit - Callback when search is submitted
 * @param showUncollectedOnly - Whether to show only uncollected reports
 * @param onShowUncollectedOnlyChange - Callback when uncollected filter changes
 * @param selectedFilters - Currently selected status filters
 * @param onFilterChange - Callback when filter changes
 * @param onClearFilters - Callback to clear all filters
 * @param isSearching - Whether search is in progress
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 * @param selectedLicencee - Currently selected licensee
 * @param editableReportIds - Set of report IDs that can be edited
 */
import React from 'react';
import CollectionReportCards from '@/components/collectionReport/CollectionReportCards';
import CollectionReportCardSkeleton from '@/components/collectionReport/CollectionReportCardSkeleton';
import CollectionReportFilters from '@/components/collectionReport/CollectionReportFilters';
import type { CollectionMobileUIProps } from '@/lib/types/componentProps';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';

const CollectionMobileUI: React.FC<CollectionMobileUIProps> = ({
  loading,
  filteredReports,
  mobileCardsRef,
  reportIssues,
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
  onEdit,
  onDelete,
  selectedLicencee,
  editableReportIds,
}) => {
  const licenseeName = getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';
  
  return (
    <div className="mb-4 w-full space-y-4 rounded-lg bg-white p-4 shadow-md lg:hidden">
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
        selectedFilters={selectedFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        isSearching={isSearching}
      />

      {/* Cards Content - below filters */}
      <div ref={mobileCardsRef} className="space-y-4">
        {loading ? (
          <>
            {/* Mobile skeleton (single column) - hidden on md and above */}
            <div className="md:hidden">
              <CollectionReportCardSkeleton gridLayout={false} count={4} />
            </div>

            {/* Medium breakpoint skeleton (2x2 grid) - visible only on md */}
            <div className="hidden md:block lg:hidden">
              <CollectionReportCardSkeleton gridLayout={true} count={4} />
            </div>
          </>
        ) : filteredReports.length === 0 ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2">
            <p className="py-10 text-center text-gray-500">
              {selectedLicencee ? `No collection reports found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}.` : 'No collection reports found.'}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2">
            {/* Mobile cards (single column) - hidden on md and above */}
            <div className="md:hidden">
              <CollectionReportCards
                data={filteredReports}
                gridLayout={false}
                reportIssues={reportIssues}
                onEdit={onEdit}
                onDelete={onDelete}
                editableReportIds={editableReportIds}
              />
            </div>

            {/* Medium breakpoint cards (2x2 grid) - visible only on md */}
            <div className="hidden md:block lg:hidden">
              <CollectionReportCards
                data={filteredReports}
                gridLayout={true}
                reportIssues={reportIssues}
                onEdit={onEdit}
                onDelete={onDelete}
                editableReportIds={editableReportIds}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionMobileUI;
