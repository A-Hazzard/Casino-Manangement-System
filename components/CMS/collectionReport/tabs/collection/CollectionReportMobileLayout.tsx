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

import { useMemo } from 'react';
import CollectionReportFilters from './CollectionReportFilters';
import CollectionReportCards from './CollectionReportCards';
import Link from 'next/link';
import type { CollectionReportMobileUIProps } from '@/lib/types/components';

export default function CollectionReportMobileLayout(
  props: CollectionReportMobileUIProps
) {
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
        const loc = props.locations.find(l => l._id === props.selectedLocation[0]);
        return loc?.slug ? (
          <Link href={`/locations/${loc.slug}`} className="text-buttonActive hover:underline">
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
      <Link href={`/locations/${loc.slug}`} className="text-buttonActive hover:underline">
        {loc.name}
      </Link>
    ) : (
      loc?.name || 'Selected Location'
    );
  }, [props.selectedLocation, props.locations]);

  return (
    <div className="flex flex-col gap-4">
      {/* Count Summary */}
      {props.locations.length > 0 && (
        <div className="px-1">
          <p className="text-xs font-medium text-gray-500 duration-500 animate-in fade-in slide-in-from-bottom-1">
            Showing{' '}
            <span className="font-bold text-gray-900">
              {props.filteredReports.length}
            </span>{' '}
            reports for{' '}
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
