"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Monitor,
  Search,
} from "lucide-react";
import { useReportsStore } from "@/lib/store/reportsStore";
import { exportData } from "@/lib/utils/exportUtils";
import LocationMultiSelect from "@/components/ui/common/LocationMultiSelect";
import { Input } from "@/components/ui/input";
import type {
  MetersReportData,
  MetersReportResponse,
} from "@/shared/types/meters";

export default function MetersTab() {
  const [metersData, setMetersData] = useState<MetersReportData[]>([]);
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationLoading, setPaginationLoading] = useState(false);

  const { selectedDateRange } = useReportsStore();
  const locationsInitialized = useRef(false);

  // Handle page change
  const handlePageChange = (page: number) => {
    setPaginationLoading(true);
    setCurrentPage(page);
    fetchMetersData(page, searchTerm).finally(() => {
      setPaginationLoading(false);
    });
  };

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
    fetchMetersData(1, value);
  };

  // Fetch all data for export (without pagination)
  const fetchAllDataForExport = useCallback(
    async (search: string = "") => {
      if (selectedLocations.length === 0) {
        return [];
      }

      try {
        const params = new URLSearchParams({
          locations: selectedLocations.join(","),
          startDate: selectedDateRange.start.toISOString(),
          endDate: selectedDateRange.end.toISOString(),
          page: "1",
          limit: "10000", // Large limit to get all data
          search: search,
        });

        const response = await axios.get<MetersReportResponse>(
          `/api/reports/meters?${params}`
        );
        return response.data.data;
      } catch (err: any) {
        console.error("Error fetching all data for export:", err);
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          "Failed to load export data";
        toast.error(errorMessage);
        return [];
      }
    },
    [selectedLocations, selectedDateRange]
  );

  // Fetch locations data
  const fetchLocations = useCallback(async () => {
    try {
      console.log("Fetching locations...");
      const response = await axios.get("/api/locations");
      console.log("Locations API response:", response.data);

      const locationsData = response.data.locations || [];
      const mappedLocations = locationsData.map((loc: any) => ({
        id: loc._id,
        name: loc.name,
        sasEnabled: loc.sasEnabled || false, // Default to false if not available
      }));

      console.log("Mapped locations:", mappedLocations);
      setLocations(mappedLocations);
    } catch (err: any) {
      console.error("Error fetching locations:", err);
      const errorMessage =
        err.response?.data?.error || err.message || "Failed to load locations";
      toast.error(errorMessage);
    }
  }, []);

  // Fetch meters data
  const fetchMetersData = useCallback(
    async (page: number = 1, search: string = "") => {
      if (selectedLocations.length === 0) {
        setMetersData([]);
        setHasData(false);
        setTotalCount(0);
        setTotalPages(1);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          locations: selectedLocations.join(","),
          startDate: selectedDateRange.start.toISOString(),
          endDate: selectedDateRange.end.toISOString(),
          page: page.toString(),
          limit: "10",
          search: search,
        });

        console.log("Fetching meters data with params:", {
          locations: selectedLocations.join(","),
          startDate: selectedDateRange.start.toISOString(),
          endDate: selectedDateRange.end.toISOString(),
          page,
          limit: 10,
          search,
        });

        const response = await axios.get<MetersReportResponse>(
          `/api/reports/meters?${params}`
        );
        console.log("Meters API response:", response.data);

        setMetersData(response.data.data);
        setHasData(response.data.data.length > 0);
        setTotalCount(response.data.totalCount);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.currentPage);
      } catch (err: any) {
        console.error("Error fetching meters data:", err);
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          "Failed to load meters data";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [selectedLocations, selectedDateRange]
  );

  // Handle export
  const handleExport = async () => {
    if (selectedLocations.length === 0) {
      toast.error("Please select at least one location to export");
      return;
    }

    const selectedLocationNames = locations
      .filter((loc) => selectedLocations.includes(loc.id))
      .map((loc) => loc.name);

    // Show loading toast
    const loadingToast = toast.loading("Preparing export data...");

    try {
      // Fetch all data for the selected locations
      const allData = await fetchAllDataForExport(searchTerm);

      if (allData.length === 0) {
        toast.error("No data found for export");
        return;
      }

      const exportConfig = {
        title: "Meters Report",
        subtitle: `Data for ${
          selectedLocationNames.length
        } location(s): ${selectedLocationNames.join(", ")}${
          searchTerm ? ` (Filtered by: "${searchTerm}")` : ""
        }`,
        headers: [
          "Machine ID",
          "Location",
          "Meters In",
          "Money Won",
          "Jackpot",
          "Bill In",
          "Voucher Out",
          "Att. Paid Credits",
          "Games Played",
          "Date",
        ],
        data: allData.map((item) => [
          `"${item.machineId}"`, // Wrap in quotes to prevent Excel formula interpretation
          `"${item.location}"`,
          item.metersIn.toString(), // Remove toLocaleString() to prevent Excel formatting issues
          item.metersOut.toString(),
          item.jackpot.toString(),
          item.billIn.toString(),
          item.voucherOut.toString(),
          item.attPaidCredits.toString(),
          item.gamesPlayed.toString(),
          `"${new Date(item.createdAt).toLocaleDateString()}"`, // Wrap date in quotes
        ]),
        summary: [
          { label: "Total Records", value: allData.length.toString() },
          {
            label: "Selected Locations",
            value: selectedLocationNames.length.toString(),
          },
          {
            label: "Date Range",
            value: `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`,
          },
          ...(searchTerm
            ? [{ label: "Search Filter", value: searchTerm }]
            : []),
        ],
        metadata: {
          generatedBy: "Meters Report",
          generatedAt: new Date().toISOString(),
          dateRange: `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`,
          locations: selectedLocationNames.join(", "),
        },
      };

      await exportData(exportConfig);
      toast.success(`Successfully exported ${allData.length} records`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Load locations on mount
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Auto-select all locations when locations are first loaded
  useEffect(() => {
    if (locations.length > 0 && !locationsInitialized.current) {
      setSelectedLocations(locations.map((loc) => loc.id));
      locationsInitialized.current = true;
    }
  }, [locations]);

  // Fetch meters data when locations or date range changes
  useEffect(() => {
    if (selectedLocations.length > 0) {
      fetchMetersData(1, "");
    }
  }, [selectedLocations, selectedDateRange, fetchMetersData]);

  // Skeleton loader component
  const MetersTableSkeleton = () => (
    <div className="space-y-4">
      {/* Desktop Skeleton */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[...Array(10)].map((_, index) => (
                  <th key={index} className="px-4 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {[...Array(10)].map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="lg:hidden space-y-4">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(7)].map((_, metricIndex) => (
                <div key={metricIndex} className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Meters Report Dashboard
          </h3>
          <p className="text-sm text-gray-600">
            Monitor meter readings and financial data by location with
            comprehensive filtering
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Date Range: {selectedDateRange.start.toLocaleDateString()} -{" "}
            {selectedDateRange.end.toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchMetersData(currentPage, searchTerm)}
            disabled={loading || selectedLocations.length === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={metersData.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Location Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Location Selection & Controls
          </CardTitle>
          <CardDescription>
            Select specific locations to filter data or view all locations
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
                  id: loc.id,
                  name: loc.name,
                  sasEnabled: loc.sasEnabled,
                }))}
                selectedIds={selectedLocations}
                onSelectionChange={setSelectedLocations}
                placeholder="Choose locations to filter..."
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setSelectedLocations([])}
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

      {/* Data Display */}
      {selectedLocations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Locations Selected
            </h3>
            <p className="text-gray-600">
              Please select one or more locations above to view meters data.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Meters Data
            </CardTitle>
            <CardDescription>
              Loading meters data for selected locations...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetersTableSkeleton />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading Data
            </h3>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Data Found
            </h3>
            <p className="text-gray-600">
              No meters data found for the selected locations and date range.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Meters Data Table
              </CardTitle>
              <Badge variant="secondary">{metersData.length} records</Badge>
            </div>
            <CardDescription>
              Comprehensive meter readings with financial data and machine
              performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search bar for table */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by Machine ID or Location..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Showing {metersData.length} of {totalCount} records
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </p>
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Machine ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meters In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Money Won
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jackpot
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Voucher Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Att. Paid Credits
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Games Played
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metersData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {item.machineId}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.location}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.metersIn.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.metersOut.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.jackpot.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.billIn.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.voucherOut.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.attPaidCredits.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.gamesPlayed.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {metersData.map((item, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-sm font-mono font-medium text-gray-900 truncate">
                        {item.machineId}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {item.location}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Meters In</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.metersIn.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Money Won</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.metersOut.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Jackpot</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.jackpot.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bill In</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.billIn.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Voucher Out</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.voucherOut.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Att. Paid Credits</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.attPaidCredits.toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Games Played</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.gamesPlayed.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({totalCount} total
                  records)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || paginationLoading}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || paginationLoading}
                  >
                    Previous
                  </Button>
                  <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                    {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || paginationLoading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || paginationLoading}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
