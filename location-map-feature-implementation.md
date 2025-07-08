# Location Map Feature Implementation Guide

## Overview

This document provides a comprehensive guide for implementing the interactive map feature in the `NewLocationModal.tsx` component. The map allows users to visually select coordinates by clicking on the map, providing an intuitive alternative to manually entering latitude and longitude values. The initial location is determined by the user's IP address.

---

## 1. Map Feature UI Design

### 1.1. Visual Layout
```
┌─────────────────────────────────────────────────────────┐
│ [✓] Use Map to Select Location                          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ Latitude        │ │ Longitude       │                │
│ │ [6.809985]      │ │ [-58.166204]    │                │
│ └─────────────────┘ └─────────────────┘                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  🗺️ MAP AREA                        ││
│  │                                                     ││
│  │    📍 Current Location Marker                       ││
│  │                                                     ││
│  │  + Zoom Controls                                    ││
│  │  + Pan & Drag                                       ││
│  │  + Click to Select New Location                     ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 1.2. Map Container Styling
- **Height**: 400px on desktop, 300px on mobile
- **Border**: Rounded corners with subtle shadow
- **Background**: Loading state with placeholder
- **Responsive**: Full width with proper aspect ratio

---

## 2. LocationPickerMap Component Implementation

### 2.1. Component Logic and State Management

The `LocationPickerMap` component manages several key pieces of state and logic:

#### **State Variables:**
- **`position`**: Stores the current selected location as a Leaflet `LatLng` object
- **`isLoading`**: Boolean flag to show/hide the loading spinner while the map initializes
- **`mapRef`**: Reference to the Leaflet map instance for programmatic control

#### **Core Logic Flow:**

1. **Initialization**: 
   - Component receives initial coordinates as props (defaults to Guyana coordinates)
   - Creates a Leaflet `LatLng` object from the initial coordinates
   - Sets loading state to `true` while map initializes

2. **Map Ready Handler**:
   - When Leaflet map finishes loading, `whenReady` callback fires
   - Sets `isLoading` to `false`, hiding the loading spinner
   - Map becomes interactive

3. **Location Selection Logic**:
   - **Click Events**: When user clicks anywhere on the map, the `MapClickHandler` component captures the click coordinates
   - **Marker Dragging**: When user drags the purple marker, the `dragend` event fires with new coordinates
   - **State Update**: Both events call `handleLocationSelect()` which updates the `position` state
   - **Parent Communication**: The new coordinates are passed to the parent component via `onLocationSelect` callback

4. **Coordinate Display**:
   - The current `position` state is displayed in real-time below the map
   - Coordinates are formatted to 6 decimal places for precision

### 2.2. Complete Component Code
```tsx
// components/ui/locations/LocationPickerMap.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Map, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { LatLng, Icon, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Next.js
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

type LocationPickerMapProps = {
  onLocationSelect: (latlng: LatLng) => void;
  initialLat?: number;
  initialLng?: number;
  height?: number;
};

// Map Click Handler Component
const MapClickHandler = ({
  onLocationSelect,
}: {
  onLocationSelect: (latlng: LatLng) => void;
}) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

// Custom Marker Icon
const createCustomIcon = () => {
  return divIcon({
    html: `
      <div style="
        background-color: #6a11cb;
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    className: "custom-map-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

export const LocationPickerMap = ({
  onLocationSelect,
  initialLat = 6.809985,
  initialLng = -58.166204,
  height = 400,
}: LocationPickerMapProps) => {
  const [position, setPosition] = useState<LatLng>(
    new LatLng(initialLat, initialLng)
  );
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<any>(null);

  // Handle location selection
  const handleLocationSelect = (latlng: LatLng) => {
    setPosition(latlng);
    onLocationSelect(latlng);
  };

  // Handle map ready
  const handleMapReady = () => {
    setIsLoading(false);
  };

  // Center map on current position
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(position, 13);
    }
  }, [position]);

  return (
    <div className="relative w-full">
      {/* Loading State */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10"
          style={{ height: `${height}px` }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-buttonActive"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        className="rounded-lg overflow-hidden shadow-md border border-gray-200"
        style={{ height: `${height}px` }}
      >
        <Map
          ref={mapRef}
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenReady={handleMapReady}
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
        >
          {/* Tile Layer - OpenStreetMap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            detectRetina={true}
          />

          {/* Current Position Marker */}
          <Marker 
            position={position} 
            icon={createCustomIcon()}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const newPosition = marker.getLatLng();
                handleLocationSelect(newPosition);
              },
            }}
          />

          {/* Click Handler */}
          <MapClickHandler onLocationSelect={handleLocationSelect} />
        </Map>
      </div>

      {/* Map Instructions */}
      <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
        <div className="flex items-start space-x-2">
          <div className="text-blue-600 mt-0.5">ℹ️</div>
          <div>
            <p className="font-medium text-blue-800 mb-1">How to use the map:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Click anywhere on the map to set a new location</li>
              <li>• Drag the purple marker to fine-tune the position</li>
              <li>• Use mouse wheel or +/- buttons to zoom</li>
              <li>• Drag the map to explore different areas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Coordinates Display */}
      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Selected Location:</span>
          <span className="font-mono text-gray-600">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
};
```

---

## 3. Map Integration in NewLocationModal

### 3.1. Integration Logic and State Management

The map integration in `NewLocationModal` involves several key pieces of logic:

#### **State Management:**
- **`useMap`**: Boolean state that controls whether the map is visible or hidden
- **`formData`**: Object containing all form fields including `latitude` and `longitude`
- **`handleLocationSelect`**: Function that receives coordinates from the map and updates the form

#### **Toggle Logic:**
1. **Checkbox State**: The `useMap` state is controlled by the checkbox
2. **Conditional Rendering**: The map component only renders when `useMap` is `true`
3. **Input Readonly**: When map is active, coordinate inputs become readonly to prevent conflicts
4. **Smooth Transition**: CSS transitions provide smooth show/hide animation

#### **Data Flow:**
1. **Initial Load**: Form loads with default coordinates (IP-based or form defaults)
2. **Map Toggle**: User checks "Use Map to Select Location" checkbox
3. **Map Display**: Map appears with current form coordinates as initial position
4. **Location Selection**: User clicks or drags on map
5. **Coordinate Update**: `handleLocationSelect` receives new coordinates and updates `formData`
6. **Form Sync**: Updated coordinates appear in the readonly input fields
7. **Form Submission**: When form is submitted, the current coordinates are included

### 3.2. Updated GEO Coordinates Section (Desktop)
```tsx
{/* GEO Coordinates Section in Desktop View */}
<div className="mb-4">
  <p className="text-sm font-medium mb-2">GEO Coordinates</p>
  
  {/* Map Toggle Checkbox */}
  <div className="flex items-center space-x-2 mb-4">
    <Checkbox
      id="useMap"
      checked={useMap}
      onCheckedChange={(checked) => setUseMap(checked === true)}
      className="text-buttonActive border-buttonActive focus:ring-buttonActive"
    />
    <Label htmlFor="useMap" className="font-medium text-gray-700">
      Use Map to Select Location
    </Label>
  </div>

  {/* Coordinate Inputs */}
  <div className="grid grid-cols-2 gap-4 mb-4">
    <div className="flex items-center">
      <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
        <span className="text-sm font-medium">Latitude</span>
      </div>
      <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
        <Input
          name="latitude"
          value={formData.latitude}
          onChange={handleInputChange}
          className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
          readOnly={useMap}
          placeholder="6.809985"
        />
      </div>
    </div>
    <div className="flex items-center">
      <div className="bg-button text-primary-foreground rounded-l-md py-2 px-4">
        <span className="text-sm font-medium">Longitude</span>
      </div>
      <div className="flex-1 flex items-center bg-container rounded-r-md border border-border border-l-0">
        <Input
          name="longitude"
          value={formData.longitude}
          onChange={handleInputChange}
          className="border-0 bg-transparent w-full focus-visible:ring-0 focus-visible:ring-offset-0"
          readOnly={useMap}
          placeholder="-58.166204"
        />
      </div>
    </div>
  </div>

  {/* Map Component */}
  {useMap && (
    <div className="transition-all duration-300 ease-in-out">
      <LocationPickerMap
        onLocationSelect={handleLocationSelect}
        initialLat={parseFloat(formData.latitude) || 6.809985}
        initialLng={parseFloat(formData.longitude) || -58.166204}
        height={400}
      />
    </div>
  )}
</div>
```

### 3.3. Updated GEO Coordinates Section (Mobile)
```tsx
{/* GEO Coordinates Section in Mobile View */}
<div>
  <h3 className="text-lg font-semibold text-buttonActive mb-4">
    GEO Coordinates
  </h3>
  
  {/* Map Toggle */}
  <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-md">
    <Checkbox
      id="useMapMobile"
      checked={useMap}
      onCheckedChange={(checked) => setUseMap(checked === true)}
      className="text-buttonActive border-buttonActive focus:ring-buttonActive"
    />
    <Label htmlFor="useMapMobile" className="font-medium text-buttonActive">
      Use Interactive Map to Select Location
    </Label>
  </div>
  
  {/* Coordinate Inputs */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div>
      <Label
        htmlFor="latitude"
        className="text-sm text-grayHighlight mb-2 block font-medium"
      >
        Latitude
      </Label>
      <Input
        id="latitude"
        name="latitude"
        value={formData.latitude}
        onChange={handleInputChange}
        className="bg-container border-border focus-visible:ring-buttonActive"
        readOnly={useMap}
        placeholder="6.809985"
      />
    </div>
    <div>
      <Label
        htmlFor="longitude"
        className="text-sm text-grayHighlight mb-2 block font-medium"
      >
        Longitude
      </Label>
      <Input
        id="longitude"
        name="longitude"
        value={formData.longitude}
        onChange={handleInputChange}
        className="bg-container border-border focus-visible:ring-buttonActive"
        readOnly={useMap}
        placeholder="-58.166204"
      />
    </div>
  </div>
  
  {/* Map Component - Mobile Optimized */}
  {useMap && (
    <div className="transition-all duration-300 ease-in-out">
      <LocationPickerMap
        onLocationSelect={handleLocationSelect}
        initialLat={parseFloat(formData.latitude) || 6.809985}
        initialLng={parseFloat(formData.longitude) || -58.166204}
        height={300}
      />
    </div>
  )}
</div>
```

---

## 4. Core Features and Functionality

### 4.1. IP-Based Location Detection Logic

**How IP-based location works:**
1. **Server-Side Detection**: When the form loads, the server determines the user's approximate location based on their IP address
2. **Default Coordinates**: These coordinates are passed to the form as initial values
3. **Fallback Values**: If IP detection fails, the system uses default coordinates (Guyana: 6.809985, -58.166204)
4. **Map Initialization**: When the map loads, it centers on these initial coordinates

**Technical Implementation:**
- The IP geolocation happens on the server side (not in the map component)
- The detected coordinates are passed as props to the form component
- The form uses these as the initial state for `formData.latitude` and `formData.longitude`
- When the map toggles on, it receives these coordinates as `initialLat` and `initialLng` props

### 4.2. Interactive Location Selection Logic

**Click-to-Select Flow:**
1. **Event Capture**: User clicks anywhere on the map
2. **Coordinate Extraction**: Leaflet's `useMapEvents` hook captures the click event
3. **Coordinate Conversion**: The click event contains `latlng` object with latitude and longitude
4. **State Update**: `handleLocationSelect` function updates the component's `position` state
5. **Parent Notification**: The new coordinates are passed to the parent via `onLocationSelect` callback
6. **Form Update**: Parent component updates `formData` with new coordinates
7. **UI Update**: Input fields and coordinate display update to show new values

**Marker Dragging Flow:**
1. **Drag Start**: User begins dragging the purple marker
2. **Visual Feedback**: Marker follows mouse/touch movement
3. **Drag End**: When user releases the marker, `dragend` event fires
4. **Position Calculation**: Leaflet calculates the final position of the marker
5. **Coordinate Update**: Same flow as click-to-select (steps 4-7 above)

### 4.3. Map Controls Logic

**Zoom Controls:**
- **Button Zoom**: Standard +/- buttons in top-left corner
- **Mouse Wheel**: Scroll wheel zooms in/out at cursor position
- **Double-Click**: Double-click anywhere to zoom in one level
- **Zoom Limits**: Map is restricted to zoom levels 0-19 for performance

**Pan and Drag:**
- **Mouse Drag**: Click and drag to move the map view
- **Touch Drag**: On mobile, touch and drag to pan
- **Boundary Handling**: Map automatically handles edge cases and boundary limits

**Responsive Behavior:**
- **Desktop**: Full mouse and keyboard support
- **Mobile**: Touch-optimized controls, disabled scroll wheel zoom to prevent conflicts
- **Tablet**: Hybrid support for both touch and mouse interactions

---

## 5. Required Dependencies and Setup

### 5.1. Package Installation
```bash
pnpm add react-leaflet leaflet
pnpm add -D @types/leaflet
```

### 5.2. Public Assets Setup
Create the following files in `public/leaflet/`:
- `marker-icon.png`
- `marker-icon-2x.png` 
- `marker-shadow.png`

### 5.3. CSS Additions
```css
/* Add to globals.css */
.leaflet-container {
  font-family: inherit;
}

.custom-map-marker {
  background: transparent !important;
  border: none !important;
}

.leaflet-popup-content-wrapper {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.leaflet-control-zoom {
  border: none !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.leaflet-control-zoom a {
  background-color: white !important;
  color: #6a11cb !important;
  border: none !important;
  border-radius: 6px !important;
  margin: 2px !important;
}

.leaflet-control-zoom a:hover {
  background-color: #6a11cb !important;
  color: white !important;
}
```

---

## 6. Mobile Optimization

### 6.1. Touch and Gesture Support Logic

**Touch Event Handling:**
- **Tap Detection**: Single tap selects location (no double-tap zoom on mobile)
- **Touch Zoom**: Pinch gestures work natively with Leaflet
- **Drag Sensitivity**: Touch drag sensitivity is optimized for finger interaction
- **Marker Dragging**: Touch-friendly marker manipulation with larger hit areas

**Mobile-Specific Optimizations:**
- **Disabled Scroll Zoom**: Prevents conflicts with page scrolling
- **Touch Zoom Only**: Relies on pinch gestures for zooming
- **Larger Controls**: Zoom buttons are sized for touch interaction
- **Performance**: Reduced animation complexity for better mobile performance

### 6.2. Mobile-Specific Features
```tsx
// Mobile-optimized map settings
const mobileMapOptions = {
  tap: true,
  touchZoom: true,
  scrollWheelZoom: false, // Disable on mobile to prevent conflicts
  doubleClickZoom: true,
  dragging: true,
  zoomSnap: 0.5,
  zoomDelta: 0.5,
};
```

---

## 7. Performance Considerations

### 7.1. Lazy Loading Logic

**Dynamic Import Strategy:**
1. **Bundle Splitting**: Map component is dynamically imported to reduce initial bundle size
2. **Load on Demand**: Map only loads when user toggles the checkbox
3. **Caching**: Once loaded, the map component is cached for subsequent uses
4. **Memory Management**: Proper cleanup prevents memory leaks

**Implementation:**
```tsx
const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), {
  loading: () => <MapLoadingSkeleton />,
  ssr: false // Disable server-side rendering for map components
});
```

### 7.2. Memory Management Logic

**Cleanup Strategy:**
1. **Event Listeners**: All map event listeners are properly removed on component unmount
2. **Map Instance**: Map instance is destroyed to free memory
3. **Tile Cleanup**: Map tiles are cleared from memory
4. **State Reset**: Component state is reset to prevent stale data

### 7.3. Network Optimization Logic

**Tile Loading Strategy:**
1. **Tile Caching**: Browser caches map tiles for faster subsequent loads
2. **Retina Detection**: Automatically serves high-DPI tiles on retina displays
3. **Progressive Loading**: Tiles load progressively as user pans/zooms
4. **Connection Optimization**: Adapts tile quality based on connection speed

---

## 8. Accessibility Features

### 8.1. Keyboard Navigation Logic

**Focus Management:**
1. **Tab Order**: Logical tab order through all interactive elements
2. **Focus Indicators**: Clear visual focus indicators for keyboard users
3. **Keyboard Shortcuts**: Standard keyboard shortcuts for map controls
4. **Screen Reader**: Proper ARIA labels and descriptions

**Implementation Details:**
- Map container has proper `tabIndex` for keyboard focus
- Zoom controls are keyboard accessible
- Coordinate display is screen reader friendly
- Instructions are clearly labeled and accessible

### 8.2. Screen Reader Support Logic

**ARIA Implementation:**
1. **Landmark Roles**: Proper landmark roles for navigation
2. **Live Regions**: Coordinate updates are announced to screen readers
3. **Descriptive Labels**: All interactive elements have descriptive labels
4. **Status Updates**: Loading states and errors are announced

### 8.3. Visual Accessibility Logic

**Contrast and Visibility:**
1. **High Contrast**: Markers and controls meet WCAG contrast requirements
2. **Focus Indicators**: Clear focus indicators for all interactive elements
3. **Color Independence**: Information is not conveyed by color alone
4. **Text Scaling**: Interface works with browser text scaling

---

## 9. Error Handling

### 9.1. Map Loading Errors Logic

**Error Detection:**
1. **Network Failures**: Detect when map tiles fail to load
2. **API Errors**: Handle OpenStreetMap API failures
3. **Browser Compatibility**: Detect unsupported browsers
4. **Memory Issues**: Handle out-of-memory scenarios

**Fallback Strategy:**
1. **Graceful Degradation**: Fall back to manual coordinate entry
2. **User Notification**: Clear error messages explain the issue
3. **Retry Logic**: Automatic retry for transient failures
4. **Alternative UI**: Show alternative interface when map fails

```tsx
const handleMapError = (error: Error) => {
  console.error("Map loading error:", error);
  // Show user-friendly error message
  // Fallback to manual coordinate entry
};
```

### 9.2. Network Errors Logic

**Network Error Handling:**
1. **Timeout Detection**: Detect slow or failed network requests
2. **Retry Logic**: Automatic retry with exponential backoff
3. **Offline Support**: Handle offline scenarios gracefully
4. **User Feedback**: Clear communication about network status

```tsx
const handleNetworkError = (error: Error) => {
  console.error("Map network error:", error);
  // Show user-friendly error message
  // Fallback to manual coordinate entry
};
```

---

## 10. Implementation Checklist

### 10.1. Component Setup
- [ ] Install required dependencies (react-leaflet, leaflet)
- [ ] Create LocationPickerMap component
- [ ] Add marker icon assets to public folder
- [ ] Import and integrate in NewLocationModal

### 10.2. Styling and UI
- [ ] Add custom CSS for Leaflet components
- [ ] Implement responsive design
- [ ] Add loading states
- [ ] Style custom markers and controls

### 10.3. Functionality
- [ ] Implement click-to-select location
- [ ] Add marker dragging functionality
- [ ] Connect to form state management
- [ ] Handle IP-based initial location

### 10.4. Testing
- [ ] Test on desktop browsers
- [ ] Test on mobile devices
- [ ] Verify touch gestures work correctly
- [ ] Test error scenarios
- [ ] Validate accessibility features

### 10.5. Performance
- [ ] Verify dynamic import works
- [ ] Test map loading performance
- [ ] Optimize for different screen sizes
- [ ] Implement proper cleanup

---

**This implementation provides a focused, responsive, and accessible map interface that enhances the location selection experience in the New Location Modal with IP-based location detection and core map functionality.** 