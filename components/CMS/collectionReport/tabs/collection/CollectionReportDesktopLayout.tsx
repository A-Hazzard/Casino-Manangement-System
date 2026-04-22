/**
 * CollectionReportDesktopLayout Component
 *
 * Dedicated layout orchestration for the Collection Reports list on desktop devices.
 *
 * Features:
 * - Clean integration of search filters and data table
 * - Consistent spacing and alignment for full-width views
 * - Optimized for non-touch interaction and high information density
 *
 * @param props - Metadata and callbacks passed from the parent orchestration layer
 */

'use client';

import { useMemo } from 'react';
import type { CollectionReportDesktopUIProps } from '@/lib/types/components';
import CollectionReportFilters from './CollectionReportFilters';
import CollectionReportTable from './CollectionReportTable';

export default function CollectionReportDesktopLayout(
  props: CollectionReportDesktopUIProps
) {
  const locationSummary = useMemo(() => {
    if (!props.selectedLocation || props.selectedLocation === 'all' || (Array.isArray(props.selectedLocation) && props.selectedLocation.length === 0)) {
      return 'All Locations';
    }
    if (Array.isArray(props.selectedLocation)) {
      if (props.selectedLocation.length === 1) {
        return props.locations.find(l => l._id === props.selectedLocation[0])?.name || 'Selected Location';
      }
      return `${props.selectedLocation.length} Locations`;
    }
    return props.locations.find(l => l._id === props.selectedLocation)?.name || 'Selected Location';
  }, [props.selectedLocation, props.locations]);

  return (
    <div className="flex flex-col gap-4">
      {/* Count Summary */}
      {props.locations.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium text-gray-500 animate-in fade-in slide-in-from-bottom-1 duration-500">
            Showing <span className="font-bold text-gray-900">{props.filteredReports.length}</span> collection reports for <span className="font-bold text-buttonActive">{locationSummary}</span>
          </p>
        </div>
      )}

      <CollectionReportFilters
        locations={props.locations}
        selectedLocation={props.selectedLocation}
        onLocationChange={props.onLocationChange}
        search={props.search}
        onSearchChange={props.onSearchChange}
        onSearchSubmit={props.onSearchSubmit}
        showUncollectedOnly={props.showUncollectedOnly}
        onShowUncollectedOnlyChange={props.onShowUncollectedOnlyChange}
        selectedFilters={props.selectedFilters}
        onFilterChange={props.onFilterChange}
        onClearFilters={props.onClearFilters}
        isSearching={props.isSearching}
      />
      <div ref={props.desktopTableRef}>
        <CollectionReportTable
          data={props.filteredReports}
          loading={props.loading}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          sortField={props.sortField}
          sortDirection={props.sortDirection}
          onSort={props.onSort}
          editableReportIds={props.editableReportIds}
          selectedLicencee={props.selectedLicencee}
        />
      </div>
    </div>
  );
}

