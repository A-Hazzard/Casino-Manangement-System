/**
 * Developer DB Explorer — Collection Data API
 *
 * Generic list / search / export / edit / bulk-edit / delete for any registry
 * model. Developer-only. Operates on the native `model.collection` so it can see
 * and hard-delete archived documents (bypasses soft-delete pre-hooks), matching
 * the cabinet meters route it generalises.
 *
 * @module app/api/dev/collections/[model]/route
 *
 * Features:
 * - GET: date-filtered, batched, searchable listing + CSV/JSON export
 * - PATCH: structured single ($set on one _id) or bulk ($set across many _ids)
 * - DELETE: hard delete of one or many _ids
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  BATCH_SIZE,
  buildDateFilter,
  buildSetObject,
  deriveExportColumns,
  exportCsv,
  exportJson,
  parseShellCommand,
  queryBatch,
  resolveCollectionMatch,
  type MatchMode,
  type ParsedShellCommand,
} from '@/app/api/lib/helpers/dev/collectionQuery';
import {
  getDevModel,
  type DevModelEntry,
} from '@/app/api/lib/helpers/dev/modelRegistry';
import { describeSchema } from '@/app/api/lib/helpers/dev/schemaIntrospection';
import { lenientParseJson } from '@/lib/utils/dev/parseJsonOption';
import type { DevCollectionRecord, DevShellCommandResponse } from '@shared/types/dev';
import type { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

/** Our `_id`s are strings; the native driver types `_id` as ObjectId. */
function idInFilter(ids: string[]): { _id: { $in: ObjectId[] } } {
  return { _id: { $in: ids as unknown as ObjectId[] } };
}

/** Fresh 403 response — never reuse a NextResponse instance across requests. */
function forbidden(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  );
}

/** Resolves the registry entry, or returns a 404 response. */
function resolveEntry(
  model: string
): { entry: DevModelEntry } | { error: NextResponse } {
  const entry = getDevModel(model);
  if (!entry) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unknown model' },
        { status: 404 }
      ),
    };
  }
  return { entry };
}

// ============================================================================
// Query-builder helpers
// ============================================================================

/** Operators the UI filter builder can send. */
type FilterOp =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'startsWith'
  | 'exists' | 'notExists'
  | 'in';

type FilterClause = { field: string; op: FilterOp; value: string };

/**
 * Converts a single UI filter clause into a MongoDB field-level condition.
 * Values are left as strings; MongoDB's driver coerces numeric strings for
 * Number-type fields automatically when queried against the native collection.
 */
function clauseToMongo(clause: FilterClause): Record<string, unknown> | null {
  const { field, op, value } = clause;
  if (!field) return null;
  switch (op) {
    case 'eq':         return { [field]: value === 'true' ? true : value === 'false' ? false : value };
    case 'ne':         return { [field]: { $ne: value } };
    case 'gt':         return { [field]: { $gt: isNaN(Number(value)) ? value : Number(value) } };
    case 'gte':        return { [field]: { $gte: isNaN(Number(value)) ? value : Number(value) } };
    case 'lt':         return { [field]: { $lt: isNaN(Number(value)) ? value : Number(value) } };
    case 'lte':        return { [field]: { $lte: isNaN(Number(value)) ? value : Number(value) } };
    case 'contains':   return { [field]: { $regex: value, $options: 'i' } };
    case 'startsWith': return { [field]: { $regex: `^${value}`, $options: 'i' } };
    case 'exists':     return { [field]: { $exists: true, $ne: null } };
    case 'notExists':  return { [field]: { $in: [null, undefined] } };
    case 'in': {
      const list = value.split(',').map(v => v.trim()).filter(Boolean);
      return { [field]: { $in: list } };
    }
    default: return null;
  }
}

/**
 * Merges a UI-defined filter clause array into a MongoDB-compatible filter
 * object, combining with the existing base filter using $and.
 */
function applyFilterClauses(
  baseFilter: Record<string, unknown>,
  clauses: FilterClause[],
  logic: 'and' | 'or'
): Record<string, unknown> {
  const conditions = clauses
    .map(clauseToMongo)
    .filter((c): c is Record<string, unknown> => c !== null);
  if (conditions.length === 0) return baseFilter;
  const clauseFilter =
    conditions.length === 1
      ? conditions[0]
      : logic === 'or'
        ? { $or: conditions }
        : { $and: conditions };
  const baseKeys = Object.keys(baseFilter);
  if (baseKeys.length === 0) return clauseFilter;
  return { $and: [baseFilter, clauseFilter] };
}

/**
 * GET /api/dev/collections/[model]
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Resolve model + parse params (date range, apiPage, search, optional machine,
 *    optional filter clauses, optional sort/limit overrides)
 * 3. Export mode → all matching docs as CSV/JSON
 * 4. Search seek → locate the Nth match's batch
 * 5. Query the resolved batch + total
 * 6. Return rows + pagination + match metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  return withApiAuth(req, async ({ userRoles }) => {
    const startTime = Date.now();

    // ==========================================================================
    // STEP 1: Enforce developer-only access
    // ==========================================================================
    if (!userRoles?.includes('developer')) return forbidden();

    // ==========================================================================
    // STEP 2: Resolve model + parse params
    // ==========================================================================
    const { model } = await params;
    const resolved = resolveEntry(model);
    if ('error' in resolved) return resolved.error;
    const { entry } = resolved;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateField = searchParams.get('dateField') || entry.defaultDateField;
    const machine = searchParams.get('machine');
    const search = (searchParams.get('search') || '').trim();
    const searchColumn = (searchParams.get('searchColumn') || '').trim();
    const matchOrdinal = Math.max(
      0,
      parseInt(searchParams.get('matchOrdinal') || '0')
    );
    const matchMode: MatchMode =
      searchParams.get('matchMode') === 'exact' ? 'exact' : 'contains';
    const requestedApiPage = Math.max(
      1,
      parseInt(searchParams.get('apiPage') || '1')
    );

    // --- Query builder params ---
    const filtersParam = searchParams.get('filters');
    const filterLogic: 'and' | 'or' =
      searchParams.get('filterLogic') === 'or' ? 'or' : 'and';
    const sortFieldParam = searchParams.get('sortField') || '';
    const sortDirParam = searchParams.get('sortDir') === 'asc' ? 1 : -1;
    const limitParam = parseInt(searchParams.get('limit') || '0');

    // --- JSON query params (Compass mode) ---
    const rawFilterParam = searchParams.get('rawFilter');
    const projectParam = searchParams.get('project');
    const sortJsonParam = searchParams.get('sort');
    const skipParam = parseInt(searchParams.get('skip') || '0');
    const maxTimeMSParam = parseInt(searchParams.get('maxTimeMS') || '0');

    let filterClauses: FilterClause[] = [];
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        if (Array.isArray(parsed)) filterClauses = parsed as FilterClause[];
      } catch {
        // Ignore malformed filter JSON
      }
    }

    const hasDateRange = Boolean(startDate || endDate);

    // ==========================================================================
    // Filter assembly — "Single Filter Source" model
    // ==========================================================================
    // JSON mode (rawFilter provided): user's filter IS the complete filter.
    //   The date dropdown/time period are ignored — the user controls everything.
    //   Machine scope is still applied as a structural constraint.
    // Visual mode (no rawFilter): date filter is the base, visual clauses merge on top.
    let baseFilter: Record<string, unknown> = {};

    if (rawFilterParam) {
      // --- JSON mode: user's filter is primary ---
      try {
        baseFilter = JSON.parse(rawFilterParam) as Record<string, unknown>;
      } catch {
        console.error(
          '[DevCollection] Failed to parse rawFilter — returning unfiltered results.',
          rawFilterParam
        );
      }
      // Machine scope is a structural constraint, always applied
      if (machine) baseFilter.machine = machine;
    } else {
      // --- Visual mode: date filter + clause builder ---
      baseFilter = { ...buildDateFilter(dateField, startDate, endDate) };
      if (machine) baseFilter.machine = machine;
      baseFilter = applyFilterClauses(baseFilter, filterClauses, filterLogic);
    }

    // Sort override — JSON mode passes a full sort object; query builder passes field + dir
    let effectiveSort = entry.defaultSort as Record<string, 1 | -1>;
    if (sortJsonParam) {
      const { parsed: parsedSort } = lenientParseJson<Record<string, unknown>>(sortJsonParam);
      if (
        parsedSort &&
        typeof parsedSort === 'object' &&
        !Array.isArray(parsedSort)
      ) {
        effectiveSort = parsedSort as Record<string, 1 | -1>;
      }
    } else if (sortFieldParam) {
      effectiveSort = { [sortFieldParam]: sortDirParam as 1 | -1 };
    }

    // Limit override for query builder (0 = use default batch)
    const effectiveLimit = limitParam > 0 ? limitParam : undefined;

    // ==========================================================================
    // STEP 3: Export mode — all matching docs, no pagination
    // ==========================================================================
    if (searchParams.get('export') === 'true') {
      const format = searchParams.get('format') === 'json' ? 'json' : 'csv';
      const cursor = entry.model.collection
        .find(baseFilter)
        .sort(effectiveSort);

      // Apply project/skip/limit/maxTimeMS to export
      if (projectParam) {
        const { parsed: parsedProject } = lenientParseJson(projectParam);
        if (parsedProject && typeof parsedProject === 'object' && !Array.isArray(parsedProject)) {
          cursor.project(parsedProject as Record<string, unknown>);
        }
      }
      if (skipParam > 0) cursor.skip(skipParam);
      if (effectiveLimit) cursor.limit(effectiveLimit);
      if (maxTimeMSParam > 0) cursor.maxTimeMS(maxTimeMSParam);

      const allDocs = (await cursor.toArray()) as Record<string, unknown>[];

      const filename = `${entry.key}-${new Date().toISOString().split('T')[0]}`;
      if (format === 'json') return exportJson(allDocs, filename);
      const columnsParam = searchParams.get('columns');
      const columns = columnsParam
        ? columnsParam.split(',')
        : deriveExportColumns(allDocs);
      return exportCsv(allDocs, columns, filename);
    }

    // ==========================================================================
    // STEP 4: Search seek — locate the Nth match, override the batch page
    // ==========================================================================
    let apiPage = requestedApiPage;
    let matchIndex = -1;
    let matchCount = 0;
    if (search) {
      const result = await resolveCollectionMatch(
        entry,
        baseFilter,
        search,
        searchColumn,
        matchOrdinal,
        matchMode
      );
      matchIndex = result.matchIndex;
      matchCount = result.matchCount;
      if (result.matched) {
        apiPage = Math.floor(result.matchIndex / BATCH_SIZE) + 1;
      }
    }

    // ==========================================================================
    // STEP 5: Query the resolved batch + total
    // ==========================================================================
    const batch = await queryBatch(
      entry,
      baseFilter,
      apiPage,
      hasDateRange || filterClauses.length > 0,
      effectiveSort,
      effectiveLimit,
      projectParam || undefined,
      skipParam > 0 ? skipParam : undefined,
      maxTimeMSParam > 0 ? maxTimeMSParam : undefined
    );

    if (Date.now() - startTime > 1000) {
      console.warn(
        `[GET /api/dev/collections/${model}] Slow response: ${Date.now() - startTime}ms`
      );
    }

    // ==========================================================================
    // STEP 6: Return
    // ==========================================================================
    return NextResponse.json({
      success: true,
      data: batch.data,
      total: batch.total,
      apiPage,
      hasMore: batch.hasMore,
      matchIndex,
      matchCount,
    });
  });
}

/**
 * PATCH /api/dev/collections/[model]
 *
 * Body: { id?: string, ids?: string[], set: Record<string, unknown> }
 * Applies a coerced $set to one (`id`) or many (`ids`) documents.
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Resolve model + parse body
 * 3. Coerce the $set against the schema (editable fields only)
 * 4. updateOne / updateMany on the native collection
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  return withApiAuth(req, async ({ userRoles }) => {
    // ==========================================================================
    // STEP 1: Enforce developer-only access
    // ==========================================================================
    if (!userRoles?.includes('developer')) return forbidden();

    // ==========================================================================
    // STEP 2: Resolve model + parse body
    // ==========================================================================
    const { model } = await params;
    const resolved = resolveEntry(model);
    if ('error' in resolved) return resolved.error;
    const { entry } = resolved;

    const body = (await req.json().catch(() => null)) as {
      id?: string;
      ids?: string[];
      set?: Record<string, unknown>;
    } | null;

    const ids = body?.id ? [body.id] : (body?.ids ?? []);
    if (ids.length === 0 || !body?.set) {
      return NextResponse.json(
        { success: false, error: 'id/ids and set are required' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // STEP 3: Coerce the $set against the schema (editable fields only)
    // ==========================================================================
    const set = buildSetObject(body.set, describeSchema(entry.model));
    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No editable fields to update' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // STEP 4: Apply
    // ==========================================================================
    const result = await entry.model.collection.updateMany(idInFilter(ids), {
      $set: set,
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  });
}

/**
 * DELETE /api/dev/collections/[model]
 *
 * Body: { ids: string[] } — hard-deletes the documents (bypasses soft-delete).
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Resolve model + parse body
 * 3. deleteMany on the native collection
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  return withApiAuth(req, async ({ userRoles }) => {
    // ==========================================================================
    // STEP 1: Enforce developer-only access
    // ==========================================================================
    if (!userRoles?.includes('developer')) return forbidden();

    // ==========================================================================
    // STEP 2: Resolve model + parse body
    // ==========================================================================
    const { model } = await params;
    const resolved = resolveEntry(model);
    if ('error' in resolved) return resolved.error;
    const { entry } = resolved;

    const body = (await req.json().catch(() => null)) as {
      ids?: string[];
    } | null;
    const ids = body?.ids ?? [];
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids are required' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // STEP 3: Hard delete
    // ==========================================================================
    const result = await entry.model.collection.deleteMany(idInFilter(ids));

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  });
}

/**
 * POST /api/dev/collections/[model]
 *
 * Executes a MongoDB shell command against the selected collection.
 * Read-only operations only (find, aggregate, count, distinct).
 * Mutations (update, delete, insert) are rejected.
 *
 * Body: { command: string }
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Resolve model + parse body
 * 3. Parse shell command
 * 4. Execute against native collection
 * 5. Return results
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  return withApiAuth(req, async ({ userRoles }) => {
    // ==========================================================================
    // STEP 1: Enforce developer-only access
    // ==========================================================================
    if (!userRoles?.includes('developer')) return forbidden();

    // ==========================================================================
    // STEP 2: Resolve model + parse body
    // ==========================================================================
    const { model } = await params;
    const resolved = resolveEntry(model);
    if ('error' in resolved) return resolved.error;
    const { entry } = resolved;

    const body = (await req.json().catch(() => null)) as {
      command?: string;
    } | null;
    const command = body?.command?.trim();
    if (!command) {
      return NextResponse.json(
        { success: false, error: 'command is required' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // STEP 3: Parse shell command
    // ==========================================================================
    const parsed: ParsedShellCommand = parseShellCommand(command);
    if (parsed.type === 'unknown') {
      return NextResponse.json(
        { success: false, error: 'Unrecognised command. Supported: find(), aggregate(), countDocuments(), distinct()' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // STEP 4: Execute
    // ==========================================================================
    const collection = entry.model.collection;

    try {
      if (parsed.type === 'find') {
        let cursor = collection.find(parsed.filter || {});
        if (parsed.options?.sort) cursor = cursor.sort(parsed.options.sort);
        if (parsed.options?.skip) cursor = cursor.skip(parsed.options.skip);
        if (parsed.options?.limit) cursor = cursor.limit(parsed.options.limit);
        if (parsed.options?.project) cursor = cursor.project(parsed.options.project);
        cursor.maxTimeMS(60000);
        const data = (await cursor.toArray()) as DevCollectionRecord[];
        const response: DevShellCommandResponse = {
          success: true,
          data,
          total: data.length,
          commandType: 'find',
        };
        return NextResponse.json(response);
      }

      if (parsed.type === 'aggregate') {
        const cursor = collection.aggregate(parsed.pipeline || [], {
          allowDiskUse: true,
          maxTimeMS: 60000,
        });
        const data = (await cursor.toArray()) as DevCollectionRecord[];
        return NextResponse.json({
          success: true,
          data,
          total: data.length,
          commandType: 'aggregate',
        } satisfies DevShellCommandResponse);
      }

      if (parsed.type === 'count') {
        const total = await collection.countDocuments(parsed.filter || {});
        return NextResponse.json({
          success: true,
          data: [{ count: total }],
          total,
          commandType: 'count',
        } satisfies DevShellCommandResponse);
      }

      if (parsed.type === 'distinct') {
        const values = await collection.distinct(parsed.field || '_id', parsed.filter || {});
        const data = values.map((value: unknown, index: number) => ({
          _id: String(index),
          distinctValue: value,
        })) as DevCollectionRecord[];
        return NextResponse.json({
          success: true,
          data,
          total: data.length,
          commandType: 'distinct',
        } satisfies DevShellCommandResponse);
      }

      return NextResponse.json(
        { success: false, error: 'Unsupported command type' },
        { status: 400 }
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Command execution failed';
      console.error('[POST /api/dev/collections] Shell error:', errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
