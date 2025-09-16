import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// Type for collection data from machine's embedded collectionMetersHistory
type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number; // This maps to prevMetersIn from the embedded data
  prevOut: number; // This maps to prevMetersOut from the embedded data
  locationReportId: string;
};

type SortField = "timestamp" | "metersIn" | "metersOut" | "prevIn" | "prevOut";
type SortDirection = "asc" | "desc" | null;
type TimeFilter = "all" | "today" | "yesterday" | "7d" | "30d" | "90d" | "1y";

export function CollectionHistoryTable({ data }: { data: CollectionData[] }) {
  const router = useRouter();

  // State for filtering and sorting
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination (client-side) - must be before any early returns
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Apply time filter
    if (timeFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (timeFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          break;
        case "yesterday":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = new Date();
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = new Date();
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          endDate = new Date();
          break;
        case "1y":
          startDate = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          endDate = new Date();
          break;
        default:
          startDate = new Date(0);
          endDate = new Date();
      }

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate && itemDate < endDate;
      });
    }

    // Apply sorting
    if (sortField && sortDirection) {
      console.warn("Applying sort:", sortField, sortDirection, "on", filtered.length, "items");
      filtered.sort((a, b) => {
        let aValue: string | number | Date = a[sortField as keyof CollectionData];
        let bValue: string | number | Date = b[sortField as keyof CollectionData];

        // Debug logging
        if (filtered.length <= 3) { // Only log for small datasets to avoid spam
          console.warn("Sorting values:", { field: sortField, aValue, bValue, a, b });
        }

        // Handle undefined/null values
        if (aValue === undefined || aValue === null) aValue = 0;
        if (bValue === undefined || bValue === null) bValue = 0;

        // Handle timestamp comparison
        if (sortField === "timestamp") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle numeric comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Fallback: convert to string and compare
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [data, timeFilter, sortField, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedData.length / pageSize)
  );
  const paged = useMemo(
    () => filteredAndSortedData.slice((page - 1) * pageSize, page * pageSize),
    [filteredAndSortedData, page]
  );

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  // Handle column sorting
  const handleSort = (field: SortField) => {
    console.warn("Sorting by field:", field, "Current sort:", sortField, sortDirection);
    
    if (sortField === field) {
      // Cycle through: desc -> asc -> null (no sort)
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection(null);
      } else {
        setSortDirection("desc");
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1); // Reset to first page when sorting changes
  };

  // Get sort icon for a column
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="h-4 w-4" />;
    }
    if (sortDirection === "desc") {
      return <ChevronDown className="h-4 w-4" />;
    }
    return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
  };

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [timeFilter]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grayHighlight">
          No collection history data found for this machine.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Time Filter */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by time:</span>
          <Select
            value={timeFilter}
            onValueChange={(value: TimeFilter) => setTimeFilter(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedData.length} of {data.length} entries
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("timestamp")}
              >
                <div className="flex items-center gap-2">
                  Time
                  {getSortIcon("timestamp")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("metersIn")}
              >
                <div className="flex items-center gap-2">
                  Meters In
                  {getSortIcon("metersIn")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("metersOut")}
              >
                <div className="flex items-center gap-2">
                  Meters Out
                  {getSortIcon("metersOut")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("prevIn")}
              >
                <div className="flex items-center gap-2">
                  Prev. In
                  {getSortIcon("prevIn")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("prevOut")}
              >
                <div className="flex items-center gap-2">
                  Prev. Out
                  {getSortIcon("prevOut")}
                </div>
              </TableHead>
              <TableHead>Collection Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row) => (
              <TableRow key={row._id}>
                <TableCell>
                  {new Date(row.timestamp).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </TableCell>
                <TableCell>{row.metersIn?.toLocaleString()}</TableCell>
                <TableCell>{row.metersOut?.toLocaleString()}</TableCell>
                <TableCell>{row.prevIn?.toLocaleString()}</TableCell>
                <TableCell>{row.prevOut?.toLocaleString()}</TableCell>
                <TableCell>
                  {row.locationReportId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.warn(
                          "Navigating to collection report:",
                          row.locationReportId
                        );
                        router.push(
                          `/collection-report/report/${row.locationReportId}`
                        );
                      }}
                    >
                      VIEW REPORT
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-4 w-full">
        {paged.map((row) => (
          <Card key={row._id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Collection Entry</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(row.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Meters In:
                  </span>
                  <span className="font-medium">
                    {row.metersIn?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Meters Out:
                  </span>
                  <span className="font-medium">
                    {row.metersOut?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Prev. In:
                  </span>
                  <span className="font-medium">
                    {row.prevIn?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Prev. Out:
                  </span>
                  <span className="font-medium">
                    {row.prevOut?.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {new Date(row.timestamp).toLocaleString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
              {row.locationReportId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    console.warn(
                      "Navigating to collection report:",
                      row.locationReportId
                    );
                    router.push(
                      `/collection-report/report/${row.locationReportId}`
                    );
                  }}
                >
                  VIEW REPORT
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-6 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goFirst}
          disabled={page === 1}
        >
          {"<<"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={page === 1}
        >
          {"<"}
        </Button>
        <span className="px-2 text-sm">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={page === totalPages}
        >
          {">"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goLast}
          disabled={page === totalPages}
        >
          {">>"}
        </Button>
      </div>
    </div>
  );
}
