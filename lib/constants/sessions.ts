/**
 * Constants for sessions page
 */

/**
 * Session sort options
 */
export const SESSION_SORT_OPTIONS = [
  { value: "startTime", label: "Start Time" },
  { value: "playerName", label: "Player Name" },
  { value: "machineId", label: "Machine ID" },
  { value: "duration", label: "Duration" },
  { value: "totalHandle", label: "Handle" },
] as const;

/**
 * Default pagination settings
 */
export const SESSIONS_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
} as const;

/**
 * Animation variants for sessions components
 */
export const SESSIONS_ANIMATIONS = {
  pageVariants: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  cardVariants: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
} as const;
