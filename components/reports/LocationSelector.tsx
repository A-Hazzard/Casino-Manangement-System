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
import { Monitor, AlertCircle, RefreshCw } from "lucide-react";
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

interface LocationSelectorProps {
  onLocationSelect: (locationIds: string[]) => void;
  selectedLocations: string[];
}

export default function LocationSelector({
  onLocationSelect,
  selectedLocations,
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/locations", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch locations");
      }

      const result = await response.json();
      const mappedLocations = (result.locations || []).map((loc: any) => ({
        _id: loc._id,
        name: loc.name,
        address: loc.address || {},
        sasEnabled: loc.sasEnabled || false,
      }));
      setLocations(mappedLocations);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch locations";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

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

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Locations
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchLocations} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
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
              options={locations.map((loc) => ({
                id: loc._id,
                name: loc.name,
                sasEnabled: loc.sasEnabled || false,
              }))}
              selectedIds={selectedLocations}
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
