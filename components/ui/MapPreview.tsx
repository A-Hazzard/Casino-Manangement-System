"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { EnterFullScreenIcon, ExitFullScreenIcon } from "@radix-ui/react-icons";
import "leaflet/dist/leaflet.css";
import { MapPreviewProps } from "@/lib/types/componentProps";
import { locations } from "@/lib/types";
import MapSkeleton from "@/components/ui/MapSkeleton";
import { useRouter } from "next/navigation";

// Dynamically import react-leaflet components (SSR disabled)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

// Helper function to get the valid longitude (checks both "longitude" and "longtitude")
const getValidLongitude = (geo: {
  longitude?: number;
  longtitude?: number;
}): number | undefined => {
  // Prioritize longitude over longtitude
  if (geo.longitude !== undefined && geo.longitude !== 0) {
    return geo.longitude;
  }
  if (geo.longtitude !== undefined && geo.longtitude !== 0) {
    return geo.longtitude;
  }
  return undefined;
};

// Helper function to get location stats from chart data
const getLocationStats = (location: locations, chartData: any[]) => {
  // Try to find matching data in chartData
  const stats = chartData.find(
    (d) =>
      (d.locationName && d.locationName === location.locationName) ||
      (d.location && d.location === location.locationName) ||
      (d.locationName && d.locationName === location.name) ||
      (d.location && d.location === location.name)
  );

  return {
    moneyIn: stats?.moneyIn ?? location.moneyIn ?? 0,
    moneyOut: stats?.moneyOut ?? location.moneyOut ?? 0,
    gross: stats?.gross ?? location.gross ?? 0,
    totalMachines: location.totalMachines ?? 0,
    onlineMachines: location.onlineMachines ?? 0,
  };
};

export default function MapPreview(props: MapPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const router = useRouter();

  // Initialize Leaflet on client side
  useEffect(() => {
    import("leaflet").then((L) => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon.png",
        iconUrl: "/leaflet/marker-icon-image.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
      // Force iconUrl to be set on every render
      L.Marker.prototype.options.icon = new L.Icon.Default();
      setMapReady(true);
    });
  }, []);

  // Modal animation using GSAP
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }
      );
    }
  }, [isModalOpen]);

  const closeModal = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => setIsModalOpen(false),
      });
    }
  };

  if (!mapReady) {
    return <MapSkeleton />;
  }

  // Use default empty arrays if props are missing
  const gamingLocations = Array.isArray(props.gamingLocations)
    ? props.gamingLocations
    : [];
  const chartData = Array.isArray(props.chartData) ? props.chartData : [];

  // Debug logging for gaming locations data
  if (process.env.NODE_ENV === "development") {
    console.log("MapPreview - gamingLocations:", {
      count: gamingLocations.length,
      locations: gamingLocations.map(loc => ({
        id: loc._id,
        name: loc.name || loc.locationName,
        geoCoords: loc.geoCoords,
        hasValidCoords: loc.geoCoords && 
          loc.geoCoords.latitude !== 0 && 
          (loc.geoCoords.longitude !== 0 || loc.geoCoords.longtitude !== 0)
      }))
    });
    
    // Log chart data structure
    console.log("MapPreview - chartData:", {
      count: chartData.length,
      sampleData: chartData.slice(0, 2)
    });
  }

  // Handle navigation to location details
  const handleLocationClick = (locationId: string) => {
    router.push(`/locations/${locationId}`);
  };

  // Render a marker if valid latitude and a valid longitude are present.
  const renderMarker = (
    lat: number,
    geo: { longitude?: number; longtitude?: number },
    label: string,
    key: string | number,
    locationObj: locations
  ) => {
    const lon = getValidLongitude(geo);
    
    // Debug logging for coordinate issues
    if (process.env.NODE_ENV === "development") {
      console.log(`Location: ${label}`, {
        latitude: lat,
        longitude: geo.longitude,
        longtitude: geo.longtitude,
        validLongitude: lon,
        hasValidCoords: lon !== undefined && lat !== 0 && lon !== 0
      });
    }
    
    if (lon === undefined || lat === 0 || lon === 0) return null;
    
    const stats = getLocationStats(locationObj, chartData);
    
    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>
          <div className="min-w-[180px]">
            <div className="font-bold text-base mb-2">{label}</div>
            <div className="text-xs mb-1">
              <span className="font-semibold">Machines Online:</span>{" "}
              {stats.onlineMachines} / {stats.totalMachines}
            </div>
            <div className="text-xs mb-1">
              <span className="font-semibold">Money In:</span> $
              {stats.moneyIn.toLocaleString()}
            </div>
            <div className="text-xs mb-1">
              <span className="font-semibold">Money Out:</span> $
              {stats.moneyOut.toLocaleString()}
            </div>
            <div className="text-xs mb-2">
              <span className="font-semibold">Gross:</span> $
              {stats.gross.toLocaleString()}
            </div>
            <button
              onClick={() => handleLocationClick(locationObj._id)}
              className="w-full bg-buttonActive text-white px-3 py-1 rounded text-xs hover:bg-buttonActive/90 transition-colors"
            >
              View Details
            </button>
          </div>
        </Popup>
      </Marker>
    );
  };

  // Filter valid locations with coordinates
  const validLocations = gamingLocations.filter(location => {
    if (!location.geoCoords) {
      console.log(`📍 Location "${location.name || location.locationName}" has no geoCoords`);
      return false;
    }
    
    const validLongitude = getValidLongitude(location.geoCoords);
    const hasValidCoords = location.geoCoords.latitude !== 0 && 
                          validLongitude !== undefined && 
                          validLongitude !== 0;
    
    if (!hasValidCoords) {
      console.log(`📍 Location "${location.name || location.locationName}" has invalid coordinates:`, {
        latitude: location.geoCoords.latitude,
        longitude: location.geoCoords.longitude,
        longtitude: location.geoCoords.longtitude,
        validLongitude
      });
    }
    
    return hasValidCoords;
  });

  console.log(`🗺️ MapPreview: ${validLocations.length} valid locations out of ${gamingLocations.length} total`);

  return (
    <>
      {/* Small Map Preview */}
      <div className="relative p-4 rounded-lg shadow-md bg-container w-full">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Map Preview</h3>

        <button
          className="absolute top-8 right-5 z-[50] p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 ease-in-out"
          onClick={() => setIsModalOpen(true)}
        >
          <EnterFullScreenIcon className="w-5 h-5" />
        </button>
        <MapContainer
          center={[10.654, -61.501]}
          zoom={10}
          className="z-10 mt-2 h-48 w-full rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Render valid markers */}
          {validLocations.map((location) => {
            const locationName =
              location.name || location.locationName || "Unknown Location";
            return renderMarker(
              location.geoCoords.latitude,
              location.geoCoords,
              locationName,
              location._id,
              location
            );
          })}
        </MapContainer>
      </div>

      {/* Modal for Expanded Map */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md z-[1000]">
          <div
            ref={modalRef}
            className="relative bg-white rounded-lg shadow-lg w-[90vw] max-w-5xl p-4"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Casino Locations Map
            </h3>
            <button
              className="absolute top-3 right-3 p-2 bg-gray-200 rounded-full shadow-md hover:scale-110 transition-all duration-200 ease-in-out z-[1000]"
              onClick={closeModal}
            >
              <ExitFullScreenIcon className="w-5 h-5" />
            </button>
            <MapContainer
              center={[10.654, -61.501]}
              zoom={10}
              className="h-[80vh] w-full rounded-lg"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {validLocations.map((location) => {
                const locationName =
                  location.name || location.locationName || "Unknown Location";
                return renderMarker(
                  location.geoCoords.latitude,
                  location.geoCoords,
                  locationName,
                  `modal-${location._id}`,
                  location
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}
    </>
  );
}
