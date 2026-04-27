type LocationCoordinates = {
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

