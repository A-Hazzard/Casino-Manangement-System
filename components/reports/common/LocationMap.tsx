"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, TrendingUp } from "lucide-react";

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

interface LocationData {
  locationId: string;
  locationName: string;
  coordinates?: { lat: number; lng: number };
  metrics: {
    grossRevenue: number;
    totalDrop: number;
    totalCancelledCredits: number;
    actualHoldPercentage: number;
  };
  onlineMachines: number;
  totalMachines: number;
  performance: "excellent" | "good" | "average" | "poor";
  sasEnabled: boolean;
}

interface LocationMapProps {
  locations: LocationData[];
  selectedLocations?: string[];
  onLocationSelect: (locationId: string) => void;
  compact?: boolean;
}

export default function LocationMap({
  locations,
  onLocationSelect,
  compact = false,
}: LocationMapProps) {
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet on client side
  useEffect(() => {
    import("leaflet").then((L) => {
      // Set default marker icon

      L.Icon.Default.mergeOptions({
        iconUrl:
          "data:image/svg+xml;base64," +
          btoa(`
          <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 41 12.5 41S25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#6B7280"/>
            <circle cx="12.5" cy="12.5" r="8" fill="white"/>
            <circle cx="12.5" cy="12.5" r="3" fill="#6B7280"/>
          </svg>
        `),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      setMapReady(true);
    });
  }, []);

  if (!mapReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Performance Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500">Loading map...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default center (US center)
  const defaultCenter: [number, number] = [39.8283, -98.5795];

  // Calculate bounds if locations have coordinates
  const validLocations = locations.filter(
    (loc) => loc.coordinates && loc.coordinates.lat && loc.coordinates.lng
  );

  const mapCenter =
    validLocations.length > 0
      ? ([
          validLocations[0].coordinates!.lat,
          validLocations[0].coordinates!.lng,
        ] as [number, number])
      : defaultCenter;

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "average":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (compact) {
    return (
      <div className="h-full w-full">
        <MapContainer
          center={mapCenter}
          zoom={6}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Grey map tiles similar to Google Analytics */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            className="grayscale"
          />

          {validLocations.map((location) => (
            <Marker
              key={location.locationId}
              position={[location.coordinates!.lat, location.coordinates!.lng]}
              eventHandlers={{
                click: () => onLocationSelect(location.locationId),
              }}
            >
              <Popup>
                <div className="min-w-[200px] p-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">
                      {location.locationName}
                    </h3>
                    <Badge
                      variant={
                        location.performance === "excellent"
                          ? "default"
                          : location.performance === "good"
                          ? "secondary"
                          : "outline"
                      }
                      className={getPerformanceColor(location.performance)}
                    >
                      {location.performance}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-medium text-green-600">
                        ${location.metrics.grossRevenue.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">Revenue</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {location.onlineMachines}/{location.totalMachines}
                      </div>
                      <div className="text-muted-foreground">Machines</div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Performance Map
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Interactive map showing casino location performance metrics
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-96 rounded-lg overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={6}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            {/* Grey map tiles similar to Google Analytics */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              className="grayscale"
            />

            {validLocations.map((location) => (
              <Marker
                key={location.locationId}
                position={[
                  location.coordinates!.lat,
                  location.coordinates!.lng,
                ]}
                eventHandlers={{
                  click: () => onLocationSelect(location.locationId),
                }}
              >
                <Popup>
                  <div className="min-w-[280px] p-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">
                        {location.locationName}
                      </h3>
                      <Badge
                        variant={
                          location.performance === "excellent"
                            ? "default"
                            : location.performance === "good"
                            ? "secondary"
                            : "outline"
                        }
                        className={getPerformanceColor(location.performance)}
                      >
                        {location.performance}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-green-600">
                            ${location.metrics.grossRevenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gross Revenue
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">
                            {location.metrics.actualHoldPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Hold %
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="font-medium text-yellow-600">
                          ${location.metrics.totalDrop.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Drop
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="font-medium">
                          {location.onlineMachines}/{location.totalMachines}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Machines Online
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-medium ${
                            location.sasEnabled
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {location.sasEnabled ? "SAS Enabled" : "Non-SAS"}
                        </span>
                        <button
                          onClick={() => onLocationSelect(location.locationId)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Map Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Excellent Performance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Good Performance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Average Performance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Poor Performance</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
