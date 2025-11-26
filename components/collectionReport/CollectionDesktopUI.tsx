/**
 * Collection Desktop UI Component
 * Desktop layout wrapper for collection reports page.
 *
 * Features:
 * - Desktop-only display (hidden on mobile)
 * - Collection report filters
 * - Collection report table
 * - Loading skeleton states
 * - Licensee name display
 * - Sorting and filtering integration
 *
 * @param loading - Whether data is loading
 * @param filteredReports - Filtered collection reports to display
 * @param desktopTableRef - Ref for desktop table element
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
 * @param reportIssues - Issues data for reports
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 * @param sortField - Current sort field
 * @param sortDirection - Current sort direction
 * @param onSort - Callback to request column sort
 * @param selectedLicencee - Currently selected licensee
 * @param editableReportIds - Set of report IDs that can be edited
 */
import React from 'react';
import CollectionReportTable from '@/components/collectionReport/CollectionReportTable';
import CollectionReportTableSkeleton from '@/components/collectionReport/CollectionReportTableSkeleton';
import CollectionReportFilters from '@/components/collectionReport/CollectionReportFilters';
import type { CollectionDesktopUIProps } from '@/lib/types/componentProps';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';

const CollectionDesktopUI: React.FC<CollectionDesktopUIProps> = ({
  loading,
  filteredReports,
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
  selectedLicencee,
  editableReportIds,
}) => {
  const licenseeName = getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';
  
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
      <div className="w-full min-w-0 bg-white shadow">
        {loading ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2">
            <CollectionReportTableSkeleton />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2">
            <p className="py-10 text-center text-gray-500">
              {selectedLicencee ? `No collection reports found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}.` : 'No collection reports found.'}
            </p>
          </div>
        ) : (
          <div
            ref={desktopTableRef}
            className="animate-in fade-in-0 slide-in-from-bottom-2"
          >
            <CollectionReportTable
              data={filteredReports}
              reportIssues={reportIssues}
              onEdit={onEdit}
              onDelete={onDelete}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              editableReportIds={editableReportIds}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionDesktopUI;
