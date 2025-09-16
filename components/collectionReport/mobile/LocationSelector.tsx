import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, ChevronRight } from "lucide-react";

type LocationSelectorProps = {
  locations: Array<{
    _id: string;
    name: string;
    address?: string;
    profitShare?: number;
    machines?: unknown[];
  }>;
  onLocationSelect: (location: {
    _id: string;
    name: string;
    address?: string;
    profitShare?: number;
    machines?: unknown[];
  }) => void;
  isLoading: boolean;
};

export function LocationSelector({
  locations,
  onLocationSelect,
  isLoading,
}: LocationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return locations;

    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);

  const handleLocationClick = (location: {
    _id: string;
    name: string;
    address?: string;
    profitShare?: number;
    machines?: unknown[];
  }) => {
    onLocationSelect(location);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-lg border border-gray-200 space-y-2"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Search Header */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Select Location
          </h2>
          <p className="text-sm text-gray-600">
            Choose a location to view its machines
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>

      {/* Locations List */}
      <div className="space-y-3">
        {filteredLocations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchTerm
                ? "No locations found matching your search"
                : "No locations available"}
            </p>
          </div>
        ) : (
          filteredLocations.map((location) => (
            <LocationCard
              key={location._id}
              location={location}
              onClick={() => handleLocationClick(location)}
            />
          ))
        )}
      </div>
    </div>
  );
}

type LocationCardProps = {
  location: {
    _id: string;
    name: string;
    address?: string;
    profitShare?: number;
    machines?: unknown[];
  };
  onClick: () => void;
};

function LocationCard({ location, onClick }: LocationCardProps) {
  const machineCount = location.machines?.length || 0;

  return (
    <Button
      variant="outline"
      className="w-full h-auto p-4 justify-start text-left hover:bg-gray-50 border-gray-200"
      onClick={onClick}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <h3 className="font-medium text-gray-900 truncate">
              {location.name}
            </h3>
          </div>

          {location.address && (
            <p className="text-sm text-gray-600 truncate mb-1">
              {location.address}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {machineCount} machine{machineCount !== 1 ? "s" : ""}
            </span>
            {location.profitShare && (
              <span>{location.profitShare}% profit share</span>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    </Button>
  );
}
