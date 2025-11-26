/**
 * Custom Hooks Utilities
 *
 * Utility hooks for common React functionality.
 *
 * Features:
 * - Debounce hook for search optimization
 * - Value debouncing with configurable delay
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Debounce Hook
// ============================================================================
/**
 * Debounce hook for search optimization
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
