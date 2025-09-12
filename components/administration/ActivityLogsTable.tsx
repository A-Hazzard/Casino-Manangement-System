"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils/formatting";
import ActivityLogsSearchBar from "./ActivityLogsSearchBar";
import ActivityLogCard from "./ActivityLogCard";
import ActivityLogCardSkeleton from "./ActivityLogCardSkeleton";
import ActivityLogDescriptionDialog from "./ActivityLogDescriptionDialog";
import { DatePicker } from "@/components/ui/date-picker";

interface ActivityLog {
  _id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  details?: string;
  description?: string;
  actor?: {
    id: string;
    email: string;
    role: string;
  };
  ipAddress?: string;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

interface ActivityLogsTableProps {
  className?: string;
}

const ActivityLogsTable: React.FC<ActivityLogsTableProps> = ({ className }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"username" | "email" | "description">("username");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  // Sort states
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialog states
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch activity logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        sortBy,
        sortOrder,
      });

      if (debouncedSearchTerm) {
        if (searchMode === "username") {
          params.append("username", debouncedSearchTerm);
        } else if (searchMode === "email") {
          params.append("email", debouncedSearchTerm);
        } else {
          params.append("search", debouncedSearchTerm);
        }
      }
      if (actionFilter && actionFilter !== "all") params.append("action", actionFilter);
      if (resourceFilter && resourceFilter !== "all") params.append("resource", resourceFilter);
      if (dateFilter) {
        // Set start of the selected day
        const selectedDate = new Date(dateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        params.append("startDate", selectedDate.toISOString());
        
        // Set end of the selected day
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append("endDate", endDate.toISOString());
        
        console.warn("Date filter applied:", {
          original: dateFilter.toISOString(),
          startDate: selectedDate.toISOString(),
          endDate: endDate.toISOString()
        });
      }

      const url = `/api/activity-logs?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
        setHasNextPage(data.data.pagination.hasNextPage);
        setHasPrevPage(data.data.pagination.hasPrevPage);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearchTerm,
    searchMode,
    actionFilter,
    resourceFilter,
    dateFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      case "view":
        return "outline";
      default:
        return "outline";
    }
  };

  // Get resource badge variant
  const getResourceBadgeVariant = (resource: string) => {
    switch (resource) {
      case "user":
        return "default";
      case "machine":
        return "secondary";
      case "location":
        return "outline";
      case "collection":
        return "destructive";
      case "licensee":
        return "default";
      case "member":
        return "secondary";
      case "session":
        return "outline";
      default:
        return "outline";
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setActionFilter("all");
    setResourceFilter("all");
    setDateFilter(undefined);
    setCurrentPage(1);
  };

  // Handle description click
  const handleDescriptionClick = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsDescriptionDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDescriptionDialogOpen(false);
    setSelectedLog(null);
  };


  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs ({totalCount.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <ActivityLogsSearchBar
            searchValue={searchTerm}
            setSearchValue={setSearchTerm}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            searchDropdownOpen={searchDropdownOpen}
            setSearchDropdownOpen={setSearchDropdownOpen}
          />

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="machine">Machine</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="collection">Collection</SelectItem>
                <SelectItem value="licensee">Licensee</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="session">Session</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <DatePicker
                date={dateFilter}
                setDate={setDateFilter}
                disabled={loading}
              />
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block border rounded-lg">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("timestamp")}
                      className="h-auto p-0 font-semibold"
                    >
                      Timestamp
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead centered>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("username")}
                      className="h-auto p-0 font-semibold"
                    >
                      User
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead centered>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("action")}
                      className="h-auto p-0 font-semibold"
                    >
                      Action
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead centered>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("resource")}
                      className="h-auto p-0 font-semibold"
                    >
                      Resource
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead centered>Description</TableHead>
                  <TableHead centered>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell centered>
                      <div>
                        {searchMode === "email" ? (
                          <>
                            <div className="font-medium">{log.actor?.email || "N/A"}</div>
                            {log.username && (
                              <div className="text-sm text-gray-500">
                                {log.username}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-medium">{log.username}</div>
                            {log.actor?.email && (
                              <div className="text-sm text-gray-500">
                                {log.actor.email}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell centered>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell centered>
                      <Badge variant={getResourceBadgeVariant(log.resource)}>
                        {log.resource}
                      </Badge>
                    </TableCell>
                    <TableCell centered className="max-w-xs">
                      <button
                        onClick={() => handleDescriptionClick(log)}
                        className="truncate text-left hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                        title="Click to view full description"
                      >
                        {log.description || log.details || "No description"}
                      </button>
                    </TableCell>
                    <TableCell centered className="font-mono text-sm">
                      {log.ipAddress || "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden space-y-4 px-1">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <ActivityLogCardSkeleton key={i} />
              ))
            ) : (
              logs.map((log) => (
                <ActivityLogCard
                  key={log._id}
                  log={log}
                  searchMode={searchMode}
                  onDescriptionClick={handleDescriptionClick}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={!hasPrevPage}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={!hasNextPage}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description Dialog */}
      <ActivityLogDescriptionDialog
        isOpen={isDescriptionDialogOpen}
        onClose={handleDialogClose}
        log={selectedLog}
        searchMode={searchMode}
      />
    </div>
  );
};

export default ActivityLogsTable;
