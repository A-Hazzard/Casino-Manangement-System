"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, X, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationSelectorProps } from "@/lib/types/components";
import LocationMultiSelect from "@/components/ui/common/LocationMultiSelect";

type Location = {
  _id: string;
  name: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  sasEnabled?: boolean;
};

export default function LocationSelector({
  onLocationSelect,
  selectedLocations,
  maxSelections = 5,
  placeholder = "Select locations...",
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([
    {
      _id: "loc1",
      name: "Downtown Casino",
      address: {
        street: "123 Main St",
        city: "Las Vegas",
        state: "NV",
        country: "USA",
      },
      sasEnabled: true,
    },
    {
      _id: "loc2",
      name: "Strip Gaming Center",
      address: {
        street: "456 Casino Blvd",
        city: "Las Vegas",
        state: "NV",
        country: "USA",
      },
      sasEnabled: true,
    },
    {
      _id: "loc3",
      name: "Fremont Street Arcade",
      address: {
        street: "789 Fremont Ave",
        city: "Las Vegas",
        state: "NV",
        country: "USA",
      },
      sasEnabled: false,
    },
    {
      _id: "loc4",
      name: "Airport Gaming Lounge",
      address: {
        street: "321 Airport Rd",
        city: "Las Vegas",
        state: "NV",
        country: "USA",
      },
      sasEnabled: true,
    },
    {
      _id: "loc5",
      name: "Downtown Gaming Hub",
      address: {
        street: "654 Gaming St",
        city: "Las Vegas",
        state: "NV",
        country: "USA",
      },
      sasEnabled: false,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading locations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Location Selection
        </CardTitle>
        <CardDescription>
          Select specific locations to view comparison data or view all
          locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Locations
            </label>
            <LocationMultiSelect
              locations={locations.map((loc) => ({
                id: loc._id,
                name: loc.name,
                sasEnabled: loc.sasEnabled || false,
              }))}
              selectedLocations={selectedLocations}
              onSelectionChange={onLocationSelect}
              placeholder="Choose locations to compare..."
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => onLocationSelect([])}
              className="w-full"
            >
              Clear Selection
            </Button>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {selectedLocations.length > 0
                ? `${selectedLocations.length} location${
                    selectedLocations.length > 1 ? "s" : ""
                  } selected`
                : "Showing all locations"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
