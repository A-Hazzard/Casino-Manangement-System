"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import L, { LatLng } from "leaflet";
import { LocationPickerMapProps } from "@/lib/types/componentProps";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import debounce from "lodash.debounce";

// Set default icon for Leaflet markers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

interface Suggestion {
  x: number;
  y: number;
  label: string;
  raw: {
    place_id: string;
  };
}

const LocationMarker = ({
  position,
  setPosition,
  onLocationSelect,
}: {
  position: LatLng | null;
  setPosition: (position: LatLng) => void;
  onLocationSelect: (latlng: LatLng) => void;
}) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useMap();

  return position === null ? null : <Marker position={position}></Marker>;
};

export const LocationPickerMap = ({
  onLocationSelect,
}: LocationPickerMapProps) => {
  const [position, setPosition] = useState<L.LatLng | null>(
    new L.LatLng(10.6667, -61.5167)
  ); // Initial center on Trinidad
  const [mapType, setMapType] = useState("street"); // 'street' or 'satellite'
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const providerRef = useRef(
    new OpenStreetMapProvider({
      params: {
        countrycodes: "tt",
      },
    })
  );

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query) {
        setLoading(true);
        const results = await providerRef.current.search({ query });
        setSuggestions(results as Suggestion[]);
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const newPosition = new L.LatLng(suggestion.y, suggestion.x);
    setPosition(newPosition);
    onLocationSelect(newPosition);
    setSearchTerm(suggestion.label);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          placeholder="Search for a location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
        )}
        {suggestions.length > 0 && (
          <div className="absolute z-[1001] w-full mt-1 bg-white rounded-md shadow-lg">
            <ul className="py-1">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.raw.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                >
                  {suggestion.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Select on Map</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMapType("street")}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              mapType === "street"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Street
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              mapType === "satellite"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Satellite
          </button>
        </div>
      </div>
      <MapContainer
        center={position || [10.6667, -61.5167]}
        zoom={10}
        style={{ height: "350px", width: "100%" }}
        className="rounded-lg shadow-inner"
      >
        {mapType === "street" ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        )}
        <LocationMarker
          position={position}
          setPosition={setPosition}
          onLocationSelect={onLocationSelect}
        />
      </MapContainer>
    </div>
  );
}; 