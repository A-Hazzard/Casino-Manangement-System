/**
 * Cabinets Details Activity Log Table Component
 * Table component for displaying machine activity logs with filtering and time selection.
 *
 * Features:
 * - Machine event log display
 * - Event type filtering
 * - Time picker for filtering by time
 * - Expandable event sequences
 * - Command and description display
 * - Date and time formatting
 * - Success/failure indicators
 */

import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { CheckIcon, MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { Fragment, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type CabinetsDetailsMachineEvent = {
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

type CabinetsDetailsActivityLogTableProps = {
  data: CabinetsDetailsMachineEvent[];
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
export const CabinetsDetailsActivityLogTable: React.FC<CabinetsDetailsActivityLogTableProps> = ({
  data,
  onFilterChange,
}) => {
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set()
  );
  const [filters, setFilters] = useState({
    startTime: '',
    endTime: '',
    eventType: '',
    type: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatDate = (dateString: string | Date) => {
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
    // Treat "all" as empty string for filtering purposes
    const filterValue = value === 'all' ? '' : value;
    const newFilters = { ...filters, [key]: filterValue };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      startTime: '',
      endTime: '',
      eventType: '',
      type: '',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    onFilterChange?.(clearedFilters);
  };

  // Get unique event types and types from data
  const uniqueEventTypes = useMemo(() => {
    const eventTypes = new Set<string>();
    data.forEach(item => {
      if (item.eventType) {
        eventTypes.add(item.eventType);
      }
    });
    return Array.from(eventTypes).sort();
  }, [data]);



  // Filter and paginate data
  const filteredAndPaginatedData = useMemo(() => {
    const filtered = data.filter(item => {
      // Time filtering - fix the time comparison logic
      if (filters.startTime || filters.endTime) {
        const itemDate = new Date(item.date);

        // Check if the date is valid
        if (isNaN(itemDate.getTime())) {
          return false;
        }

        const itemTime = itemDate.getHours() * 60 + itemDate.getMinutes();

        if (filters.startTime) {
          const [startHour, startMin] = filters.startTime
            .split(':')
            .map(Number);
          const startTime = startHour * 60 + startMin;
          if (itemTime < startTime) return false;
        }

        if (filters.endTime) {
          const [endHour, endMin] = filters.endTime.split(':').map(Number);
          const endTime = endHour * 60 + endMin;
          if (itemTime > endTime) return false;
        }
      }

      // Event type filtering - case insensitive
      if (filters.eventType && filters.eventType !== 'all') {
        const itemEventType = item.eventType || '';
        if (itemEventType.toLowerCase() !== filters.eventType.toLowerCase()) {
          return false;
        }
      }

      // Type filtering - robust matching
      if (filters.type && filters.type !== 'all') {
        const itemType = (item.eventLogLevel || 'General').toLowerCase();
        const filterType = filters.type.toLowerCase();
        
        // Handle common mappings
        if (filterType === 'warning' || filterType === 'warn') {
          if (itemType !== 'warning' && itemType !== 'warn') return false;
        } else if (itemType !== filterType) {
          return false;
        }
      }

      return true;
    });

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      totalPages,
      totalItems: filtered.length,
    };
  }, [data, filters, currentPage, itemsPerPage]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="w-full">
        {/* Filter Controls */}
        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          {/* Quick Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-medium text-gray-500">Quick Filters:</span>
            <Button
              variant={filters.type === 'Critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('type', 'Critical')}
              className={filters.type === 'Critical' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
            >
              Critical
            </Button>
            <Button
              variant={filters.type === 'Warning' || filters.type === 'WARN' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('type', 'Warning')}
              className={filters.type === 'Warning' || filters.type === 'WARN' ? 'bg-orange-500 hover:bg-orange-600' : 'text-orange-500 border-orange-200 hover:bg-orange-50'}
            >
              Warning
            </Button>
            <Button
              variant={filters.type === 'INFO' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('type', 'INFO')}
              className={filters.type === 'INFO' ? 'bg-blue-500 hover:bg-blue-600' : 'text-blue-500 border-blue-200 hover:bg-blue-50'}
            >
              INFO
            </Button>
            <Button
              variant={filters.eventType === 'SAS Event' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('eventType', 'SAS Event')}
              className={filters.eventType === 'SAS Event' ? 'bg-purple-600 hover:bg-purple-700' : 'text-purple-600 border-purple-200 hover:bg-purple-50'}
            >
              SAS Event
            </Button>
            <Button
              variant={!filters.type && !filters.eventType ? 'default' : 'outline'}
              size="sm"
              onClick={clearFilters}
              className={!filters.type && !filters.eventType ? 'bg-gray-600' : ''}
            >
              All
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <TimePicker
                label="Start Time"
                value={
                  filters.startTime
                    ? new Date(`2000-01-01T${filters.startTime}`)
                    : null
                }
                onChange={newValue => {
                  const timeString = newValue
                    ? newValue.toTimeString().slice(0, 5)
                    : '';
                  handleFilterChange('startTime', timeString);
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        fontSize: '14px',
                        height: '40px',
                        minHeight: '40px',
                        maxHeight: '40px',
                        '& .MuiOutlinedInput-input': {
                          height: '40px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                        },
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '14px',
                        color: '#6b7280',
                        '&.Mui-focused': {
                          color: '#3b82f6',
                        },
                      },
                    },
                  },
                }}
              />
            </div>
            <div>
              <TimePicker
                label="End Time"
                value={
                  filters.endTime
                    ? new Date(`2000-01-01T${filters.endTime}`)
                    : null
                }
                onChange={newValue => {
                  const timeString = newValue
                    ? newValue.toTimeString().slice(0, 5)
                    : '';
                  handleFilterChange('endTime', timeString);
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        fontSize: '14px',
                        height: '40px',
                        minHeight: '40px',
                        maxHeight: '40px',
                        '& .MuiOutlinedInput-input': {
                          height: '40px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                        },
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '14px',
                        color: '#6b7280',
                        '&.Mui-focused': {
                          color: '#3b82f6',
                        },
                      },
                    },
                  },
                }}
              />
            </div>
            <div>
              <Select
                value={filters.eventType || 'all'}
                onValueChange={value => handleFilterChange('eventType', value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEventTypes.map(eventType => (
                    <SelectItem key={eventType} value={eventType}>
                      {eventType}
                    </SelectItem>
                  ))}
                  {!uniqueEventTypes.includes('SAS Event') && (
                    <SelectItem value="SAS Event">SAS Event</SelectItem>
                  )}
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
        <div className="hidden w-full overflow-x-auto rounded-lg lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-button text-white">
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Event</TableHead>
                <TableHead className="text-white">Event Code</TableHead>
                <TableHead className="text-white">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAndPaginatedData.data.map((row, idx) => {
                  const logLevel = (row.eventLogLevel || 'General').toLowerCase();
                  const rowBgClass = 
                    logLevel === 'critical' ? 'bg-red-50 hover:bg-red-100' :
                    logLevel === 'warning' || logLevel === 'warn' ? 'bg-orange-50 hover:bg-orange-100' :
                    'hover:bg-muted';
                  
                  return (
                    <Fragment key={row._id || idx}>
                      <TableRow className={`text-center ${rowBgClass}`}>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        {row.eventType || 'General'}
                      </div>
                    </TableCell>
                    <TableCell isFirstColumn={true}>
                      <div className="flex items-center justify-between">
                        <span>{row.description || 'No activity'}</span>
                        {row.sequence && row.sequence.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSequence(row._id)}
                            className="rounded p-1 transition-colors hover:bg-gray-100"
                          >
                            {expandedSequences.has(row._id) ? (
                              <MinusIcon className="h-4 w-4 text-green-500 hover:text-green-600" />
                            ) : (
                              <PlusIcon className="h-4 w-4 text-green-500 hover:text-green-600" />
                            )}
                          </Button>
                        )}
                      </div>
                      {/* Sequence Dropdown within the same cell */}
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
                    </TableCell>
                    <TableCell className="font-mono">
                      {row.command || '00'}
                    </TableCell>
                    <TableCell>{formatDate(row.date)}</TableCell>
                  </TableRow>
                    </Fragment>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block w-full space-y-4 lg:hidden">
          {filteredAndPaginatedData.data.map((row, idx) => (
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
                    {row.sequence && row.sequence.length > 0 && (
                      <button
                        onClick={() => toggleSequence(row._id)}
                        className="rounded p-1 transition-colors hover:bg-gray-100"
                      >
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
                  <span className="font-medium text-gray-700">Date</span>
                  <span className="text-sm font-medium">
                    {formatDate(row.date)}
                  </span>
                </div>

                {/* Mobile Sequence Dropdown */}
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

        {/* Pagination controls */}
        {filteredAndPaginatedData.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {'<<'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {'<'}
            </Button>
            <span className="px-3 py-2 text-sm">Page</span>
            <input
              type="number"
              min={1}
              max={filteredAndPaginatedData.totalPages}
              value={currentPage}
              onChange={e => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > filteredAndPaginatedData.totalPages)
                  val = filteredAndPaginatedData.totalPages;
                setCurrentPage(val);
              }}
              className="w-16 rounded-md border border-border px-2 py-2 text-center text-sm"
              aria-label="Page number"
            />
            <span className="px-3 py-2 text-sm">
              of {Math.max(1, filteredAndPaginatedData.totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(p =>
                  Math.min(filteredAndPaginatedData.totalPages, p + 1)
                )
              }
              disabled={
                currentPage === filteredAndPaginatedData.totalPages ||
                filteredAndPaginatedData.totalPages === 0
              }
            >
              {'>'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(filteredAndPaginatedData.totalPages)
              }
              disabled={
                currentPage === filteredAndPaginatedData.totalPages ||
                filteredAndPaginatedData.totalPages === 0
              }
            >
              {'>>'}
            </Button>
          </div>
        )}

        {/* Results summary */}
        <div className="mt-4 text-center text-sm text-gray-600">
          Showing {filteredAndPaginatedData.data.length} of{' '}
          {filteredAndPaginatedData.totalItems} results
        </div>
      </div>
    </LocalizationProvider>
  );
};

