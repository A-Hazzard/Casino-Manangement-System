/**
 * Cabinet Form Normalization Utilities
 *
 * Utility functions for normalizing form values in cabinet forms
 */

/**
 * Normalize status value to valid status type
 */
export function normalizeStatusValue(
  value?: string
): 'functional' | 'non_functional' {
  if (!value) return 'functional';
  const normalized = value.toLowerCase().replace(/\s+/g, '_');
  return normalized === 'non_functional' ? 'non_functional' : 'functional';
}

/**
 * Normalize game type value to standard format
 */
export function normalizeGameTypeValue(value?: string): string {
  if (!value) return 'slot';
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  const knownTypes: Record<string, string> = {
    slot: 'slot',
    slots: 'slot',
    roulette: 'roulette',
    pulse: 'pulse',
    other: 'other',
  };
  return knownTypes[normalized] || normalized;
}


