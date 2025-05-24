"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { EnterFullScreenIcon, ExitFullScreenIcon } from "@radix-ui/react-icons";
import "leaflet/dist/leaflet.css";
import { MapPreviewProps } from "@/lib/types/componentProps";
import MapSkeleton from "@/components/ui/MapSkeleton";

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
  return geo.longitude !== undefined ? geo.longitude : geo.longtitude;
};

export default function MapPreview(props: MapPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

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

  // Render a marker if valid latitude and a valid longitude are present.
  const renderMarker = (
    lat: number,
    geo: { longitude?: number; longtitude?: number },
    label: string,
    key: string | number
  ) => {
    const lon = getValidLongitude(geo);
    if (lon === undefined || lat === 0 || lon === 0) return null;
    return (
      <Marker key={key} position={[lat, lon]}>
        <Popup>{label}</Popup>
      </Marker>
    );
  };

  return (
    <>
      {/* Small Map Preview */}
      <div className="relative p-4 rounded-lg shadow-md bg-container w-full">
        <button
          className="absolute top-8 right-5 z-[1000] p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 ease-in-out"
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

          {/* Always render all valid markers if gamingLocations is not empty */}
          {gamingLocations.length > 0 &&
            gamingLocations.map((location) => {
              if (!location.geoCoords) return null;
              return renderMarker(
                location.geoCoords.latitude,
                location.geoCoords,
                location.name,
                location._id
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

              {gamingLocations.map((location) => {
                if (!location.geoCoords) return null;
                return renderMarker(
                  location.geoCoords.latitude,
                  location.geoCoords,
                  location.name,
                  `modal-${location._id}`
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}
    </>
  );
}
