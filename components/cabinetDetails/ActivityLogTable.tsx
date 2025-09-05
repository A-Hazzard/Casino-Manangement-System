import React, { useState } from "react";
import { CheckIcon, PlusIcon, MinusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MachineEvent = {
  _id: string;
  message?: {
    incomingMessage?: {
      typ: string;
      rly: string;
      mac: string;
      pyd: string;
    };
    serialNumber?: string;
    game?: string;
    gamingLocation?: string;
  };
  machine: string;
  relay?: string;
  commandType?: string;
  command?: string;
  description?: string;
  date: string | Date;
  cabinetId?: string;
  gameName?: string;
  location?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  sequence?: Array<{
    description: string;
    logLevel: string;
    success: boolean;
    createdAt: string;
  }>;
  eventType?: string;
  eventLogLevel?: string;
  eventSuccess?: boolean;
};

type ExtendedActivityLogTableProps = {
  data: MachineEvent[];
  onFilterChange?: (filters: {
    startTime?: string;
    endTime?: string;
    eventType?: string;
    type?: string;
  }) => void;
};

/**
 * Renders the Activity Log table with simplified structure and no filters.
 * @param data - Array of MachineEvent objects.
 * @returns Activity log table component.
 */
const ActivityLogTable: React.FC<ExtendedActivityLogTableProps> = ({
  data,
  onFilterChange,
}) => {
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set()
  );
  const [filters, setFilters] = useState({
    startTime: "",
    endTime: "",
    eventType: "",
    type: "",
  });

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const toggleSequence = (eventId: string) => {
    const newExpanded = new Set(expandedSequences);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedSequences(newExpanded);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      startTime: "",
      endTime: "",
      eventType: "",
      type: "",
    };
    setFilters(clearedFilters);
    onFilterChange?.(clearedFilters);
  };

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <Input
              type="time"
              value={filters.startTime}
              onChange={(e) => handleFilterChange("startTime", e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <Input
              type="time"
              value={filters.endTime}
              onChange={(e) => handleFilterChange("endTime", e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Event Type</label>
            <Select
              value={filters.eventType}
              onValueChange={(value) => handleFilterChange("eventType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Events</SelectItem>
                <SelectItem value="machine">Machine</SelectItem>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Significant">Significant</SelectItem>
                <SelectItem value="Priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={clearFilters} size="sm">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block w-full overflow-x-auto rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-button text-white">
              <th className="p-3 border border-border text-sm">Type</th>
              <th className="p-3 border border-border text-sm">Event</th>
              <th className="p-3 border border-border text-sm">Event Code</th>
              <th className="p-3 border border-border text-sm">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <React.Fragment key={row._id || idx}>
                <tr className="text-center hover:bg-muted">
                  <td className="p-3 border border-border">
                    <div className="flex items-center justify-center gap-2">
                      <CheckIcon className="w-4 h-4 text-green-500" />
                      {row.eventType || "General"}
                    </div>
                  </td>
                  <td className="p-3 border border-border text-left">
                    <div className="flex items-center justify-between">
                      <span>{row.description || "No activity"}</span>
                      {row.sequence && row.sequence.length > 0 && (
                        <button
                          onClick={() => toggleSequence(row._id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {expandedSequences.has(row._id) ? (
                            <MinusIcon className="w-4 h-4 text-green-500 hover:text-green-600" />
                          ) : (
                            <PlusIcon className="w-4 h-4 text-green-500 hover:text-green-600" />
                          )}
                        </button>
                      )}
                    </div>
                    {/* Sequence Dropdown within the same cell */}
                    {expandedSequences.has(row._id) &&
                      row.sequence &&
                      row.sequence.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h4 className="font-medium text-gray-700 mb-2 text-sm">
                            Sequence Details
                          </h4>
                          <div className="space-y-2">
                            {row.sequence.map((seq, seqIdx) => (
                              <div
                                key={seqIdx}
                                className="bg-gray-50 p-2 rounded border text-xs"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">
                                    {seq.description}
                                  </span>
                                  <span
                                    className={`px-1 py-0.5 rounded text-xs ${
                                      seq.success
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {seq.logLevel}
                                  </span>
                                </div>
                                <div className="text-gray-500">
                                  {formatDate(seq.createdAt)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </td>
                  <td className="p-3 border border-border font-mono">
                    {row.command || "00"}
                  </td>
                  <td className="p-3 border border-border">
                    {formatDate(row.date)}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-4 w-full">
        {data.map((row, idx) => (
          <div
            key={row._id || idx}
            className="bg-container rounded-lg shadow-md overflow-hidden w-full border border-border"
          >
            <div className="bg-button text-white px-4 py-3 font-semibold text-sm">
              <div className="flex items-center justify-between">
                <span>{row.eventType || "General"}</span>
                <CheckIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-gray-700 font-medium">Event</span>
                <div className="flex items-center gap-2">
                  <span className="text-right break-all ml-2">
                    {row.description || "No activity"}
                  </span>
                  {row.sequence && row.sequence.length > 0 && (
                    <button
                      onClick={() => toggleSequence(row._id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {expandedSequences.has(row._id) ? (
                        <MinusIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <PlusIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Event Code</span>
                <span className="font-mono font-medium">
                  {row.command || "00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Date</span>
                <span className="font-medium text-sm">
                  {formatDate(row.date)}
                </span>
              </div>

              {/* Mobile Sequence Dropdown */}
              {expandedSequences.has(row._id) &&
                row.sequence &&
                row.sequence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm">
                      Sequence Details
                    </h4>
                    <div className="space-y-2">
                      {row.sequence.map((seq, seqIdx) => (
                        <div key={seqIdx} className="bg-gray-50 p-2 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">
                              {seq.description}
                            </span>
                            <span
                              className={`text-xs px-1 py-0.5 rounded ${
                                seq.success
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {seq.logLevel}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(seq.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      {/* totalPages > 1 && ( */}
      {/*   <div className="flex justify-center items-center mt-6 gap-2"> */}
      {/*     <button */}
      {/*       className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed" */}
      {/*       onClick={() => setPage(1)} */}
      {/*       disabled={page === 1} */}
      {/*     > */}
      {/*       {"<<"} */}
      {/*     </button> */}
      {/*     <button */}
      {/*       className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed" */}
      {/*       onClick={() => setPage((p) => Math.max(1, p - 1))} */}
      {/*       disabled={page === 1} */}
      {/*     > */}
      {/*       {"<"} */}
      {/*     </button> */}
      {/*     <span className="px-3 py-2 text-sm">Page</span> */}
      {/*     <input */}
      {/*       type="number" */}
      {/*       min={1} */}
      {/*       max={totalPages} */}
      {/*       value={page} */}
      {/*       onChange={(e) => { */}
      {/*         let val = Number(e.target.value); */}
      {/*         if (isNaN(val)) val = 1; */}
      {/*         if (val < 1) val = 1; */}
      {/*         if (val > totalPages) val = totalPages; */}
      {/*         setPage(val); */}
      {/*       }} */}
      {/*       className="w-16 px-2 py-2 border border-border rounded-md text-center text-sm" */}
      {/*       aria-label="Page number" */}
      {/*     /> */}
      {/*     <span className="px-3 py-2 text-sm"> */}
      {/*       of {Math.max(1, totalPages)} */}
      {/*     </span> */}
      {/*     <button */}
      {/*       className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed" */}
      {/*       onClick={() => setPage((p) => Math.min(totalPages, p + 1))} */}
      {/*       disabled={page === totalPages || totalPages === 0} */}
      {/*     > */}
      {/*       {">"} */}
      {/*     </button> */}
      {/*     <button */}
      {/*       className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed" */}
      {/*       onClick={() => setPage(totalPages)} */}
      {/*       disabled={page === totalPages || totalPages === 0} */}
      {/*     > */}
      {/*       {">>"} */}
      {/*     </button> */}
      {/*   </div> */}
      {/* )} */}
    </div>
  );
};

export { ActivityLogTable };
