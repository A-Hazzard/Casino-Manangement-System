import type { CollectionReportLocationFilter } from '@/lib/types/store';
import type { LocationSelectItem } from '@/lib/types/location';

export function areCollectionReportLocationFiltersEqual(
  left: CollectionReportLocationFilter,
  right: CollectionReportLocationFilter
): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every(
      (locationId, index) => locationId === right[index]
    );
  }

  return false;
}

export function sanitizeCollectionReportLocationFilter(
  selectedLocation: CollectionReportLocationFilter,
  locations: LocationSelectItem[]
): CollectionReportLocationFilter {
  if (selectedLocation === 'all') {
    return 'all';
  }

  const validLocationIds = new Set(
    locations.map(location => String(location._id))
  );

  if (Array.isArray(selectedLocation)) {
    const validSelection = selectedLocation.filter(locationId =>
      validLocationIds.has(locationId)
    );

    if (validSelection.length === 0) {
      return 'all';
    }

    if (validSelection.length === selectedLocation.length) {
      return selectedLocation;
    }

    return validSelection;
  }

  return validLocationIds.has(selectedLocation) ? selectedLocation : 'all';
}
