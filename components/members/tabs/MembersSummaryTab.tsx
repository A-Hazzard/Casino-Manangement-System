"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  Eye,
  Download,
  Users,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import MemberDetailsModal from "@/components/members/MemberDetailsModal";
import { formatPhoneNumber } from "@/lib/utils/phoneFormatter";
import { motion } from "framer-motion";
import axios from "axios";
import type {
  MemberSummary,
  SummaryStats,
  Location,
} from "@/shared/types/entities";
import type { PaginationInfo } from "@/shared/types/reports";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function MembersSummaryTab() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const {
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();

  // Fetch locations for the filter dropdown
  const fetchLocations = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      const response = await axios.get(`/api/machines/locations?${params}`);
      const data = response.data;
      if (data.locations && Array.isArray(data.locations)) {
        setLocations(data.locations);
      } else {
        console.error("Failed to fetch locations:", data);
        setLocations([]);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const fetchMembersSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });

      // Add search term
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      // Add location filter
      if (locationFilter && locationFilter !== "all") {
        params.append("location", locationFilter);
      }

      // Add date filtering
      let dateFilter = "all";
      if (
        activeMetricsFilter === "Custom" &&
        customDateRange?.startDate &&
        customDateRange?.endDate
      ) {
        dateFilter = "custom";
        const sd =
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate as string);
        const ed =
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate as string);
        params.append("startDate", sd.toISOString());
        params.append("endDate", ed.toISOString());
      } else if (activeMetricsFilter && activeMetricsFilter !== "Today") {
        // Map frontend values to backend expected values
        const dateFilterMap: Record<string, string> = {
          Yesterday: "yesterday",
          "7d": "week",
          "30d": "month",
          "All Time": "all",
        };
        dateFilter =
          dateFilterMap[activeMetricsFilter] ||
          activeMetricsFilter.toLowerCase();
      }
      params.append("dateFilter", dateFilter);
      params.append("filterBy", "lastLogin"); // Add this to filter by last login date

      const response = await axios.get(`/api/members/summary?${params}`);
      const data = response.data;

      setMembers(data.data.members);
      setSummaryStats(data.data.summary);
      setPagination(data.data.pagination);
    } catch (err) {
      console.error("❌ Members Summary Page Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to fetch members summary");
    } finally {
      setLoading(false);
    }
  }, [
    activeMetricsFilter,
    customDateRange,
    searchTerm,
    locationFilter,
    currentPage,
  ]);

  useEffect(() => {
    fetchMembersSummary();
  }, [fetchMembersSummary]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, locationFilter, activeMetricsFilter, customDateRange]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleLocationFilter = (value: string) => {
    setLocationFilter(value);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleViewMember = (member: MemberSummary) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleViewSessions = (memberId: string) => {
    router.push(`/members/${memberId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    if (pagination) {
      setCurrentPage(pagination.totalPages);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1:
            return "st";
          case 2:
            return "nd";
          case 3:
            return "rd";
          default:
            return "th";
        }
      };

      return `${month} ${day}${getOrdinalSuffix(day)} ${year}`;
    } catch {
      return "Invalid Date";
    }
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1:
            return "st";
          case 2:
            return "nd";
          case 3:
            return "rd";
          default:
            return "th";
        }
      };

      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      return `${month} ${day}${getOrdinalSuffix(day)} ${year} at ${timeString}`;
    } catch {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const exportToCSV = () => {
    if (members.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Full Name",
      "Address",
      "Phone",
      "Last Login",
      "Joined",
      "Location",
      "Win/Loss",
    ];
    const csvData = members.map((member) => [
      member.fullName,
      member.address || "-",
      formatPhoneNumber(member.phoneNumber),
      formatDateTime(member.lastLogin),
      formatDate(member.createdAt),
      member.locationName,
      formatCurrency(member.winLoss || 0),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `members-summary-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Members data exported successfully");
  };

  const filteredMembers = members.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.fullName.toLowerCase().includes(searchLower) ||
      member.phoneNumber.toLowerCase().includes(searchLower) ||
      (member.address || "").toLowerCase().includes(searchLower) ||
      member.locationName.toLowerCase().includes(searchLower)
    );
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const aValue: unknown = a[sortBy as keyof MemberSummary];
    const bValue: unknown = b[sortBy as keyof MemberSummary];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(pagination.totalPages, currentPage + 2);

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex flex-col space-y-2 sm:hidden">
          <div className="text-xs text-gray-600 text-center">
            Page {currentPage} of {pagination.totalPages}
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              ««
            </Button>
            <Button
              onClick={handlePrevPage}
              disabled={!pagination.hasPrev}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              ‹
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">Page</span>
              <input
                type="number"
                min={1}
                max={pagination.totalPages}
                value={currentPage}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > pagination.totalPages) val = pagination.totalPages;
                  setCurrentPage(val);
                }}
                className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                aria-label="Page number"
              />
              <span className="text-xs text-gray-600">of {pagination.totalPages}</span>
            </div>
            <Button
              onClick={handleNextPage}
              disabled={!pagination.hasNext}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              ›
            </Button>
            <Button
              onClick={handleLastPage}
              disabled={currentPage === pagination.totalPages}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-xs"
            >
              »»
            </Button>
          </div>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(
                  currentPage * pagination.limit,
                  pagination.total
                )}
              </span>{" "}
              of <span className="font-medium">{pagination.total}</span>{" "}
              results
            </p>
          </div>
          <div>
            <nav
              className="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <Button
                onClick={handleFirstPage}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center px-2 py-2 text-gray-400 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page Input for Quick Navigation */}
              <div className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium">
                <span className="text-xs text-gray-600 mr-1">Page</span>
                <input
                  type="number"
                  min={1}
                  max={pagination.totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > pagination.totalPages) val = pagination.totalPages;
                    setCurrentPage(val);
                  }}
                  className="w-12 px-1 py-0 border-0 text-center text-xs text-gray-700 focus:ring-0 focus:border-0 bg-transparent"
                  aria-label="Page number"
                />
                <span className="text-xs text-gray-600 ml-1">of {pagination.totalPages}</span>
              </div>

              {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                const pageNum = startPage + i;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasNext}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center px-2 py-2 text-gray-400 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleLastPage}
                disabled={currentPage === pagination.totalPages}
                variant="outline"
                size="sm"
                className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryCards = () => {
    if (!summaryStats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryStats.totalMembers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Locations</p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Active Members
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryStats.activeMembers}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMembersTable = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (sortedMembers.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No members found</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-button text-white">
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("fullName")}
                >
                  Full Name
                  {sortBy === "fullName" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("address")}
                >
                  Address
                  {sortBy === "address" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("phoneNumber")}
                >
                  Phone
                  {sortBy === "phoneNumber" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("lastLogin")}
                >
                  Last Login
                  {sortBy === "lastLogin" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("createdAt")}
                >
                  Joined
                  {sortBy === "createdAt" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("locationName")}
                >
                  Location
                  {sortBy === "locationName" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th
                  className="p-3 border border-border text-sm cursor-pointer hover:bg-buttonActive"
                  onClick={() => handleSort("winLoss")}
                >
                  Win/Loss
                  {sortBy === "winLoss" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th className="p-3 border border-border text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => (
                <tr key={member._id} className="text-center hover:bg-muted">
                  <td className="p-3 border border-border">
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {member.fullName}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 border border-border text-left">
                    {member.address || "-"}
                  </td>
                  <td className="p-3 border border-border">
                    {formatPhoneNumber(member.phoneNumber)}
                  </td>
                  <td className="p-3 border border-border">
                    {formatDateTime(member.lastLogin)}
                  </td>
                  <td className="p-3 border border-border">
                    {formatDate(member.createdAt)}
                  </td>
                  <td className="p-3 border border-border">
                    {member.locationName}
                  </td>
                  <td className="p-3 border border-border">
                    <div
                      className={`font-medium ${
                        (member.winLoss || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(member.winLoss || 0)}
                    </div>
                  </td>
                  <td className="p-3 border border-border">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMember(member)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSessions(member._id)}
                        className="flex items-center gap-1"
                      >
                        <Activity className="h-3 w-3" />
                        View Sessions
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  const renderMembersCards = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      );
    }

    if (sortedMembers.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No members found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {sortedMembers.map((member) => (
            <div
              key={member._id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {member.fullName}
                  </h3>
                  <p className="text-sm text-gray-500">{member.locationName}</p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMember(member)}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <Eye className="h-3 w-3" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewSessions(member._id)}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <Activity className="h-3 w-3" />
                    View Sessions
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Address:</span>
                  <p className="text-gray-900 font-medium">
                    {member.address || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="text-gray-900 font-medium">
                    {formatPhoneNumber(member.phoneNumber)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Last Login:</span>
                  <p className="text-gray-900 font-medium">
                    {formatDateTime(member.lastLogin)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Joined:</span>
                  <p className="text-gray-900 font-medium">
                    {formatDate(member.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Win/Loss:</span>
                  <p
                    className={`font-medium ${
                      (member.winLoss || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(member.winLoss || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderPagination()}
      </div>
    );
  };

  return (
    <motion.div
      className="w-full"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members Summary</h1>
        <p className="text-gray-600">
          Overview of member information and registration data
        </p>
      </div>

      {/* Date Filters */}
      <div className="mb-6">
        <DashboardDateFilters hideAllTime={false} />
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Search and Filter Controls */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, address..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Location:</span>
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => handleLocationFilter(e.target.value)}
                className="w-full md:w-48 h-11 bg-white border border-gray-300 rounded-full px-4 pr-10 text-gray-700 appearance-none focus:ring-buttonActive focus:border-buttonActive"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Desktop: Table view */}
      <div className="hidden lg:block">{renderMembersTable()}</div>

      {/* Mobile: Card view */}
      <div className="block lg:hidden">{renderMembersCards()}</div>

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember ? { ...selectedMember, gamingLocation: selectedMember._id, address: selectedMember.address || "" } : null}
      />
    </motion.div>
  );
}
