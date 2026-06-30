/**
 * Lenient JSON parser for MongoDB Compass-like option fields.
 *
 * Accepts JavaScript object literals (unquoted keys, trailing commas,
 * comments) and normalises them to strict JSON. Mirrors the leniency
 * of MongoDB Compass's filter/sort/project inputs.
 */

type LenientParseResult<T = unknown> = {
  parsed: T | null;
  error: string | null;
  formatted: string;
};

/**
 * Strip comments and wrap unquoted keys in double quotes, then parse.
 * Returns the parsed value, any error, and the formatted JSON string.
 */
export function lenientParseJson<T = unknown>(text: string): LenientParseResult<T> {
  const trimmed = text.trim();
  if (!trimmed) return { parsed: null, error: null, formatted: '' };

  // 1. Strip single-line comments (// ... to end of line)
  let cleaned = trimmed.replace(/\/\/.*$/gm, '');

  // 2. Strip multi-line comments (/* ... */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 3. Strip trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 4. Wrap unquoted keys in double quotes
  //    Matches: { key: ,  key:  "key":  [ key:
  //    But NOT: "already quoted" or $ operators like $gt
  cleaned = cleaned.replace(
    /(?<=[{[\s,])(\$\w+|(?!\d)\w+)(?=\s*:)/g,
    '"$1"'
  );

  // 5. Parse
  try {
    const parsed = JSON.parse(cleaned) as T;
    const formatted = JSON.stringify(parsed, null, 2);
    return { parsed, error: null, formatted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    return { parsed: null, error: msg, formatted: cleaned };
  }
}

// ============================================================================
// Sort-specific validation
// ============================================================================

type SortValidationResult = {
  valid: boolean;
  error: string;
  formatted: string;
  position: number | null;
};

/**
 * Validate a sort option string. Must be a flat object with values of 1 or -1.
 * Accepts lenient JS syntax (unquoted keys).
 *
 * Examples:
 *   `{ "createdAt": -1 }`           → valid
 *   `{ createdAt: -1 }`             → valid (lenient)
 *   `{ _id: 1, name: -1 }`         → valid
 *   `{ createdAt: -5 }`             → invalid (value must be 1 or -1)
 *   `{ createdAt: "asc" }`          → invalid (value must be 1 or -1)
 *   `[{ createdAt: -1 }]`          → invalid (must be object, not array)
 *   `{ nested: { field: 1 } }`     → invalid (must be flat)
 */
export function validateSortJson(text: string): SortValidationResult {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '{}') {
    return { valid: true, error: '', formatted: '{}', position: null };
  }

  const { parsed, error } = lenientParseJson<Record<string, unknown>>(trimmed);
  if (error || parsed === null) {
    return {
      valid: false,
      error: error || 'Invalid JSON',
      formatted: trimmed,
      position: null,
    };
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'Sort must be an object, not an array',
      formatted: trimmed,
      position: null,
    };
  }

  const keys = Object.keys(parsed);
  if (keys.length === 0) {
    return { valid: true, error: '', formatted: '{}', position: null };
  }

  for (const key of keys) {
    const val = parsed[key];
    if (val !== 1 && val !== -1) {
      return {
        valid: false,
        error: `Sort value for "${key}" must be 1 (ascending) or -1 (descending), got ${JSON.stringify(val)}`,
        formatted: trimmed,
        position: null,
      };
    }
  }

  const formatted = JSON.stringify(parsed, null, 2);
  return { valid: true, error: '', formatted, position: null };
}

// ============================================================================
// Project-specific validation
// ============================================================================

type ProjectValidationResult = {
  valid: boolean;
  error: string;
  formatted: string;
  position: number | null;
};

/**
 * Validate a project option string. Must be a flat object with values of 0 or 1.
 *
 * Examples:
 *   `{ "name": 1, "_id": 0 }`     → valid
 *   `{ name: 1 }`                 → valid (lenient)
 *   `{ name: "yes" }`             → invalid (value must be 0 or 1)
 *   `[{ name: 1 }]`              → invalid (must be object, not array)
 */
export function validateProjectJson(text: string): ProjectValidationResult {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '{}') {
    return { valid: true, error: '', formatted: '{}', position: null };
  }

  const { parsed, error } = lenientParseJson<Record<string, unknown>>(trimmed);
  if (error || parsed === null) {
    return {
      valid: false,
      error: error || 'Invalid JSON',
      formatted: trimmed,
      position: null,
    };
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'Project must be an object, not an array',
      formatted: trimmed,
      position: null,
    };
  }

  const keys = Object.keys(parsed);
  for (const key of keys) {
    const val = parsed[key];
    if (val !== 0 && val !== 1) {
      return {
        valid: false,
        error: `Project value for "${key}" must be 0 (exclude) or 1 (include), got ${JSON.stringify(val)}`,
        formatted: trimmed,
        position: null,
      };
    }
  }

  const formatted = JSON.stringify(parsed, null, 2);
  return { valid: true, error: '', formatted, position: null };
}

// ============================================================================
// Numeric option validation
// ============================================================================

type NumericValidationResult = {
  valid: boolean;
  error: string;
};

/**
 * Validate a numeric option (Skip, Limit, Max Time MS).
 * Must be a finite non-negative integer.
 */
export function validateNumericOption(
  value: string | number,
  opts?: { min?: number; label?: string }
): NumericValidationResult {
  const min = opts?.min ?? 0;
  const label = opts?.label ?? 'Value';
  const num = typeof value === 'number' ? value : parseInt(value, 10);

  if (value === '' || value === null || value === undefined) {
    return { valid: true, error: '' };
  }

  if (!Number.isFinite(num)) {
    return { valid: false, error: `${label} must be a number` };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: `${label} must be a whole number` };
  }

  if (num < min) {
    return { valid: false, error: `${label} must be ≥ ${min}` };
  }

  return { valid: true, error: '' };
}
