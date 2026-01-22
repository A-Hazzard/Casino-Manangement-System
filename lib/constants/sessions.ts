/**
 * Constants for sessions page
 */

/**
 * Session sort options
 */
export const SESSION_SORT_OPTIONS = [
  { value: 'startTime', label: 'Start Time' },
  { value: 'playerName', label: 'Player Name' },
  { value: 'machineId', label: 'Machine ID' },
  { value: 'duration', label: 'Duration' },
  { value: 'totalHandle', label: 'Handle' },
] as const;

// SESSIONS_ANIMATIONS was removed - not used anywhere in the codebase
