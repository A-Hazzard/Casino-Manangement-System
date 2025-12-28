import { Fragment, useState, useMemo } from 'react';
import { CheckIcon, PlusIcon, MinusIcon } from '@radix-ui/react-icons';

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
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set()
  );

  // Get unique values for filter dropdowns
  const uniqueEventTypes = useMemo(() => {
    const types = [...new Set(data.map(item => item.eventType))];
    return types.filter(Boolean).sort();
  }, [data]);

  const uniqueEvents = useMemo(() => {
    const events = [...new Set(data.map(item => item.description))];
    return events.filter(Boolean).sort();
  }, [data]);

  const uniqueGames = useMemo(() => {
    const games = [...new Set(data.map(item => item.gameName))];
    return games.filter(Boolean).sort();
  }, [data]);

  /**
   * Filters events based on event type, description, and game name.
   * Applies all active filters sequentially.
   */
  const filtered = useMemo(() => {
    let filteredData = data;

    // Filter by event type if filter is set
    if (eventTypeFilter) {
      filteredData = filteredData.filter(item =>
        item.eventType?.toLowerCase().includes(eventTypeFilter.toLowerCase())
      );
    }

    // Filter by event description if filter is set
    if (eventFilter) {
      filteredData = filteredData.filter(item =>
        item.description?.toLowerCase().includes(eventFilter.toLowerCase())
      );
    }

    // Filter by game name if filter is set
    if (gameFilter) {
      filteredData = filteredData.filter(item =>
        item.gameName?.toLowerCase().includes(gameFilter.toLowerCase())
      );
    }

    return filteredData;
  }, [data, eventTypeFilter, eventFilter, gameFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  /**
   * Toggles the expansion state of an event's sequence details.
   * If expanded, collapses it; if collapsed, expands it.
   */
  const toggleSequence = (eventId: string) => {
    const newExpanded = new Set(expandedSequences);
    // Remove event if already expanded, otherwise add it
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Event Type Filter */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Event Type
            </label>
            <select
              value={eventTypeFilter}
              onChange={e => {
                setEventTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-button"
            >
              <option value="">All Event Types</option>
              {uniqueEventTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Event Filter */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Event
            </label>
            <select
              value={eventFilter}
              onChange={e => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-button"
            >
              <option value="">All Events</option>
              {uniqueEvents.map(event => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          {/* Game Filter */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Game
            </label>
            <select
              value={gameFilter}
              onChange={e => {
                setGameFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-button"
            >
              <option value="">All Games</option>
              {uniqueGames.map(game => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden w-full overflow-x-auto rounded-lg lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-button text-white">
              <th className="border border-border p-3 text-sm">Type</th>
              <th className="border border-border p-3 text-sm">Event</th>
              <th className="border border-border p-3 text-sm">Event Code</th>
              <th className="border border-border p-3 text-sm">Game</th>
              <th className="border border-border p-3 text-sm">Date</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => (
              <Fragment key={row._id || idx}>
                <tr className="text-center hover:bg-muted">
                  <td className="border border-border p-3">
                    <div className="flex items-center justify-center gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      {row.eventType || 'General'}
                    </div>
                  </td>
                  <td className="border border-border p-3 text-left">
                    <div className="flex items-center justify-between">
                      <span>{row.description || 'No activity'}</span>
                      {/* Show expand/collapse button only if sequence exists */}
                      {row.sequence && row.sequence.length > 0 && (
                        <button
                          onClick={() => toggleSequence(row._id)}
                          className="rounded p-1 transition-colors hover:bg-gray-100"
                        >
                          {/* Show minus icon if expanded, plus icon if collapsed */}
                          {expandedSequences.has(row._id) ? (
                            <MinusIcon className="h-4 w-4 text-green-500 hover:text-green-600" />
                          ) : (
                            <PlusIcon className="h-4 w-4 text-green-500 hover:text-green-600" />
                          )}
                        </button>
                      )}
                    </div>
                    {/* Show sequence details when event is expanded */}
                    {expandedSequences.has(row._id) &&
                      row.sequence &&
                      row.sequence.length > 0 && (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <h4 className="mb-2 text-sm font-medium text-gray-700">
                            Sequence Details
                          </h4>
                          <div className="space-y-2">
                            {row.sequence.map((seq, seqIdx) => (
                              <div
                                key={seqIdx}
                                className="rounded border bg-gray-50 p-2 text-xs"
                              >
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="font-medium">
                                    {seq.description}
                                  </span>
                                  <span
                                    className={`rounded px-1 py-0.5 text-xs ${
                                      seq.success
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
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
                  <td className="border border-border p-3 font-mono">
                    {row.command || '00'}
                  </td>
                  <td className="border border-border p-3">
                    {row.gameName || 'Rhapsody S3'}
                  </td>
                  <td className="border border-border p-3">
                    {formatDate(row.date)}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="block w-full space-y-4 lg:hidden">
        {paged.map((row, idx) => (
          <div
            key={row._id || idx}
            className="w-full overflow-hidden rounded-lg border border-border bg-container shadow-md"
          >
            <div className="bg-button px-4 py-3 text-sm font-semibold text-white">
              <div className="flex items-center justify-between">
                <span>{row.eventType || 'General'}</span>
                <CheckIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <span className="font-medium text-gray-700">Event</span>
                <div className="flex items-center gap-2">
                  <span className="ml-2 break-all text-right">
                    {row.description || 'No activity'}
                  </span>
                  {/* Show expand/collapse button only if sequence exists */}
                  {row.sequence && row.sequence.length > 0 && (
                    <button
                      onClick={() => toggleSequence(row._id)}
                      className="rounded p-1 transition-colors hover:bg-gray-100"
                    >
                      {/* Show minus icon if expanded, plus icon if collapsed */}
                      {expandedSequences.has(row._id) ? (
                        <MinusIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                      ) : (
                        <PlusIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Event Code</span>
                <span className="font-mono font-medium">
                  {row.command || '00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Game</span>
                <span className="font-medium">
                  {row.gameName || 'Rhapsody S3'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Date</span>
                <span className="text-sm font-medium">
                  {formatDate(row.date)}
                </span>
              </div>

              {/* Show sequence details when event is expanded on mobile */}
              {expandedSequences.has(row._id) &&
                row.sequence &&
                row.sequence.length > 0 && (
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      Sequence Details
                    </h4>
                    <div className="space-y-2">
                      {row.sequence.map((seq, seqIdx) => (
                        <div key={seqIdx} className="rounded bg-gray-50 p-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {seq.description}
                            </span>
                            <span
                              className={`rounded px-1 py-0.5 text-xs ${
                                seq.success
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
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

      {/* Show pagination controls only if there are multiple pages */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="rounded-md border border-border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            {'<<'}
          </button>
          <button
            className="rounded-md border border-border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {'<'}
          </button>
          <span className="px-3 py-2 text-sm">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={e => {
              let val = Number(e.target.value);
              if (isNaN(val)) val = 1;
              if (val < 1) val = 1;
              if (val > totalPages) val = totalPages;
              setPage(val);
            }}
            className="w-16 rounded-md border border-border px-2 py-2 text-center text-sm"
            aria-label="Page number"
          />
          <span className="px-3 py-2 text-sm">
            of {Math.max(1, totalPages)}
          </span>
          <button
            className="rounded-md border border-border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            {'>'}
          </button>
          <button
            className="rounded-md border border-border px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages || totalPages === 0}
          >
            {'>>'}
          </button>
        </div>
      )}
    </div>
  );
};

export { SessionEventsTable };
