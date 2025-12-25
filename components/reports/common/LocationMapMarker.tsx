/**
 * Location Map Marker Component
 */

'use client';

import { Marker, Popup } from 'react-leaflet';
import { formatCurrency } from '@/lib/utils/formatting';

type LocationMapMarkerProps = {
  marker: {
    position: [number, number];
    title: string;
    id: string;
    performance?: string;
    revenue?: number;
  };
  onSelect: (id: string) => void;
};

export default function LocationMapMarker({ marker, onSelect }: LocationMapMarkerProps) {
  return (
    <Marker position={marker.position} eventHandlers={{ click: () => onSelect(marker.id) }}>
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-gray-900">{marker.title}</h3>
          {marker.performance && (
            <p className="text-xs text-gray-600">Performance: {marker.performance}</p>
          )}
          {marker.revenue !== undefined && (
            <p className="text-xs text-gray-600">Revenue: {formatCurrency(marker.revenue)}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

