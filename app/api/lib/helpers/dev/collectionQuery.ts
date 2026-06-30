/**
 * Developer DB Explorer — Generic Collection Query & Mutation Helpers
 *
 * The model-agnostic engine behind the dev-collections routes. Generalises the
 * cabinet meters route internals (date filtering, batched pagination, free-text
 * search seek, CSV/JSON export) to any registry model, plus value coercion for
 * structured edits.
 *
 * @module app/api/lib/helpers/dev/collectionQuery
 *
 * Operates on the native `model.collection` so listings/deletes intentionally
 * bypass the soft-delete pre-hooks and surface archived documents — matching the
 * existing `app/api/cabinets/[cabinetId]/meters/route.ts` behaviour.
 */

import { NextResponse } from 'next/server';
import type { DevFieldDescriptor } from '@shared/types/dev';
import type { DevModelEntry } from './modelRegistry';

export const BATCH_SIZE = 100;

export type MatchMode = 'contains' | 'exact';

export type CollectionMatchResult = {
  matchIndex: number;
  matchCount: number;
  matched: boolean;
};

export type CollectionBatch = {
  data: Record<string, unknown>[];
  total: number | null;
  hasMore: boolean;
};

// ============================================================================
// Filter construction
// ============================================================================

/** Builds a `{ [dateField]: { $gte, $lte } }` filter, or `{}` when no range. */
export function buildDateFilter(
  dateField: string,
  startDate: string | null,
  endDate: string | null
): Record<string, unknown> {
  if (!startDate && !endDate) return {};
  const range: Record<string, Date> = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) range.$lte = new Date(endDate);
  return { [dateField]: range };
}

// ============================================================================
// Batched pagination
// ============================================================================

/**
 * Fetches one BATCH_SIZE page. With no date range (All Time) it skips the
 * expensive count: fetches BATCH_SIZE+1 rows, derives `hasMore` from the extra
 * row and returns `total: null` so the UI shows rolling pagination. With a date
 * range it counts so the UI can show an exact "of N".
 */
export async function queryBatch(
  entry: DevModelEntry,
  filter: Record<string, unknown>,
  apiPage: number,
  hasDateRange: boolean,
  effectiveSort?: Record<string, 1 | -1>,
  effectiveLimit?: number,
  projectOption?: string,
  skipOverride?: number,
  maxTimeMS?: number
): Promise<CollectionBatch> {
  const skip = (apiPage - 1) * BATCH_SIZE;
  const collection = entry.model.collection;
  const sortOption = effectiveSort || entry.defaultSort;

  // If a custom limit is set, we need exact count to page correctly, so treat it similarly to having a date range
  const forceCount = hasDateRange || effectiveLimit !== undefined;

  // Build cursor with optional project/maxTimeMS
  function applyCursorOptions(cursor: ReturnType<typeof collection.find>) {
    if (projectOption) {
      try { cursor.project(JSON.parse(projectOption)); } catch { /* ignore */ }
    }
    if (maxTimeMS && maxTimeMS > 0) cursor.maxTimeMS(maxTimeMS);
    return cursor;
  }

  if (!forceCount) {
    const cursor = applyCursorOptions(
      collection.find(filter).sort(sortOption).skip(skip).limit(BATCH_SIZE + 1)
    );
    const rows = await cursor.toArray();
    const hasMore = rows.length > BATCH_SIZE;
    return {
      data: hasMore ? rows.slice(0, BATCH_SIZE) : rows,
      total: null,
      hasMore,
    };
  }

  const queryLimit = effectiveLimit !== undefined ? Math.min(effectiveLimit - skip, BATCH_SIZE) : BATCH_SIZE;
  
  if (effectiveLimit !== undefined && skip >= effectiveLimit) {
    return { data: [], total: effectiveLimit, hasMore: false };
  }

  const [rows, totalCount] = await Promise.all([
    applyCursorOptions(
      collection.find(filter).sort(sortOption).skip(skip).limit(queryLimit > 0 ? queryLimit : 0)
    ).toArray(),
    collection.countDocuments(filter),
  ]);

  const total = effectiveLimit !== undefined ? Math.min(totalCount, effectiveLimit) : totalCount;
  const hasMore = effectiveLimit !== undefined 
    ? (skip + rows.length < total && skip + rows.length < effectiveLimit)
    : (skip + rows.length < total);

  return { data: rows, total, hasMore };
}

// ============================================================================
// Free-text search seek (generalised from helpers/metersSearch.ts)
// ============================================================================

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSafeFieldPath(column: string): boolean {
  return /^[A-Za-z0-9_.]+$/.test(column);
}

/** Lowercased string of a single (possibly dotted) field's scalar value. */
function singleFieldBlob(fieldRef: string): Record<string, unknown> {
  return {
    $toLower: {
      $cond: [
        { $in: [{ $type: fieldRef }, ['object', 'array']] },
        '',
        { $toString: { $ifNull: [fieldRef, ''] } },
      ],
    },
  };
}

/** Space-joined string of every top-level scalar value on the document. */
function rootScalarBlob(): Record<string, unknown> {
  return {
    $toLower: {
      $reduce: {
        input: { $objectToArray: '$$ROOT' },
        initialValue: '',
        in: {
          $concat: [
            '$$value',
            ' ',
            {
              $cond: [
                { $in: [{ $type: '$$this.v' }, ['object', 'array']] },
                '',
                { $toString: { $ifNull: ['$$this.v', ''] } },
              ],
            },
          ],
        },
      },
    },
  };
}

function buildSearchBlobExpr(column?: string): Record<string, unknown> {
  if (column && isSafeFieldPath(column)) {
    return singleFieldBlob(`$${column}`);
  }
  return rootScalarBlob();
}

function buildPattern(
  escaped: string,
  column: string | undefined,
  matchMode: MatchMode
): string {
  if (matchMode === 'exact') {
    return column ? `^${escaped}$` : `(^| )${escaped}( |$)`;
  }
  return escaped;
}

/** Splits `{ field: -1, _id: -1 }` into its primary sort field + direction. */
function primarySort(
  sort: Record<string, 1 | -1>
): { field: string | null; dir: 1 | -1 } {
  for (const [field, dir] of Object.entries(sort)) {
    if (field !== '_id') return { field, dir };
  }
  return { field: null, dir: sort._id ?? -1 };
}

/**
 * Resolves the 0-based global index of the Nth matching document (in the model's
 * default sort order) plus the total match count. A $facet returns the count and
 * the Nth match's sort keys in one pass; the index is then the number of
 * documents that sort before it — the rank technique the meters/activity-log
 * seeks use.
 */
export async function resolveCollectionMatch(
  entry: DevModelEntry,
  baseFilter: Record<string, unknown>,
  search: string,
  column: string,
  matchOrdinal: number,
  matchMode: MatchMode
): Promise<CollectionMatchResult> {
  const term = search.trim().toLowerCase();
  if (!term) return { matchIndex: -1, matchCount: 0, matched: false };

  const escaped = escapeRegex(term);
  const pattern = buildPattern(escaped, column || undefined, matchMode);
  const ordinal = Number.isFinite(matchOrdinal) ? Math.max(0, matchOrdinal) : 0;
  const { field, dir } = primarySort(entry.defaultSort);
  const collection = entry.model.collection;

  const project: Record<string, 1> = { _id: 1 };
  if (field) project[field] = 1;

  const facetResult = await collection
    .aggregate<{
      total: { n: number }[];
      nth: Record<string, unknown>[];
    }>(
      [
        { $match: baseFilter },
        { $addFields: { _searchBlob: buildSearchBlobExpr(column) } },
        { $match: { _searchBlob: { $regex: pattern } } },
        { $sort: entry.defaultSort },
        {
          $facet: {
            total: [{ $count: 'n' }],
            nth: [{ $skip: ordinal }, { $limit: 1 }, { $project: project }],
          },
        },
      ],
      { allowDiskUse: true }
    )
    .toArray();

  const facet = facetResult[0];
  const matchCount = facet?.total?.[0]?.n ?? 0;
  const nth = facet?.nth?.[0];
  if (!nth) return { matchIndex: -1, matchCount, matched: false };

  // Global index = number of documents that sort before the match. The
  // comparison operator follows the sort direction (desc → $gt, asc → $lt).
  const cmp = dir === -1 ? '$gt' : '$lt';
  const idClause = { [cmp]: ['$_id', nth._id] };
  const beforeFilter: Record<string, unknown> = field
    ? {
        ...baseFilter,
        $expr: {
          $or: [
            { [cmp]: [`$${field}`, nth[field]] },
            {
              $and: [{ $eq: [`$${field}`, nth[field]] }, idClause],
            },
          ],
        },
      }
    : { ...baseFilter, $expr: idClause };

  const matchIndex = await collection.countDocuments(beforeFilter);
  return { matchIndex, matchCount, matched: true };
}

// ============================================================================
// Export
// ============================================================================

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Union of top-level keys across the docs, `_id` first. */
export function deriveExportColumns(docs: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const doc of docs) {
    for (const key of Object.keys(doc)) seen.add(key);
  }
  seen.delete('_id');
  return ['_id', ...Array.from(seen)];
}

export function exportCsv(
  docs: Record<string, unknown>[],
  columns: string[],
  filename: string
): NextResponse {
  const rows: string[] = [columns.map(escapeCsv).join(',')];
  for (const doc of docs) {
    rows.push(columns.map(col => escapeCsv(doc[col])).join(','));
  }
  const content = '﻿' + rows.join('\r\n');
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}

export function exportJson(
  docs: Record<string, unknown>[],
  filename: string
): NextResponse {
  return new NextResponse(JSON.stringify(docs, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  });
}

// ============================================================================
// Shell command parsing
// ============================================================================

export type ParsedShellCommand = {
  type: 'find' | 'aggregate' | 'count' | 'distinct' | 'unknown';
  filter?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
  field?: string;
  options?: {
    sort?: Record<string, 1 | -1>;
    limit?: number;
    skip?: number;
    project?: Record<string, 0 | 1>;
  };
  raw: string;
};

/**
 * Safely parse a JSON value from a shell command argument.
 */
function parseShellArg(text: string, start: number): { value: unknown; end: number } | null {
  if (start >= text.length) return null;
  // Object
  if (text[start] === '{') {
    let depth = 0;
    let end = start;
    for (let index = start; index < text.length; index++) {
      if (text[index] === '{') depth++;
      if (text[index] === '}') depth--;
      if (depth === 0) { end = index + 1; break; }
    }
    if (depth !== 0) return null;
    try {
      return { value: JSON.parse(text.slice(start, end)), end };
    } catch {
      const unquoted = text.slice(start, end).replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      try {
        return { value: JSON.parse(unquoted), end };
      } catch {
        return null;
      }
    }
  }
  // Array
  if (text[start] === '[') {
    let depth = 0;
    let end = start;
    for (let index = start; index < text.length; index++) {
      if (text[index] === '[') depth++;
      if (text[index] === ']') depth--;
      if (depth === 0) { end = index + 1; break; }
    }
    if (depth !== 0) return null;
    try {
      return { value: JSON.parse(text.slice(start, end)), end };
    } catch {
      return null;
    }
  }
  // String
  if (text[start] === "'" || text[start] === '"') {
    const quote = text[start];
    let end = start + 1;
    while (end < text.length && text[end] !== quote) {
      if (text[end] === '\\') end++;
      end++;
    }
    if (end >= text.length) return null;
    return { value: text.slice(start + 1, end), end: end + 1 };
  }
  return null;
}

/**
 * Extract chained methods (`.sort()`, `.limit()`, `.skip()`, `.project()`)
 * from a shell command string after the base call.
 */
function extractChainMethods(text: string, afterCall: number): ParsedShellCommand['options'] {
  const options: ParsedShellCommand['options'] = {};
  const chainRegex = /\.(sort|limit|skip|project)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = chainRegex.exec(text)) !== null) {
    if (match.index < afterCall) continue;
    const argStart = match.index + match[0].length;
    const arg = parseShellArg(text, argStart);
    if (!arg) continue;
    switch (match[1]) {
      case 'sort':
        options.sort = arg.value as Record<string, 1 | -1>;
        break;
      case 'limit':
        options.limit = Number(arg.value);
        break;
      case 'skip':
        options.skip = Number(arg.value);
        break;
      case 'project':
        options.project = arg.value as Record<string, 0 | 1>;
        break;
    }
  }
  return options;
}

/**
 * Parses a MongoDB shell command string into a structured operation.
 *
 * Supports:
 *   db.collection.find({ filter }).sort({}).limit(N).skip(N)
 *   db.collection.aggregate([...])
 *   db.collection.countDocuments({ filter })
 *   db.collection.distinct('field', { filter })
 */
export function parseShellCommand(command: string): ParsedShellCommand {
  const trimmed = command.trim();
  const result: ParsedShellCommand = { type: 'unknown', raw: trimmed };

  const stripped = trimmed.replace(/^db\.\w+\s*\.\s*/, '');

  // find({...})
  const findMatch = stripped.match(/^find\s*\(/);
  if (findMatch) {
    const argStart = findMatch.index! + findMatch[0].length;
    const arg = parseShellArg(stripped, argStart);
    if (!arg) return result;
    result.type = 'find';
    result.filter = arg.value as Record<string, unknown>;
    result.options = extractChainMethods(stripped, arg.end);
    return result;
  }

  // aggregate([...])
  const aggMatch = stripped.match(/^aggregate\s*\(/);
  if (aggMatch) {
    const argStart = aggMatch.index! + aggMatch[0].length;
    const arg = parseShellArg(stripped, argStart);
    if (!arg) return result;
    result.type = 'aggregate';
    result.pipeline = arg.value as Record<string, unknown>[];
    return result;
  }

  // countDocuments({...})
  const countMatch = stripped.match(/^countDocuments\s*\(/);
  if (countMatch) {
    const argStart = countMatch.index! + countMatch[0].length;
    const arg = parseShellArg(stripped, argStart);
    if (!arg) return result;
    result.type = 'count';
    result.filter = arg.value as Record<string, unknown>;
    return result;
  }

  // distinct('field', {...})
  const distinctMatch = stripped.match(/^distinct\s*\(/);
  if (distinctMatch) {
    const argStart = distinctMatch.index! + distinctMatch[0].length;
    const fieldArg = parseShellArg(stripped, argStart);
    if (!fieldArg || typeof fieldArg.value !== 'string') return result;
    result.field = fieldArg.value;
    const filterArg = parseShellArg(stripped, fieldArg.end + 1);
    if (filterArg) {
      result.filter = filterArg.value as Record<string, unknown>;
    }
    result.type = 'distinct';
    return result;
  }

  return result;
}

// ============================================================================
// Value coercion for structured edits
// ============================================================================

/**
 * Coerces a raw request value to the type expected by a schema field before it
 * is written via $set. Returns `null` for an explicit null/empty clear. Unknown
 * or unmatched fields fall through unchanged.
 */
export function coerceValue(
  value: unknown,
  descriptor: DevFieldDescriptor | undefined
): unknown {
  if (value === null) return null;
  if (!descriptor) return value;

  switch (descriptor.kind) {
    case 'number': {
      if (value === '' || value === undefined) return null;
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    }
    case 'boolean':
      return value === true || value === 'true';
    case 'date': {
      if (value === '' || value === undefined) return null;
      const date = new Date(value as string);
      return Number.isNaN(date.getTime()) ? value : date;
    }
    case 'string':
    case 'objectId':
      return value === '' ? null : String(value);
    default:
      return value;
  }
}

/**
 * Builds the coerced `$set` object for a structured edit. Only descriptor-known,
 * editable fields are applied — guards against writing arbitrary keys.
 */
export function buildSetObject(
  raw: Record<string, unknown>,
  fields: DevFieldDescriptor[]
): Record<string, unknown> {
  const byPath = new Map(fields.map(field => [field.path, field]));
  const set: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(raw)) {
    const descriptor = byPath.get(path);
    if (!descriptor || !descriptor.editable) continue;
    set[path] = coerceValue(value, descriptor);
  }
  return set;
}
