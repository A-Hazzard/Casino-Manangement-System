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
import Link from 'next/link';

export default function CollectionReportDesktopLayout(
  props: CollectionReportDesktopUIProps
) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const locationSummary = useMemo(() => {
    if (
      !props.selectedLocation ||
      props.selectedLocation === 'all' ||
      (Array.isArray(props.selectedLocation) &&
        props.selectedLocation.length === 0)
    ) {
      return 'All Locations';
    }
    if (Array.isArray(props.selectedLocation)) {
      if (props.selectedLocation.length === 1) {
        const loc = props.locations.find(
          l => l._id === props.selectedLocation[0]
        );
        return loc?.slug ? (
          <Link
            href={`/locations/${loc.slug}`}
            className="text-buttonActive hover:underline"
          >
            {loc.name}
          </Link>
        ) : (
          loc?.name || 'Selected Location'
        );
      }
      return `${props.selectedLocation.length} Locations`;
    }
    const loc = props.locations.find(l => l._id === props.selectedLocation);
    return loc?.slug ? (
      <Link
        href={`/locations/${loc.slug}`}
        className="text-buttonActive hover:underline"
      >
        {loc.name}
      </Link>
    ) : (
      loc?.name || 'Selected Location'
    );
  }, [props.selectedLocation, props.locations]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex flex-col gap-4">
      {/* Count Summary */}
      {props.locations.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium text-gray-500 duration-500 animate-in fade-in slide-in-from-bottom-1">
            Showing{' '}
            <span className="font-bold text-gray-900">
              {props.filteredReports.length}
            </span>{' '}
            collection reports for{' '}
            <span className="font-bold text-buttonActive">
              {locationSummary}
            </span>
          </p>
        </div>
      )}

      <CollectionReportFilters
        locations={props.locations}
        selectedLocation={props.selectedLocation}
        onLocationChange={props.onLocationChange}
        search={props.search}
        onSearchChange={props.onSearchChange}
        searchType={props.searchType}
        onSearchTypeChange={props.onSearchTypeChange}
        onSearchSubmit={props.onSearchSubmit}
        showUncollectedOnly={props.showUncollectedOnly}
        onShowUncollectedOnlyChange={props.onShowUncollectedOnlyChange}
        showArchived={props.showArchived}
        onShowArchivedChange={props.onShowArchivedChange}
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
          onRestore={props.onRestore}
          onPermanentDelete={props.onPermanentDelete}
          canManage={props.canManage}
          canPermanentlyDelete={props.canPermanentlyDelete}
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
