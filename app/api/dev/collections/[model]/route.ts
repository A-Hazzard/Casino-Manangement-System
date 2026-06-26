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
  queryBatch,
  resolveCollectionMatch,
  type MatchMode,
} from '@/app/api/lib/helpers/dev/collectionQuery';
import {
  getDevModel,
  type DevModelEntry,
} from '@/app/api/lib/helpers/dev/modelRegistry';
import { describeSchema } from '@/app/api/lib/helpers/dev/schemaIntrospection';
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

/**
 * GET /api/dev/collections/[model]
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Resolve model + parse params (date range, apiPage, search, optional machine)
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

    const hasDateRange = Boolean(startDate || endDate);
    const baseFilter: Record<string, unknown> = {
      ...buildDateFilter(dateField, startDate, endDate),
    };
    if (machine) baseFilter.machine = machine;

    // ==========================================================================
    // STEP 3: Export mode — all matching docs, no pagination
    // ==========================================================================
    if (searchParams.get('export') === 'true') {
      const format = searchParams.get('format') === 'json' ? 'json' : 'csv';
      const allDocs = (await entry.model.collection
        .find(baseFilter)
        .sort(entry.defaultSort)
        .toArray()) as Record<string, unknown>[];

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
    const batch = await queryBatch(entry, baseFilter, apiPage, hasDateRange);

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
