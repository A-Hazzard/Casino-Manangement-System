import React from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { IconOptions } from "leaflet";

// Fix for default icon paths in Next.js
const DefaultIcon = L.Icon.Default;
const iconProps: Partial<IconOptions> = {
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
};

// Create a new icon instance with our custom options
const customIcon = new DefaultIcon(iconProps);
L.Icon.Default.mergeOptions(iconProps);

type LocationPerformance = {
    id: string;
    name: string;
    totalDrop: number;
    cancelledCredits: number;
    gross: number;
    machineCount: number;
    onlineMachines: number;
    sasMachines: number;
    coordinates?: [number, number];
    trend: "up" | "down" | "stable";
    trendPercentage: number;
  };

type LocationMapProps = {
  locations: LocationPerformance[];
};

export const LocationMap = ({ locations }: LocationMapProps) => {
  const validLocations = locations.filter(l => 
    l.coordinates &&
    typeof l.coordinates[0] === 'number' &&
    typeof l.coordinates[1] === 'number'
  );
  
  return (
    <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '400px', width: '100%', borderRadius: '8px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {validLocations.map((location) => (
        <Marker 
          key={location.id} 
          position={[location.coordinates![1], location.coordinates![0]]}
          icon={customIcon}
        >
          <Popup>
            <div className="font-sans">
              <h3 className="font-bold text-base mb-1">{location.name}</h3>
              <p><strong>Gross:</strong> ${location.gross.toLocaleString()}</p>
              <p><strong>Drop:</strong> ${location.totalDrop.toLocaleString()}</p>
              <p><strong>Machines:</strong> {location.onlineMachines} / {location.machineCount}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}; 