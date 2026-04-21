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

import type { CollectionReportDesktopUIProps } from '@/lib/types/components';
import CollectionReportFilters from './CollectionReportFilters';
import CollectionReportTable from './CollectionReportTable';

export default function CollectionReportDesktopLayout(
  props: CollectionReportDesktopUIProps
) {
  return (
    <div>
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

