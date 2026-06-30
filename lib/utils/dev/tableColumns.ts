/**
 * Column derivation + cell formatting for the developer DB explorer table.
 *
 * Restores the original meters table layout: each top-level field is its own
 * column with its `movement.*` delta shown as a sub-line, `machine`/`location`
 * and the primary date field hidden (the date is shown under `_id`). Generalised
 * so non-meter models (no `movement`) degrade to plain top-level columns.
 */

import type { DevCollectionRecord } from '@shared/types/dev';

const DATE_COLS = new Set(['readAt', 'createdAt', 'updatedAt', 'deletedAt']);
const DATE_HINT = /(at|date|time)$/i;

/** Fixed meters column order — cumulative value + movement delta interleaved. */
export const METER_PREFERRED_ORDER = [
  '_id',
  'meterSource',
  'isRamClear',
  'isSupplemental',
  'drop',
  'movement.drop',
  'totalCancelledCredits',
  'movement.totalCancelledCredits',
  'coinIn',
  'movement.coinIn',
  'coinOut',
  'movement.coinOut',
  'jackpot',
  'movement.jackpot',
  'currentCredits',
  'gamesPlayed',
  'movement.gamesPlayed',
  'gamesWon',
  'movement.gamesWon',
  'totalWonCredits',
  'movement.totalWonCredits',
  'totalHandPaidCancelledCredits',
  'movement.handPaidCancelledCredits',
  'locationSession',
  'createdAt',
  'updatedAt',
  'deletedAt',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Resolves a dotted path (`movement.drop`) against a record. */
export function getNestedValue(
  record: DevCollectionRecord,
  path: string
): unknown {
  if (!path.includes('.')) return record[path];
  let current: unknown = record;
  for (const segment of path.split('.')) {
    if (!isPlainObject(current)) return undefined;
    current = current[segment];
  }
  return current;
}

/** Formats a cell value for display, parsing date-like columns. */
export function formatCellValue(col: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  const leaf = col.includes('.') ? col.slice(col.lastIndexOf('.') + 1) : col;
  if (
    (DATE_COLS.has(leaf) || DATE_HINT.test(leaf)) &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    const date = new Date(value as string);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    // Arrays of primitives → comma-joined; arrays of objects → count label
    const allPrimitive = value.every(
      v => v === null || typeof v !== 'object'
    );
    if (allPrimitive) {
      const joined = value.map(v => (v === null ? 'null' : String(v))).join(', ');
      return joined.length > 120 ? joined.slice(0, 117) + '…' : joined;
    }
    return `[${value.length} item${value.length !== 1 ? 's' : ''}]`;
  }
  if (typeof value === 'object' && value !== null) {
    // Render as "key: value" lines, one per entry, max ~6 entries shown
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.slice(0, 6).map(([k, v]) => {
      if (v === null || v === undefined) return `${k}: —`;
      if (typeof v === 'object') return `${k}: {…}`;
      const s = String(v);
      return `${k}: ${s.length > 40 ? s.slice(0, 37) + '…' : s}`;
    });
    if (entries.length > 6) lines.push(`…+${entries.length - 6} more`);
    return lines.join('\n');
  }
  return String(value);

}

/** The set of `movement` sub-keys present across the records. */
export function getMovementKeys(records: DevCollectionRecord[]): Set<string> {
  const keys = new Set<string>();
  for (const record of records) {
    const movement = record.movement;
    if (isPlainObject(movement)) {
      for (const sub of Object.keys(movement)) keys.add(sub);
    }
  }
  return keys;
}

/** Builds the hidden-column set (machine/location + the primary date field). */
export function buildHideSet(primaryDateField?: string): Set<string> {
  const hide = new Set(['machine', 'location']);
  if (primaryDateField) hide.add(primaryDateField);
  return hide;
}

/**
 * Derives the ordered column list. Mirrors the original meters logic: preferred
 * order first, then any extra `movement.*` deltas, then remaining top-level
 * fields — minus the hidden set. `_id` always leads.
 */
export function deriveColumns(
  records: DevCollectionRecord[],
  options: { preferredOrder?: string[]; hide?: Set<string> } = {}
): string[] {
  const preferredOrder = options.preferredOrder ?? [];
  const hide = options.hide ?? new Set<string>();

  if (records.length === 0) {
    return preferredOrder.filter(col => !hide.has(col));
  }

  const seen = new Set<string>();
  const movCols = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (key !== 'movement') seen.add(key);
    }
    const movement = record.movement;
    if (isPlainObject(movement)) {
      for (const sub of Object.keys(movement)) movCols.add(sub);
    }
  }

  const result: string[] = [];
  for (const col of preferredOrder) {
    if (hide.has(col)) continue;
    result.push(col);
  }
  for (const sub of movCols) {
    const prefixed = `movement.${sub}`;
    if (!hide.has(sub) && !result.includes(prefixed)) result.push(prefixed);
  }
  for (const col of seen) {
    if (!hide.has(col) && !result.includes(col) && !col.startsWith('movement.')) {
      result.push(col);
    }
  }

  // Guarantee _id leads, followed immediately by the primary timestamp column.
  const DATE_PRIORITY = ['createdAt', 'readAt'];
  const dateCol = DATE_PRIORITY.find(col => result.includes(col));
  const withoutPinned = result.filter(col => col !== '_id' && col !== dateCol);
  return ['_id', ...(dateCol ? [dateCol] : []), ...withoutPinned];
}
