"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Plus } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CabinetSortOption } from "@/lib/hooks/data";

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
        <Select
          value={selectedLocation}
          onValueChange={setSelectedLocation}
          disabled={loading}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location._id} value={location._id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Options */}
        <Select
          value={sortOption}
          onValueChange={(value) => setSortOption(value as CabinetSortOption)}
          disabled={loading}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="moneyIn">Money In</SelectItem>
            <SelectItem value="gross">Gross</SelectItem>
            <SelectItem value="lastOnline">Last Online</SelectItem>
            <SelectItem value="locationName">Location</SelectItem>
            <SelectItem value="assetNumber">Asset Number</SelectItem>
          </SelectContent>
        </Select>


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

        <Button
          variant="outline"
          onClick={onUploadSmibData}
          disabled={loading}
        >
          Upload SMIB Data
        </Button>
      </div>
    </div>
  );
}
