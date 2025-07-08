"use client";

import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import L, { LatLng } from "leaflet";

// Fix for custom marker icon
const customIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon-image.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  shadowUrl: "/leaflet/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [13, 41],
});

type MapType = "street" | "satellite";

interface LocationPickerMapProps {
  initialLat: number;
  initialLng: number;
  mapType: MapType;
  onMapTypeChange: (type: MapType) => void;
  searchQuery: string;
  onLocationSelect: (selectedLocation: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const LocationPickerMap = ({
  initialLat,
  initialLng,
  mapType,
  onMapTypeChange,
  searchQuery,
  onLocationSelect,
}: LocationPickerMapProps) => {
  const [position, setPosition] = useState<LatLng>(new LatLng(initialLat, initialLng));
  const [address, setAddress] = useState<string>("");
  const mapRef = useRef<any>(null);

  // Geocode when searchQuery changes
  useEffect(() => {
    if (searchQuery && searchQuery.length > 2) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      )
        .then((res) => res.json())
        .then((results) => {
          if (results && results.length > 0) {
            const { lat, lon, display_name } = results[0];
            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            setPosition(new LatLng(latNum, lonNum));
            setAddress(display_name);
            onLocationSelect({ lat: latNum, lng: lonNum, address: display_name });
            if (mapRef.current) {
              mapRef.current.setView([latNum, lonNum], 13);
            }
          }
        });
    }
    // eslint-disable-next-line
  }, [searchQuery]);

  // Handle map click
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setPosition(new LatLng(lat, lng));
    // Reverse geocode
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
    )
      .then((res) => res.json())
      .then((data) => {
        const addr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setAddress(addr);
        onLocationSelect({ lat, lng, address: addr });
      })
      .catch(() => {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        onLocationSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      });
  };

  // Map click handler component
  const ClickHandler = () => {
    const map = useMap();
    useEffect(() => {
      map.on("click", handleMapClick);
      return () => {
        map.off("click", handleMapClick);
      };
    }, [map]);
    return null;
  };

  // Update position if initialLat/initialLng change
  useEffect(() => {
    setPosition(new LatLng(initialLat, initialLng));
  }, [initialLat, initialLng]);

  return (
    <div className="relative h-80 md:h-96 w-full rounded-md overflow-hidden border border-gray-300 map-container">
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        scrollWheelZoom={true}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          url={mapType === "street" ? OSM_URL : SATELLITE_URL}
          attribution={
            mapType === "street"
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          }
        />
        <Marker position={position} icon={customIcon} />
        <ClickHandler />
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-10 bg-white bg-opacity-90 rounded-md p-2 text-xs text-gray-600 max-w-[calc(100%-1rem)]">
        <span className="hidden md:inline">Click on the map to select a location</span>
        <span className="md:hidden">Tap to select location</span>
      </div>
    </div>
  );
};

export { LocationPickerMap };
export default LocationPickerMap; 