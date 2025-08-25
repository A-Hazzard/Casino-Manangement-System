"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Header from "@/components/layout/Header";


import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";


import type {
  MachineEvent,
  PaginationData,
} from "@/lib/types/sessions";

export default function SessionEventsPage() {
  const params = useParams();
  const router = useRouter();
  const [events, setEvents] = useState<MachineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);


  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedLicencee, setSelectedLicencee] = useState("All Licensees");



  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const sessionId = params.sessionId as string;
  const machineId = params.machineId as string;

  const handleFilter = useCallback(() => {
    // Reset to first page when filtering
    setCurrentPage(1);
    // The fetchEvents function will be called by the useEffect when currentPage changes
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });





      const response = await axios.get(
        `/api/sessions/${sessionId}/${machineId}/events?${params}`
      );

      const data = response.data;

      setEvents(data.data.events);
      setPagination(data.data.pagination);
    } catch (err) {
      console.error("❌ Events Page Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    sessionId,
    machineId,
  ]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };





  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid Date";
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "priority":
        return "bg-red-100 text-red-800";
      case "significant":
        return "bg-yellow-100 text-yellow-800";
      case "general":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderEventsTable = () => {
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

    if (events.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No events found for this session</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-button text-white">
                <th className="p-3 border border-border text-sm">Type</th>
                <th className="p-3 border border-border text-sm">Event</th>
                <th className="p-3 border border-border text-sm">Event Code</th>
                <th className="p-3 border border-border text-sm">Game</th>
                <th className="p-3 border border-border text-sm">Date</th>
                <th className="p-3 border border-border text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <React.Fragment key={event._id}>
                  <tr className="text-center hover:bg-muted">
                    <td className="p-3 border border-border">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(
                          event.eventType
                        )}`}
                      >
                        {event.eventType}
                      </span>
                    </td>
                    <td className="p-3 border border-border text-sm text-gray-900">
                      {event.description}
                    </td>
                    <td className="p-3 border border-border text-sm text-gray-900">
                      {event.command || "-"}
                    </td>
                    <td className="p-3 border border-border text-sm text-gray-900">
                      {event.gameName || "-"}
                    </td>
                    <td className="p-3 border border-border text-sm text-gray-900">
                      {formatDate(event.date)}
                    </td>
                    <td className="p-3 border border-border text-sm text-gray-900">
                      {event.sequence && event.sequence.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpansion(event._id)}
                          className="p-1"
                        >
                          {expandedEvents.has(event._id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expandedEvents.has(event._id) && event.sequence && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-3 border border-border bg-gray-50"
                      >
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700">
                            Sequence Details:
                          </h4>
                          {event.sequence.map((step, index) => (
                            <div
                              key={index}
                              className="ml-4 p-3 bg-white rounded border border-gray-200"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-900">
                                  {step.description}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      step.logLevel === "ERROR"
                                        ? "bg-red-100 text-red-800"
                                        : step.logLevel === "WARN"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {step.logLevel}
                                  </span>
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      step.success
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {step.success ? "SUCCESS" : "FAILED"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEventsCards = () => {
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

    if (events.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No events found for this session</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {events.map((event) => (
          <div
            key={event._id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(
                        event.eventType
                      )}`}
                    >
                      {event.eventType}
                    </span>
                    {event.sequence && event.sequence.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEventExpansion(event._id)}
                        className="p-1"
                      >
                        {expandedEvents.has(event._id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {event.description}
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Event Code:</span>
                  <p className="text-gray-900">{event.command || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Game:</span>
                  <p className="text-gray-900">{event.gameName || "-"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Date:</span>
                  <p className="text-gray-900">{formatDate(event.date)}</p>
                </div>
              </div>
              {expandedEvents.has(event._id) && event.sequence && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">
                    Sequence Details:
                  </h4>
                  {event.sequence.map((step, index) => (
                    <div
                      key={index}
                      className="ml-4 p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm text-gray-900">
                          {step.description}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              step.logLevel === "ERROR"
                                ? "bg-red-100 text-red-800"
                                : step.logLevel === "WARN"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {step.logLevel}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              step.success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {step.success ? "SUCCESS" : "FAILED"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page{" "}
              <span className="font-medium">{pagination.currentPage}</span> of{" "}
              <span className="font-medium">{pagination.totalPages}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden md:w-11/12 md:ml-20 transition-all duration-300">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={setSelectedLicencee}
          />
          <div className="w-full mt-8">
            <div className="mb-6">
              <Button variant="outline" size="sm" onClick={() => router.back()}>
                Back to Sessions
              </Button>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Session Events
              </h1>
              <p className="text-gray-600">
                Machine events for Session {sessionId} on Machine {machineId}
              </p>
            </div>

            {/* Date Filter Section */}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Filter Events by Date
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleFilter}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Filter
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h2 className="text-red-800 font-semibold">Error</h2>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Desktop: Table view */}
            <div className="hidden lg:block">{renderEventsTable()}</div>

            {/* Mobile: Card view */}
            <div className="block lg:hidden">{renderEventsCards()}</div>
            {renderPagination()}
          </div>
        </main>
      </div>
    </>
  );
}
