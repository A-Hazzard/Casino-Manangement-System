/**
 * Sessions Page Data Helper Functions
 *
 * Provides helper functions for fetching session-related data for the sessions page,
 * including session events, session details, machine details, filters, and export functionality.
 * It handles all operations related to session data retrieval and processing.
 *
 * Features:
 * - Fetches session events with pagination and filtering.
 * - Fetches session and machine details.
 * - Fetches session events filters (event types, events, games).
 * - Exports session events to various formats.
 */

import axios from 'axios';
import type {
  MachineEvent,
  PaginationData,
  FilterData,
} from '@/lib/types/sessions';

// ============================================================================
// Type Definitions
// ============================================================================

export type SessionEventsQueryOptions = {
  page?: number;
  limit?: number;
  eventType?: string;
  event?: string;
  game?: string;
  filterDate?: string;
};

export type SessionEventsResult = {
  events: MachineEvent[];
  pagination: PaginationData;
  filters: FilterData;
};

// ============================================================================
// Session Data Fetching
// ============================================================================

/**
 * Fetch session events with pagination and filtering
 */
export async function fetchSessionEvents(
  sessionId: string,
  machineId: string,
  options: SessionEventsQueryOptions = {}
): Promise<SessionEventsResult> {
  try {
    const {
      page = 1,
      limit = 10,
      eventType,
      event,
      game,
      filterDate,
    } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (eventType) {
      params.append('eventType', eventType);
    }

    if (event) {
      params.append('event', event);
    }

    if (game) {
      params.append('game', game);
    }

    if (filterDate) {
      params.append('filterDate', filterDate);
    }

    const response = await axios.get(
      `/api/sessions/${sessionId}/${machineId}/events?${params.toString()}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(' Error fetching session events:', error);
    throw error;
  }
}

/**
 * Fetch session details
 */
export async function fetchSessionDetails(
  sessionId: string
): Promise<Record<string, unknown>> {
  try {
    const response = await axios.get(`/api/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error(' Error fetching session details:', error);
    throw error;
  }
}

/**
 * Fetch machine details
 */
export async function fetchMachineDetails(
  machineId: string
): Promise<Record<string, unknown>> {
  try {
    const response = await axios.get(`/api/machines/${machineId}`);
    return response.data;
  } catch (error) {
    console.error(' Error fetching machine details:', error);
    throw error;
  }
}

/**
 * Fetch session events filters
 */
export async function fetchSessionEventsFilters(
  sessionId: string,
  machineId: string
): Promise<FilterData> {
  try {
    const response = await axios.get(
      `/api/sessions/${sessionId}/${machineId}/events/filters`
    );
    return response.data;
  } catch (error) {
    console.error(' Error fetching session events filters:', error);
    return {
      eventTypes: [],
      events: [],
      games: [],
    };
  }
}

// ============================================================================
// Session Export Functions
// ============================================================================

/**
 * Export session events
 */
export async function exportSessionEvents(
  sessionId: string,
  machineId: string,
  options: SessionEventsQueryOptions = {}
): Promise<Blob> {
  try {
    const params = new URLSearchParams();

    if (options.eventType) {
      params.append('eventType', options.eventType);
    }
    if (options.event) {
      params.append('event', options.event);
    }
    if (options.game) {
      params.append('game', options.game);
    }
    if (options.filterDate) {
      params.append('filterDate', options.filterDate);
    }

    const response = await axios.get(
      `/api/sessions/${sessionId}/${machineId}/events/export?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );

    return response.data;
  } catch (error) {
    console.error(' Error exporting session events:', error);
    throw error;
  }
}
