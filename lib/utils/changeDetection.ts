/**
 * Utility functions for detecting changes between objects
 * Used for activity logging to only log actual changes
 */

export type ChangeItem = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  path: string; // Full path to the field (e.g., "profile.firstName")
};

/**
 * Deep comparison of two objects to detect changes
 * Returns an array of changes with field paths and values
 */
export function detectChanges(
  oldObject: Record<string, unknown>,
  newObject: Record<string, unknown>,
  basePath = ''
): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldObject),
    ...Object.keys(newObject),
  ]);

  for (const key of allKeys) {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    const oldValue = oldObject[key];
    const newValue = newObject[key];

    // Handle null/undefined cases
    if (oldValue === undefined && newValue === undefined) {
      continue; // No change
    }

    if (oldValue === undefined && newValue !== undefined) {
      // Field was added
      changes.push({
        field: key,
        oldValue: undefined,
        newValue,
        path: currentPath,
      });
      continue;
    }

    if (oldValue !== undefined && newValue === undefined) {
      // Field was removed
      changes.push({
        field: key,
        oldValue,
        newValue: undefined,
        path: currentPath,
      });
      continue;
    }

    // Both values exist, compare them
    if (isEqual(oldValue, newValue)) {
      continue; // No change
    }

    // Values are different
    if (isObject(oldValue) && isObject(newValue)) {
      // Both are objects, recurse
      const nestedChanges = detectChanges(
        oldValue as Record<string, unknown>,
        newValue as Record<string, unknown>,
        currentPath
      );
      changes.push(...nestedChanges);
    } else {
      // Primitive values or different types
      changes.push({
        field: key,
        oldValue,
        newValue,
        path: currentPath,
      });
    }
  }

  return changes;
}

/**
 * Check if two values are deeply equal
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;

  if (typeof a !== typeof b) return false;

  if (isObject(a) && isObject(b)) {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!isEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Check if a value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Format a change item for display in activity logs
 */
export function formatChangeItem(change: ChangeItem): string {
  const { field, oldValue, newValue } = change;

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (isObject(value)) return `{${Object.keys(value).length} properties}`;
    return String(value);
  };

  const oldFormatted = formatValue(oldValue);
  const newFormatted = formatValue(newValue);

  return `${field}: ${oldFormatted} → ${newFormatted}`;
}

/**
 * Filter out empty or meaningless changes
 */
export function filterMeaningfulChanges(changes: ChangeItem[]): ChangeItem[] {
  return changes.filter(change => {
    const { oldValue, newValue, path } = change;

    // Always include gamingLocation changes (it's a required field)
    if (path === 'gamingLocation') {
      return true;
    }

    // Filter out changes where both values are empty strings
    if (oldValue === '' && newValue === '') return false;

    if (
      (oldValue === undefined || oldValue === null) &&
      typeof newValue === 'string' &&
      newValue.trim() === ''
    ) {
      return false;
    }

    // Filter out changes where both values are null/undefined
    if (
      (oldValue === null || oldValue === undefined) &&
      (newValue === null || newValue === undefined)
    )
      return false;

    // Filter out changes where both values are empty arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length === 0 && newValue.length === 0) return false;
    }

    // Filter out changes where both values are empty objects
    if (isObject(oldValue) && isObject(newValue)) {
      const oldKeys = Object.keys(oldValue);
      const newKeys = Object.keys(newValue);
      if (oldKeys.length === 0 && newKeys.length === 0) return false;
    }

    return true;
  });
}

/**
 * Get a summary of changes for activity log description
 */
export function getChangesSummary(changes: ChangeItem[]): string {
  if (changes.length === 0) return 'No changes detected';
  if (changes.length === 1) return `1 change: ${formatChangeItem(changes[0])}`;

  const fieldNames = changes.map(c => c.field).join(', ');
  return `${changes.length} changes: ${fieldNames}`;
}
