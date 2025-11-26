/**
 * Sessions Page Utilities
 *
 * Utility functions for formatting, filtering, sorting, and paginating
 * machine session events on the sessions page.
 *
 * Features:
 * - Date formatting for session events
 * - Event type, log level, and success state color helpers
 * - Event filtering by type, description, and game
 * - Date-based sorting
 * - Generic pagination helper
 */

import type { MachineEvent } from '@/lib/types/sessions';

// ============================================================================
// Formatting Functions
// ============================================================================
/**
 * Format date for display.
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Get event type color for styling.
 */
export function getEventTypeColor(eventType: string): string {
  switch (eventType.toLowerCase()) {
    case 'priority':
      return 'bg-red-100 text-red-800';
    case 'significant':
      return 'bg-yellow-100 text-yellow-800';
    case 'general':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get log level color for styling.
 */
export function getLogLevelColor(logLevel: string): string {
  switch (logLevel) {
    case 'ERROR':
      return 'bg-red-100 text-red-800';
    case 'WARN':
      return 'bg-yellow-100 text-yellow-800';
    case 'INFO':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-green-100 text-green-800';
  }
}

/**
 * Get success/failure color for styling.
 */
export function getSuccessColor(success: boolean): string {
  return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
}

// ============================================================================
// Filtering Functions
// ============================================================================
/**
 * Filter events based on criteria.
 */
export function filterEvents(
  events: MachineEvent[],
  eventType?: string,
  event?: string,
  game?: string
): MachineEvent[] {
  return events.filter(eventItem => {
    if (eventType && eventItem.eventType !== eventType) {
      return false;
    }
    if (event && eventItem.description !== event) {
      return false;
    }
    if (game && eventItem.gameName !== game) {
      return false;
    }
    return true;
  });
}

// ============================================================================
// Sorting Functions
// ============================================================================
/**
 * Sort events by date.
 */
export function sortEventsByDate(
  events: MachineEvent[],
  order: 'asc' | 'desc' = 'desc'
): MachineEvent[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
}

// ============================================================================
// Pagination Functions
// ============================================================================
/**
 * Create pagination for events.
 */
export function createEventsPagination<T>(
  data: T[],
  currentPage: number,
  itemsPerPage: number
): {
  currentItems: T[];
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.slice(startIndex, endIndex);

  return {
    currentItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Create pagination handlers for events
 */
export function createEventsPaginationHandlers(
  currentPage: number,
  totalPages: number,
  setPage: (page: number) => void
) {
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  return {
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPrevPage,
    goToNextPage,
    canGoPrev: currentPage > 1,
    canGoNext: currentPage < totalPages,
  };
}

/**
 * Toggle event expansion state
 */
export function toggleEventExpansion(
  eventId: string,
  expandedEvents: Set<string>
): Set<string> {
  const newExpanded = new Set(expandedEvents);
  if (newExpanded.has(eventId)) {
    newExpanded.delete(eventId);
  } else {
    newExpanded.add(eventId);
  }
  return newExpanded;
}

/**
 * Format date for filter input
 */
export function formatDateForFilter(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Create filter date time
 */
export function createFilterDateTime(
  date: Date,
  hour: string,
  minute: string
): Date {
  const filterDateTime = new Date(date);
  filterDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
  return filterDateTime;
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
