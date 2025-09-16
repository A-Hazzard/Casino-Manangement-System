"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Plus } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import type { CabinetSortOption } from "@/lib/types/cabinets";

type CabinetsFiltersProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  locations: { _id: string; name: string }[];
  sortOption: CabinetSortOption;
  setSortOption: (option: CabinetSortOption) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  onAddCabinet: () => void;
  onAddMovementRequest: () => void;
  onUploadSmibData: () => void;
  loading: boolean;
};

export default function CabinetsFilters({
  searchTerm,
  setSearchTerm,
  selectedLocation,
  setSelectedLocation,
  locations,
  sortOption,
  setSortOption,
  sortOrder,
  setSortOrder,
  onAddCabinet,
  onAddMovementRequest,
  onUploadSmibData,
  loading,
}: CabinetsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Search and Filter Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search cabinets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 md:w-64"
            disabled={loading}
          />
        </div>

        {/* Location Filter */}
        <CustomSelect
          value={selectedLocation}
          onValueChange={setSelectedLocation}
          options={[
            { value: "all", label: "All Locations" },
            ...locations.map((location) => ({
              value: location._id,
              label: location.name,
            })),
          ]}
          placeholder="Select location"
          disabled={loading}
          className="md:w-48"
          searchable={true}
          emptyMessage="No locations found"
        />

        {/* Sort Options */}
        <CustomSelect
          value={sortOption}
          onValueChange={(value) => setSortOption(value as CabinetSortOption)}
          options={[
            { value: "moneyIn", label: "Money In" },
            { value: "gross", label: "Gross" },
            { value: "lastOnline", label: "Last Online" },
            { value: "locationName", label: "Location" },
            { value: "assetNumber", label: "Asset Number" },
          ]}
          placeholder="Sort by"
          disabled={loading}
          className="md:w-48"
          emptyMessage="No sort options found"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          disabled={loading}
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 md:flex-row">
        <Button
          onClick={onAddCabinet}
          className="flex items-center gap-2"
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          Add Cabinet
        </Button>
        <Button
          variant="outline"
          onClick={onAddMovementRequest}
          disabled={loading}
        >
          Movement Request
        </Button>
        <Button variant="outline" onClick={onUploadSmibData} disabled={loading}>
          Upload SMIB Data
        </Button>
      </div>
    </div>
  );
}
