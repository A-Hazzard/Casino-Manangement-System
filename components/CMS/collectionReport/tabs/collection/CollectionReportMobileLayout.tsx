/**
 * CollectionReportMobileLayout Component
 *
 * Dedicated layout orchestration for the Collection Reports list on mobile devices.
 *
 * Features:
 * - Stacked arrangement of filters and entry cards
 * - Optimized for touch interaction and vertical scrolling
 * - Fluid sizing to fit various mobile viewport widths
 *
 * @param props - Metadata and callbacks for mobile rendering
 */

'use client';

import CollectionReportFilters from './CollectionReportFilters';
import CollectionReportCards from './CollectionReportCards';
import type { CollectionReportMobileUIProps } from '@/lib/types/components';

export default function CollectionReportMobileLayout(props: CollectionReportMobileUIProps) {
  return (
    <div className="space-y-4">
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
      <div ref={props.mobileCardsRef}>
        <CollectionReportCards
          data={props.filteredReports}
          loading={props.loading}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          selectedLicencee={props.selectedLicencee}
          editableReportIds={props.editableReportIds}
        />
      </div>
    </div>
  );
}

