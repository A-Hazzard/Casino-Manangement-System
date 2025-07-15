# Reports Page - Locations Tab Navigation Panel

## Overview

This document provides a comprehensive explanation of the navigation panel design and implementation for the Locations tab in the Reports page. The navigation panel includes three main sections: **Overview**, **SAS Evaluation**, and **Revenue Analysis**.

## Table of Contents

1. [Design Architecture](#design-architecture)
2. [Navigation Panel Implementation](#navigation-panel-implementation)
3. [SAS Evaluation Section](#sas-evaluation-section)
4. [Revenue Analysis Section](#revenue-analysis-section)
5. [Component Dependencies](#component-dependencies)
6. [State Management](#state-management)
7. [Data Flow](#data-flow)
8. [Styling and UI Components](#styling-and-ui-components)

---

## Design Architecture

### Navigation Structure

The Locations tab uses a **three-tab navigation system** built with Radix UI Tabs:

```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="location-evaluation">SAS Evaluation</TabsTrigger>
    <TabsTrigger value="location-revenue">Revenue Analysis</TabsTrigger>
  </TabsList>
</Tabs>
```

### Design Principles

1. **Responsive Grid Layout**: Uses CSS Grid with `grid-cols-3` for equal tab distribution
2. **Consistent Styling**: Follows the design system with proper spacing and typography
3. **State Management**: Local state for tab switching with Zustand store integration
4. **Accessibility**: Built on Radix UI primitives for keyboard navigation and screen readers

---

## Navigation Panel Implementation

### Core Component Structure

**File**: `components/reports/tabs/LocationsTab.tsx`

```typescript
export default function LocationsTab() {
  const { isLoading, setLoading, selectedDateRange } = useReportsStore();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Tab switching logic
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Navigation Panel */}
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="location-evaluation">SAS Evaluation</TabsTrigger>
          <TabsTrigger value="location-revenue">Revenue Analysis</TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview">...</TabsContent>
        <TabsContent value="location-evaluation">...</TabsContent>
        <TabsContent value="location-revenue">...</TabsContent>
      </Tabs>
    </div>
  );
}
```

### Key Features

1. **Local State Management**: Uses `useState` for tab switching
2. **Store Integration**: Connects to `useReportsStore` for global state
3. **Loading States**: Handles loading states during data fetching
4. **Responsive Design**: Adapts to different screen sizes

---

## SAS Evaluation Section

### Purpose
The SAS Evaluation section tracks SAS (Slot Accounting System) machine performance with immediate soft meter data access.

### Implementation Details

#### Header Section
```typescript
<TabsContent value="location-evaluation" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Monitor className="h-5 w-5" />
        Location Evaluation Report - SAS Machine Performance
      </CardTitle>
      <CardDescription>
        Track SAS machine performance with immediate soft meter data access
      </CardDescription>
    </CardHeader>
```

#### Summary Cards
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <Card>
    <CardContent className="p-4">
      <div className="text-2xl font-bold text-green-600">
        {sasLocations.length}
      </div>
      <p className="text-sm text-muted-foreground">
        SAS-Enabled Locations
      </p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <div className="text-2xl font-bold text-blue-600">
        {sasLocations.reduce((sum, loc) => sum + loc.onlineMachines, 0)}
      </div>
      <p className="text-sm text-muted-foreground">
        SAS Machines Online
      </p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="p-4">
      <div className="text-2xl font-bold text-amber-600">
        ${sasLocations.reduce((sum, loc) => sum + loc.metrics.grossRevenue, 0).toLocaleString()}
      </div>
      <p className="text-sm text-muted-foreground">SAS Revenue</p>
    </CardContent>
  </Card>
</div>
```

#### Data Table
```typescript
<div className="rounded-md border">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="border-b bg-muted/50">
        <tr>
          <th className="text-left p-3 font-medium">Location</th>
          <th className="text-left p-3 font-medium">SAS Status</th>
          <th className="text-left p-3 font-medium">Online Machines</th>
          <th className="text-left p-3 font-medium">Real-time Revenue</th>
          <th className="text-left p-3 font-medium">Hold %</th>
          <th className="text-left p-3 font-medium">Performance</th>
        </tr>
      </thead>
      <tbody>
        {sampleLocations.map((location) => (
          <tr key={location.locationId} className="border-b hover:bg-muted/30">
            {/* Table row content */}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### Data Processing

#### SAS Location Filtering
```typescript
const sasLocations = useMemo(() => {
  return sampleLocations.filter((location) => location.sasEnabled);
}, []);
```

#### Key Metrics Displayed
- **SAS-Enabled Locations Count**: Total number of locations with SAS capability
- **SAS Machines Online**: Sum of online machines across SAS locations
- **SAS Revenue**: Total gross revenue from SAS-enabled locations
- **Real-time Performance**: Live data from soft meters
- **Hold Percentage**: Actual vs theoretical hold rates

---

## Revenue Analysis Section

### Purpose
The Revenue Analysis section tracks non-SAS machine performance with drop, cancelled credits, and gross revenue analysis.

### Complete Implementation

#### Main Revenue Analysis Tab Content
```typescript
<TabsContent value="location-revenue" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Location Revenue Report - Non-SAS Analysis
      </CardTitle>
      <CardDescription>
        Track non-SAS machine performance with drop, cancelled credits,
        and gross revenue analysis
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {/* Revenue Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {nonSasLocations.map((location) => (
            <Card key={location.locationId}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {location.locationName}
                  <Badge variant="secondary">Non-SAS</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Color-coded metrics */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      ${location.metrics.grossRevenue.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">
                      Gross Revenue
                    </div>
                    <div className="text-xs text-green-600">Green</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      ${location.metrics.totalDrop.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">Drop</div>
                    <div className="text-xs text-yellow-600">
                      Yellow
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-black">
                      $
                      {location.metrics.totalCancelledCredits.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">
                      Cancelled
                    </div>
                    <div className="text-xs text-black">Black</div>
                  </div>
                </div>

                {/* Hourly Revenue Graph */}
                <SimpleBarChart
                  data={location.hourlyRevenue}
                  title="24-Hour Revenue Pattern"
                />

                {/* Top 5 Machines */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Top 5 Performing Machines
                  </h4>
                  <div className="space-y-2">
                    {location.topMachines.map((machine, index) => (
                      <div
                        key={machine.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium">
                            {machine.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            ${machine.revenue.toLocaleString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {machine.hold}% hold
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Section */}
        <Card>
          <CardHeader>
            <CardTitle>Non-SAS Location Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  $
                  {nonSasLocations
                    .reduce(
                      (sum, loc) => sum + loc.metrics.grossRevenue,
                      0
                    )
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Gross Revenue
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  $
                  {nonSasLocations
                    .reduce(
                      (sum, loc) => sum + loc.metrics.totalDrop,
                      0
                    )
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Drop
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black">
                  $
                  {nonSasLocations
                    .reduce(
                      (sum, loc) =>
                        sum + loc.metrics.totalCancelledCredits,
                      0
                    )
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Cancelled Credits
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(
                    nonSasLocations.reduce(
                      (sum, loc) =>
                        sum + loc.metrics.actualHoldPercentage,
                      0
                    ) / nonSasLocations.length
                  ).toFixed(1)}
                  %
                </div>
                <p className="text-sm text-muted-foreground">
                  Average Hold
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

#### SimpleBarChart Component Implementation
```typescript
const SimpleBarChart = ({
  data,
  title,
}: {
  data: Array<{ hour: number; revenue: number }>;
  title: string;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">No data available</span>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  // Transform data for Recharts
  const chartData = data.map((item) => ({
    hour: `${item.hour}:00`,
    revenue: item.revenue,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs text-muted-foreground">
          Total: ${totalRevenue.toLocaleString()}
        </span>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              interval={5} // Show every 6th hour
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString()}`,
                "Revenue",
              ]}
              labelStyle={{ color: "#374151" }}
              contentStyle={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Peak: ${maxRevenue.toLocaleString()}</span>
        <span>
          Avg: ${Math.round(totalRevenue / data.length).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
```

### Sample Data Structure

#### Complete Sample Locations Data
```typescript
// Sample location data with enhanced fields for meeting requirements
const sampleLocations = [
  {
    locationId: "LOC001",
    locationName: "Main Casino Floor",
    sasEnabled: true, // SAS capability
    onlineMachines: 85,
    totalMachines: 90,
    metrics: {
      totalHandle: 1250000,
      totalWin: 108750,
      totalJackpots: 45000,
      totalGamesPlayed: 125000,
      actualHoldPercentage: 8.7,
      averageBetPerGame: 10.0,
      totalDrop: 875000, // Yellow color per meeting notes
      totalCancelledCredits: 65000, // Black color per meeting notes
      totalHandPaidCancelledCredits: 12000,
      totalWonCredits: 980000,
      voucherOut: 53000,
      moneyWon: 1025000,
      grossRevenue: 108750, // Green color per meeting notes
      netRevenue: 96750,
    },
    performance: "excellent" as const,
    coordinates: { lat: 40.7128, lng: -74.006 },
    topMachines: [
      { id: "MAC001", name: "Lucky Stars Deluxe", revenue: 15420, hold: 9.2 },
      { id: "MAC045", name: "Diamond Riches", revenue: 13890, hold: 8.9 },
      { id: "MAC023", name: "Golden Fortune", revenue: 12750, hold: 8.7 },
      { id: "MAC067", name: "Vegas Dreams", revenue: 11200, hold: 8.5 },
      { id: "MAC012", name: "Jackpot Express", revenue: 10980, hold: 8.4 },
    ],
    hourlyRevenue: [
      { hour: 0, revenue: 3200 },
      { hour: 1, revenue: 2800 },
      { hour: 2, revenue: 2400 },
      { hour: 3, revenue: 2100 },
      { hour: 4, revenue: 1900 },
      { hour: 5, revenue: 2200 },
      { hour: 6, revenue: 4500 },
      { hour: 7, revenue: 6200 },
      { hour: 8, revenue: 7800 },
      { hour: 9, revenue: 8900 },
      { hour: 10, revenue: 9200 },
      { hour: 11, revenue: 9800 },
      { hour: 12, revenue: 10200 },
      { hour: 13, revenue: 9800 },
      { hour: 14, revenue: 9500 },
      { hour: 15, revenue: 9200 },
      { hour: 16, revenue: 9800 },
      { hour: 17, revenue: 10500 },
      { hour: 18, revenue: 11200 },
      { hour: 19, revenue: 12800 },
      { hour: 20, revenue: 14200 },
      { hour: 21, revenue: 15800 },
      { hour: 22, revenue: 16200 },
      { hour: 23, revenue: 14800 },
    ],
  },
  {
    locationId: "LOC002",
    locationName: "VIP Gaming Area",
    sasEnabled: true,
    onlineMachines: 42,
    totalMachines: 45,
    metrics: {
      totalHandle: 890000,
      totalWin: 76230,
      totalJackpots: 32000,
      totalGamesPlayed: 89000,
      actualHoldPercentage: 8.6,
      averageBetPerGame: 10.0,
      totalDrop: 623000,
      totalCancelledCredits: 45000,
      totalHandPaidCancelledCredits: 8000,
      totalWonCredits: 698000,
      voucherOut: 37000,
      moneyWon: 730000,
      grossRevenue: 76230,
      netRevenue: 68230,
    },
    performance: "good" as const,
    coordinates: { lat: 40.7589, lng: -73.9851 },
    topMachines: [
      { id: "MAC078", name: "High Roller Elite", revenue: 18900, hold: 9.5 },
      { id: "MAC089", name: "Platinum Palace", revenue: 16800, hold: 9.1 },
      { id: "MAC091", name: "Diamond VIP", revenue: 14200, hold: 8.8 },
      { id: "MAC103", name: "Royal Fortune", revenue: 12500, hold: 8.6 },
      { id: "MAC115", name: "Executive Club", revenue: 11800, hold: 8.4 },
    ],
    hourlyRevenue: [
      { hour: 0, revenue: 2200 },
      { hour: 1, revenue: 1800 },
      { hour: 2, revenue: 1400 },
      { hour: 3, revenue: 1200 },
      { hour: 4, revenue: 1000 },
      { hour: 5, revenue: 1300 },
      { hour: 6, revenue: 2800 },
      { hour: 7, revenue: 3900 },
      { hour: 8, revenue: 4800 },
      { hour: 9, revenue: 5200 },
      { hour: 10, revenue: 5800 },
      { hour: 11, revenue: 6200 },
      { hour: 12, revenue: 6800 },
      { hour: 13, revenue: 6500 },
      { hour: 14, revenue: 6200 },
      { hour: 15, revenue: 5800 },
      { hour: 16, revenue: 6200 },
      { hour: 17, revenue: 7200 },
      { hour: 18, revenue: 8200 },
      { hour: 19, revenue: 9800 },
      { hour: 20, revenue: 10500 },
      { hour: 21, revenue: 11200 },
      { hour: 22, revenue: 10800 },
      { hour: 23, revenue: 9200 },
    ],
  },
  {
    locationId: "LOC003",
    locationName: "Sports Bar Gaming",
    sasEnabled: false, // Non-SAS location for Location Revenue Report
    onlineMachines: 28,
    totalMachines: 32,
    metrics: {
      totalHandle: 567000,
      totalWin: 45360,
      totalJackpots: 18000,
      totalGamesPlayed: 56700,
      actualHoldPercentage: 8.0,
      averageBetPerGame: 10.0,
      totalDrop: 396900,
      totalCancelledCredits: 28000,
      totalHandPaidCancelledCredits: 5000,
      totalWonCredits: 445000,
      voucherOut: 23000,
      moneyWon: 463000,
      grossRevenue: 45360,
      netRevenue: 40360,
    },
    performance: "average" as const,
    coordinates: { lat: 40.7282, lng: -73.7949 },
    topMachines: [
      { id: "MAC201", name: "Sports Supreme", revenue: 8900, hold: 8.2 },
      { id: "MAC215", name: "Championship Gold", revenue: 7800, hold: 8.0 },
      { id: "MAC223", name: "Victory Lane", revenue: 7200, hold: 7.9 },
      { id: "MAC235", name: "Trophy Hunter", revenue: 6800, hold: 7.8 },
      { id: "MAC247", name: "Game Winner", revenue: 6200, hold: 7.7 },
    ],
    hourlyRevenue: [
      { hour: 0, revenue: 1200 },
      { hour: 1, revenue: 800 },
      { hour: 2, revenue: 600 },
      { hour: 3, revenue: 400 },
      { hour: 4, revenue: 300 },
      { hour: 5, revenue: 500 },
      { hour: 6, revenue: 1200 },
      { hour: 7, revenue: 1800 },
      { hour: 8, revenue: 2200 },
      { hour: 9, revenue: 2800 },
      { hour: 10, revenue: 3200 },
      { hour: 11, revenue: 3600 },
      { hour: 12, revenue: 4200 },
      { hour: 13, revenue: 4800 },
      { hour: 14, revenue: 4500 },
      { hour: 15, revenue: 4200 },
      { hour: 16, revenue: 4800 },
      { hour: 17, revenue: 5500 },
      { hour: 18, revenue: 6200 },
      { hour: 19, revenue: 7200 },
      { hour: 20, revenue: 8200 },
      { hour: 21, revenue: 8800 },
      { hour: 22, revenue: 8200 },
      { hour: 23, revenue: 6800 },
    ],
  },
];
```

### Data Processing

#### Non-SAS Location Filtering
```typescript
const nonSasLocations = useMemo(() => {
  return sampleLocations.filter((location) => !location.sasEnabled);
}, []);
```

#### Color-Coded Metrics System
- **Green**: Gross Revenue (primary revenue metric)
- **Yellow**: Drop (total money inserted into machines)
- **Black**: Cancelled Credits (credits cancelled by players)

#### Exact Location Cards Rendered

**Sports Bar Gaming Card (Non-SAS Location):**
```typescript
<Card key="LOC003">
  <CardHeader>
    <CardTitle className="text-lg flex items-center justify-between">
      Sports Bar Gaming
      <Badge variant="secondary">Non-SAS</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Color-coded metrics */}
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div className="text-center">
        <div className="text-lg font-bold text-green-600">
          $45,360
        </div>
        <div className="text-muted-foreground">Gross Revenue</div>
        <div className="text-xs text-green-600">Green</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-yellow-600">
          $396,900
        </div>
        <div className="text-muted-foreground">Drop</div>
        <div className="text-xs text-yellow-600">Yellow</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-black">
          $28,000
        </div>
        <div className="text-muted-foreground">Cancelled</div>
        <div className="text-xs text-black">Black</div>
      </div>
    </div>

    {/* Hourly Revenue Graph */}
    <SimpleBarChart
      data={[
        { hour: 0, revenue: 1200 },
        { hour: 1, revenue: 800 },
        { hour: 2, revenue: 600 },
        // ... 24-hour data
        { hour: 23, revenue: 6800 },
      ]}
      title="24-Hour Revenue Pattern"
    />

    {/* Top 5 Machines */}
    <div>
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 text-yellow-500" />
        Top 5 Performing Machines
      </h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              1
            </span>
            <span className="font-medium">Sports Supreme</span>
          </div>
          <div className="text-right">
            <div className="font-medium text-green-600">$8,900</div>
            <div className="text-muted-foreground text-xs">8.2% hold</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              2
            </span>
            <span className="font-medium">Championship Gold</span>
          </div>
          <div className="text-right">
            <div className="font-medium text-green-600">$7,800</div>
            <div className="text-muted-foreground text-xs">8.0% hold</div>
          </div>
        </div>
        {/* ... 3 more machines */}
      </div>
    </div>
  </CardContent>
</Card>
```

#### Key Features of Revenue Analysis
1. **Location Cards**: Individual cards for each non-SAS location (Sports Bar Gaming)
2. **Color-Coded Metrics**: Visual distinction between revenue types
3. **Hourly Revenue Charts**: 24-hour revenue patterns using Recharts
4. **Top Performing Machines**: Ranked list of best-performing machines
5. **Summary Section**: Aggregated metrics across all non-SAS locations
6. **Responsive Design**: Adapts to different screen sizes
7. **Interactive Charts**: Hover tooltips and responsive chart containers

---

## Component Dependencies

### Required Imports

#### React and Hooks
```typescript
import { useState, useEffect, useMemo } from "react";
```

#### UI Components
```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
```

#### Icons
```typescript
import {
  MapPin,
  Download,
  BarChart3,
  Monitor,
  Wifi,
  WifiOff,
  Star,
  ExternalLink,
} from "lucide-react";
```

#### Charts
```typescript
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
```

#### Store and Utilities
```typescript
import { useReportsStore } from "@/lib/store/reportsStore";
import { ExportUtils } from "@/lib/utils/exportUtils";
import LocationMap from "@/components/reports/common/LocationMap";
```

### External Dependencies

#### Package Dependencies
```json
{
  "@radix-ui/react-tabs": "^1.0.0",
  "recharts": "^2.0.0",
  "lucide-react": "^0.263.0",
  "sonner": "^1.0.0"
}
```

#### Internal Dependencies
- `@/lib/store/reportsStore` - State management
- `@/lib/utils/exportUtils` - Export functionality
- `@/components/reports/common/LocationMap` - Interactive map component
- `@/components/ui/*` - UI component library

---

## State Management

### Local State
```typescript
const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
const [activeTab, setActiveTab] = useState("overview");
```

### Global State (Zustand Store)
```typescript
const { isLoading, setLoading, selectedDateRange } = useReportsStore();
```

### State Flow
1. **Tab Selection**: Local state manages active tab
2. **Loading States**: Global store manages loading indicators
3. **Data Filtering**: Local state filters locations based on SAS status
4. **Selection State**: Local state tracks selected locations for map interaction

---

## Data Flow

### Data Sources
1. **Sample Data**: Hardcoded location data for demonstration
2. **Store Integration**: Date range and loading states from global store
3. **Real-time Updates**: Simulated with setTimeout for loading states

### Data Processing Pipeline
```typescript
// 1. Filter SAS locations
const sasLocations = useMemo(() => {
  return sampleLocations.filter((location) => location.sasEnabled);
}, []);

// 2. Filter non-SAS locations
const nonSasLocations = useMemo(() => {
  return sampleLocations.filter((location) => !location.sasEnabled);
}, []);

// 3. Calculate summary metrics
const totalSasRevenue = sasLocations.reduce((sum, loc) => sum + loc.metrics.grossRevenue, 0);
const totalNonSasRevenue = nonSasLocations.reduce((sum, loc) => sum + loc.metrics.grossRevenue, 0);
```

### Export Functionality
```typescript
const handleExportLocationRevenue = async () => {
  try {
    const exportData = {
      title: "Location Revenue Report",
      subtitle: "Non-SAS machine revenue analysis with graphs and top performers",
      headers: [
        "Location ID",
        "Location Name",
        "SAS Status",
        "Gross Revenue",
        "Drop",
        "Cancelled Credits",
        "Net Revenue",
        "Hold %",
        "Online/Total Machines",
        "Top Machine",
      ],
      data: sampleLocations.map((location) => [
        location.locationId,
        location.locationName,
        location.sasEnabled ? "SAS Enabled" : "Non-SAS",
        `$${location.metrics.grossRevenue.toLocaleString()}`,
        `$${location.metrics.totalDrop.toLocaleString()}`,
        `$${location.metrics.totalCancelledCredits.toLocaleString()}`,
        `$${location.metrics.netRevenue.toLocaleString()}`,
        `${location.metrics.actualHoldPercentage.toFixed(1)}%`,
        `${location.onlineMachines}/${location.totalMachines}`,
        location.topMachines[0].name,
      ]),
    };
    
    await ExportUtils.exportToExcel(exportData);
    toast.success("Location revenue report exported successfully!");
  } catch (error) {
    toast.error("Failed to export report");
  }
};
```

---

## Styling and UI Components

### CSS Classes Used

#### Layout Classes
- `space-y-6` - Vertical spacing between sections
- `grid w-full grid-cols-3` - Three-column grid for tabs
- `grid grid-cols-1 md:grid-cols-3 gap-4` - Responsive grid for summary cards
- `grid grid-cols-1 lg:grid-cols-2 gap-6` - Responsive grid for location cards

#### Color Classes
- `text-green-600` - Green color for gross revenue
- `text-yellow-600` - Yellow color for drop
- `text-black` - Black color for cancelled credits
- `text-blue-600` - Blue color for online machines
- `text-amber-600` - Amber color for SAS revenue

#### Interactive Classes
- `hover:bg-muted/30` - Hover effect for table rows
- `hover:shadow-lg hover:scale-[1.02]` - Hover effects for location cards
- `transition-all duration-200` - Smooth transitions

### Responsive Design

#### Mobile-First Approach
- Single column layout on mobile devices
- Multi-column grid on larger screens
- Collapsible navigation on small screens

#### Breakpoint Strategy
- `md:` - Medium screens and up (768px+)
- `lg:` - Large screens and up (1024px+)
- `xl:` - Extra large screens and up (1280px+)

### Accessibility Features

#### Keyboard Navigation
- Tab navigation support through Radix UI
- Focus management for interactive elements
- Screen reader compatibility

#### ARIA Attributes
- Proper labeling for interactive elements
- Descriptive text for icons and buttons
- Semantic HTML structure

---

## Summary

The Locations tab navigation panel provides a comprehensive interface for analyzing casino location performance through three distinct views:

1. **Overview**: General location performance with interactive map
2. **SAS Evaluation**: Focused analysis of SAS-enabled machines with real-time data
3. **Revenue Analysis**: Detailed breakdown of non-SAS machine revenue with color-coded metrics

The implementation follows modern React patterns with proper state management, responsive design, and accessibility considerations. The color-coded metric system (Green for Gross Revenue, Yellow for Drop, Black for Cancelled Credits) provides intuitive visual feedback for users analyzing casino performance data. 