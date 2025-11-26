/**
 * Maps Types
 * Types for map functionality and location picker components.
 *
 * Includes types for:
 * - Location coordinates (lat/lng)
 * - Selected locations with address details
 * - Map types (street/satellite)
 * - Place suggestions with local/remote data
 * - Location picker map props and modals
 */

export type LocationCoordinates = {
  lat: number;
  lng: number;
};

export type SelectedLocation = LocationCoordinates & {
  address: string;
  city?: string;
  country?: string;
};

export type MapType = 'street' | 'satellite';

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isLocal: boolean;
};

export type LocationPickerMapProps = {
  initialLat: number;
  initialLng: number;
  mapType: MapType;
  onLocationSelect: (location: SelectedLocation) => void;
  onMapLoadError?: () => void;
  onMapLoadSuccess?: () => void;
};

export type NewLocationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSave: (location: SelectedLocation) => void;
  initialMapType?: MapType;
};
