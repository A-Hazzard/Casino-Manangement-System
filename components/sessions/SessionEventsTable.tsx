import React, { useState, useMemo } from "react";
import {
  CheckIcon,
  PlusIcon,
  MinusIcon,
} from "@radix-ui/react-icons";

type MachineEvent = {
  _id: string;
  eventType: string;
  description: string;
  command: string;
  gameName: string;
  date: string;
  eventLogLevel: string;
  eventSuccess: boolean;
  sequence?: Array<{
    description: string;
    logLevel: string;
    success: boolean;
    createdAt: string;
  }>;
};

type SessionEventsTableProps = {
  data: MachineEvent[];
};

/**
 * Renders the Session Events table with filters and updated structure.
 * @param data - Array of MachineEvent objects.
 * @returns Session events table component.
 */
const SessionEventsTable: React.FC<SessionEventsTableProps> = ({ data }) => {
  // Filter states
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set()
  );

  // Get unique values for filter dropdowns
  const uniqueEventTypes = useMemo(() => {
    const types = [...new Set(data.map((item) => item.eventType))];
    return types.filter(Boolean).sort();
  }, [data]);

  const uniqueEvents = useMemo(() => {
    const events = [...new Set(data.map((item) => item.description))];
    return events.filter(Boolean).sort();
  }, [data]);

  const uniqueGames = useMemo(() => {
    const games = [...new Set(data.map((item) => item.gameName))];
    return games.filter(Boolean).sort();
  }, [data]);

  // Filter and sort data
  const filtered = useMemo(() => {
    let filteredData = data;

    if (eventTypeFilter) {
      filteredData = filteredData.filter((item) =>
        item.eventType?.toLowerCase().includes(eventTypeFilter.toLowerCase())
      );
    }

    if (eventFilter) {
      filteredData = filteredData.filter((item) =>
        item.description?.toLowerCase().includes(eventFilter.toLowerCase())
      );
    }

    if (gameFilter) {
      filteredData = filteredData.filter((item) =>
        item.gameName?.toLowerCase().includes(gameFilter.toLowerCase())
      );
    }

    return filteredData;
  }, [data, eventTypeFilter, eventFilter, gameFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const formatDate = (dateString: string) => {
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

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event Type Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent"
            >
              <option value="">All Event Types</option>
              {uniqueEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Event Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event
            </label>
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent"
            >
              <option value="">All Events</option>
              {uniqueEvents.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          {/* Game Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Game
            </label>
            <select
              value={gameFilter}
              onChange={(e) => {
                setGameFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-button focus:border-transparent"
            >
              <option value="">All Games</option>
              {uniqueGames.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>
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
              <th className="p-3 border border-border text-sm">Game</th>
              <th className="p-3 border border-border text-sm">Date</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
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
                    {row.gameName || "Rhapsody S3"}
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
        {paged.map((row, idx) => (
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
                <span className="text-gray-700 font-medium">Game</span>
                <span className="font-medium">
                  {row.gameName || "Rhapsody S3"}
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
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-2">
          <button
            className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            {"<<"}
          </button>
          <button
            className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {"<"}
          </button>
          <span className="px-3 py-2 text-sm">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => {
              let val = Number(e.target.value);
              if (isNaN(val)) val = 1;
              if (val < 1) val = 1;
              if (val > totalPages) val = totalPages;
              setPage(val);
            }}
            className="w-16 px-2 py-2 border border-border rounded-md text-center text-sm"
            aria-label="Page number"
          />
          <span className="px-3 py-2 text-sm">
            of {Math.max(1, totalPages)}
          </span>
          <button
            className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            {">"}
          </button>
          <button
            className="px-3 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages || totalPages === 0}
          >
            {">>"}
          </button>
        </div>
      )}
    </div>
  );
};

export { SessionEventsTable };
