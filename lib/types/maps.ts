// Map-related types for location picker functionality

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
  userLocation?: LocationCoordinates | null;
};

export type NewLocationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSave: (location: SelectedLocation) => void;
  userLocation?: LocationCoordinates | null;
  initialMapType?: MapType;
}; 