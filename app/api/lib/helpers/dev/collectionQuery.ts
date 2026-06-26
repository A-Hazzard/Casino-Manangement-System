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
  hasDateRange: boolean
): Promise<CollectionBatch> {
  const skip = (apiPage - 1) * BATCH_SIZE;
  const collection = entry.model.collection;

  if (!hasDateRange) {
    const rows = await collection
      .find(filter)
      .sort(entry.defaultSort)
      .skip(skip)
      .limit(BATCH_SIZE + 1)
      .toArray();
    const hasMore = rows.length > BATCH_SIZE;
    return {
      data: hasMore ? rows.slice(0, BATCH_SIZE) : rows,
      total: null,
      hasMore,
    };
  }

  const [rows, total] = await Promise.all([
    collection
      .find(filter)
      .sort(entry.defaultSort)
      .skip(skip)
      .limit(BATCH_SIZE)
      .toArray(),
    collection.countDocuments(filter),
  ]);
  return { data: rows, total, hasMore: skip + rows.length < total };
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
