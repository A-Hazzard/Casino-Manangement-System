"use client";

import { Button } from "@/components/ui/button";
import { Search, Filter, ChevronDown } from "lucide-react";
import { SESSION_SORT_OPTIONS } from "@/lib/constants/sessions";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";

type SessionsFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (field: string) => void;
};

/**
 * Sessions Filters Component
 * Handles search, sorting, and date filtering for sessions
 */
export default function SessionsFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
}: SessionsFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Date Filters */}
      <div>
        <DashboardDateFilters />
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by player name, machine ID, or session ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SESSION_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Sort Order Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortChange(sortBy)}
              className="flex items-center space-x-1"
            >
              <span>{sortOrder === "desc" ? "↓" : "↑"}</span>
              <span className="hidden sm:inline">
                {sortOrder === "desc" ? "Desc" : "Asc"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
