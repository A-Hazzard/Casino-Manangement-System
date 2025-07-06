# Prompt for Implementing Online/Offline Machine Indicator

This prompt will guide you to implement a feature that displays the total number of online and offline machines on the dashboard.

## 1. System Overview

The feature consists of a UI component (`OnlineOfflineIndicator`) that fetches its own data from a dedicated API endpoint (`/api/locationAggregation`). The component is displayed on the main dashboard page.

Here is the breakdown of the files and logic involved:

-   **`app/page.tsx`**: The main entry point for the dashboard, which includes the layout.
-   **`components/layout/PcLayout.tsx`**: The layout component where the indicator is placed.
-   **`components/ui/OnlineOfflineIndicator.tsx`**: The core UI component for displaying the machine status.
-   **`lib/helpers/locations.ts`**: Contains the helper function to fetch data from the API.
-   **`lib/store/dashboardStore.ts`**: A Zustand store for managing dashboard state, including filters.
-   **`lib/types/components.ts`**: Contains the type definitions for the component props and data structures.
-   **`app/api/locationAggregation/route.ts`**: The API endpoint that provides the data.

## 2. Step-by-Step Implementation

### Step 2.1: Create the Type Definition

In `lib/types/components.ts`, add the following type definitions for the `OnlineOfflineIndicator` component and its data:

```typescript
// OnlineOfflineIndicator types
export type LocationMetrics = {
  onlineMachines?: number;
  totalMachines?: number;
};

export type OnlineOfflineIndicatorProps = {
  className?: string;
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
};
```

### Step 2.2: Create the API Helper Function

In `lib/helpers/locations.ts`, create a new function `fetchLocationMetricsForMap` to call the API endpoint.

```typescript
import axios from "axios";

/**
 * Fetches location metrics for map display, including machine counts and financial data.
 *
 * @param timePeriod - The time period to fetch data for.
 * @param licencee - (Optional) Licencee filter.
 * @returns Promise resolving to location metrics array with machine and financial data.
 */
export async function fetchLocationMetricsForMap(
  timePeriod: string,
  licencee?: string
) {
  try {
    const url =
      `/api/locationAggregation?timePeriod=${timePeriod}` +
      (licencee ? `&licencee=${licencee}` : "");

    const response = await axios.get(url);

    if (!response.data) {
      console.error("No data returned from locations API");
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching location data:", error);
    return [];
  }
}
```

### Step 2.3: Create the `OnlineOfflineIndicator` Component

Create a new file `components/ui/OnlineOfflineIndicator.tsx` and add the following code. This component will fetch and display the machine status.

```tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { fetchLocationMetricsForMap } from "@/lib/helpers/locations";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import type {
  LocationMetrics,
  OnlineOfflineIndicatorProps,
} from "@/lib/types/components";

export default function OnlineOfflineIndicator({
  className = "",
  showTitle = false,
  size = "md",
}: OnlineOfflineIndicatorProps) {
  const [onlineMachines, setOnlineMachines] = useState(0);
  const [offlineMachines, setOfflineMachines] = useState(0);
  const [loading, setLoading] = useState(true);
  const { activeMetricsFilter, selectedLicencee } = useDashBoardStore();

  useEffect(() => {
    const fetchMachineStats = async () => {
      setLoading(true);
      try {
        const locationMetrics = await fetchLocationMetricsForMap(
          activeMetricsFilter,
          selectedLicencee
        );

        // Calculate total online and offline machines across all locations
        const totalOnline = locationMetrics.reduce(
          (sum: number, location: LocationMetrics) =>
            sum + (location.onlineMachines || 0),
          0
        );
        const totalMachines = locationMetrics.reduce(
          (sum: number, location: LocationMetrics) =>
            sum + (location.totalMachines || 0),
          0
        );
        const totalOffline = totalMachines - totalOnline;

        setOnlineMachines(totalOnline);
        setOfflineMachines(totalOffline);
      } catch {
        // Handle error silently for now - could implement proper error reporting
        setOnlineMachines(0);
        setOfflineMachines(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMachineStats();
  }, [activeMetricsFilter, selectedLicencee]);

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: "gap-1",
          badge: "px-2 py-0.5 text-xs",
          dot: "w-1.5 h-1.5",
          loading: "h-6 w-16",
        };
      case "lg":
        return {
          container: "gap-3",
          badge: "px-4 py-2 text-base",
          dot: "w-3 h-3",
          loading: "h-10 w-24",
        };
      default: // md
        return {
          container: "gap-2",
          badge: "px-3 py-1 text-sm",
          dot: "w-2 h-2",
          loading: "h-8 w-20",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (loading) {
    return (
      <div
        className={`flex items-center ${sizeClasses.container} ${className}`}
      >
        <div
          className={`${sizeClasses.loading} bg-gray-200 rounded-full animate-pulse`}
        ></div>
        <div
          className={`${sizeClasses.loading} bg-gray-200 rounded-full animate-pulse`}
        ></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`flex items-center gap-4 ${sizeClasses.container}`}>
        {showTitle && (
          <div className="flex items-center gap-2">
            <Image
              src="/cabinetsIcon.svg"
              alt="Cabinets Icon"
              width={28}
              height={28}
            />
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Machine Status
            </h3>
          </div>
        )}
        <div className={`flex items-center ${sizeClasses.container}`}>
          <Badge
            variant="outline"
            className={`bg-green-50 text-green-700 border-green-300 font-medium ${sizeClasses.badge}`}
          >
            <div
              className={`${sizeClasses.dot} bg-green-500 rounded-full mr-2`}
            ></div>
            {onlineMachines.toLocaleString()} Online
          </Badge>
          <Badge
            variant="outline"
            className={`bg-red-50 text-red-700 border-red-300 font-medium ${sizeClasses.badge}`}
          >
            <div
              className={`${sizeClasses.dot} bg-red-500 rounded-full mr-2`}
            ></div>
            {offlineMachines.toLocaleString()} Offline
          </Badge>
        </div>
      </div>
    </div>
  );
}
```

### Step 2.4: Integrate into the Layout

In `components/layout/PcLayout.tsx`, import and add the `OnlineOfflineIndicator` component above the `MapPreview`.

```tsx
// ... other imports
import OnlineOfflineIndicator from "@/components/ui/OnlineOfflineIndicator";


// ... inside the PcLayout component's return statement

              {/* Online/Offline Machines Indicator */}
              <div className="mb-4">
                <OnlineOfflineIndicator
                  showTitle={true}
                  size="lg"
                  className="bg-container p-4 rounded-lg shadow-md"
                />
              </div>

              <MapPreview
                chartData={props.chartData}
                gamingLocations={props.gamingLocations}
              />
// ...
```

### Step 2.5: Ensure the API Endpoint Exists

Make sure you have an API route at `app/api/locationAggregation/route.ts` that can handle requests and return data in the format of `LocationMetrics[]`. The backend should perform the necessary database queries to calculate `onlineMachines` and `totalMachines` for each location based on the `timePeriod` and `licencee` filters.

This prompt provides all the necessary frontend code and structure. You will need to ensure the backend API is functioning correctly. 