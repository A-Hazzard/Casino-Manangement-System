export * from './administration';
export * from './animationVariants';
export * from './badWords';
export * from './cabinets';
export * from './collection';
export * from './images';
export * from './members';
export * from './navigation';
export * from './reports';
export * from './roles';
export * from './sessions';
export * from './uiConstants';
export * from './vault';

/**
 * Global Polling Intervals (milliseconds)
 */
export const POLL_INTERVALS = {
  VERY_FAST: 5000,   // 5 seconds
  FAST: 15000,       // 15 seconds
  MEDIUM: 30000,     // 30 seconds
  SLOW: 60000,       // 1 minute
} as const;

export const DEFAULT_POLL_INTERVAL = POLL_INTERVALS.VERY_FAST;
