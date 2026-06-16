/**
 * Cabinet Meters Search Helper
 *
 * Resolves the global position ("rank") of the Nth raw meter document whose
 * fields contain a free-text search term, so the Developer Tools meters table
 * can jump to any match and step through them — mirroring the activity-log
 * cursor seek (see app/api/cabinets/by-id/events/route.ts).
 *
 * @module app/api/lib/helpers/metersSearch
 *
 * Operates on the native collection (Meters.collection) so it stays consistent
 * with the listing query, which intentionally bypasses the soft-delete pre-hook
 * to include archived meters.
 */

import { Meters } from '@/app/api/lib/models/meters';

// ============================================================================
// Types
// ============================================================================

export type MeterMatchResult = {
  matchIndex: number;
  matchCount: number;
  matched: boolean;
};

// ============================================================================
// Search Blob Construction
// ============================================================================

/** Escapes regex metacharacters so user input is matched literally. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Only field paths made of these characters are accepted for column search. */
function isSafeFieldPath(column: string): boolean {
  return /^[A-Za-z0-9_.]+$/.test(column);
}

/**
 * Reduces an object's entries (from $objectToArray) into a space-joined string
 * of its scalar values. Objects/arrays are skipped because $toString cannot
 * stringify them — nested documents (e.g. `movement`) are flattened separately.
 */
function scalarReducer(entries: Record<string, unknown>): Record<string, unknown> {
  return {
    $reduce: {
      input: entries,
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
  };
}

/** Builds a lowercase string of a single field's scalar value. */
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

/**
 * Builds an aggregation expression that flattens a meter document into a single
 * lowercase string for substring matching. When `column` is supplied, only that
 * field is considered; otherwise all top-level scalar fields plus the nested
 * `movement` sub-document are included. Mirrors the client-side matching logic
 * in CabinetsDetailsDeveloperTools.
 */
function buildSearchBlobExpr(column?: string): Record<string, unknown> {
  if (column && isSafeFieldPath(column)) {
    const fieldRef = column.startsWith('movement.')
      ? `$movement.${column.slice('movement.'.length)}`
      : `$${column}`;
    return singleFieldBlob(fieldRef);
  }

  return {
    $toLower: {
      $concat: [
        scalarReducer({ $objectToArray: '$$ROOT' }),
        ' ',
        scalarReducer({ $objectToArray: { $ifNull: ['$movement', {}] } }),
      ],
    },
  };
}

// ============================================================================
// Match Resolution
// ============================================================================

export type MatchMode = 'contains' | 'exact';

type SearchFacetResult = {
  total: { n: number }[];
  nth: { _id: string; readAt: Date }[];
};

/**
 * Builds the regex pattern string for the search blob.
 *
 * - contains:         substring match anywhere in the blob
 * - exact + column:   blob is the full field value → anchor both ends (^term$)
 * - exact + all fields: blob is space-joined scalars → match a whole token
 */
function buildPattern(escaped: string, column: string | undefined, matchMode: MatchMode): string {
  if (matchMode === 'exact') {
    return column ? `^${escaped}$` : `(^| )${escaped}( |$)`;
  }
  return escaped;
}

/**
 * Resolves the 0-based global index (ordered readAt desc, then _id desc) of the
 * Nth meter matching `search`, plus the total match count, within the supplied
 * machine + date filter. A $facet returns the count and the Nth match in one
 * pass; the index is then the number of documents that sort before that match —
 * the same rank technique the activity-log seek uses.
 *
 * @param baseFilter   - The same Mongo filter used by the listing query
 *                       (e.g. { machine, readAt: { $gte, $lte } }).
 * @param search       - Free-text search term.
 * @param column       - Optional single column to restrict the search to.
 * @param matchOrdinal - Which match to seek to (0-based), for prev/next stepping.
 * @param matchMode    - Whether to match substrings ("contains") or full values ("exact").
 */
export async function resolveMeterMatch(
  baseFilter: Record<string, unknown>,
  search: string,
  column: string,
  matchOrdinal: number,
  matchMode: MatchMode = 'contains'
): Promise<MeterMatchResult> {
  const term = search.trim().toLowerCase();
  if (!term) return { matchIndex: -1, matchCount: 0, matched: false };

  const escaped = escapeRegex(term);
  const pattern = buildPattern(escaped, column || undefined, matchMode);
  const ordinal = Number.isFinite(matchOrdinal) ? Math.max(0, matchOrdinal) : 0;

  // STEP 1: Total match count + the Nth match (display order) in one pass.
  const facetResult = await Meters.collection
    .aggregate<SearchFacetResult>(
      [
        { $match: baseFilter },
        { $addFields: { _searchBlob: buildSearchBlobExpr(column) } },
        { $match: { _searchBlob: { $regex: pattern } } },
        { $sort: { readAt: -1, _id: -1 } },
        {
          $facet: {
            total: [{ $count: 'n' }],
            nth: [
              { $skip: ordinal },
              { $limit: 1 },
              { $project: { _id: 1, readAt: 1 } },
            ],
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

  // STEP 2: Global index = number of documents that sort before the match.
  // $expr keeps the _id tiebreaker without tripping the driver's _id typing.
  const matchIndex = await Meters.collection.countDocuments({
    ...baseFilter,
    $expr: {
      $or: [
        { $gt: ['$readAt', nth.readAt] },
        {
          $and: [
            { $eq: ['$readAt', nth.readAt] },
            { $gt: ['$_id', nth._id] },
          ],
        },
      ],
    },
  });

  return { matchIndex, matchCount, matched: true };
}
