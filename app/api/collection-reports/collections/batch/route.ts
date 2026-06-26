/**
 * Batch Collection Delete API Route
 *
 * Deletes multiple collection documents in a single request, replacing the
 * previous pattern of N individual DELETE calls from bulk-select UI.
 *
 * Features:
 * - Fetches all target collections in one query
 * - Deletes all with a single deleteMany
 * - Runs propagation (meter cleanup, successor recalculation) in parallel per machine
 * - Optionally removes entries from machine.collectionMetersHistory (edit-modal path)
 *
 * @module app/api/collection-reports/collections/batch/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper'
import { propagateSingleCollectionDeletion } from '@/app/api/lib/helpers/collectionReport/collectionOperations'
import { Collections } from '@/app/api/lib/models/collections'
import { Machine } from '@/app/api/lib/models/machines'
import {
  extractUserFromRequest,
  logRouteDelete,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger'
import type { CollectionDocument } from '@/lib/types/collection'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROUTE_PATH = '/api/collection-reports/collections/batch'

/**
 * DELETE /api/collection-reports/collections/batch
 *
 * Flow:
 * 1. Parse and validate ids array from request body.
 * 2. Fetch all target collection documents in one query.
 * 3. Delete all documents with deleteMany.
 * 4. Run propagateSingleCollectionDeletion in parallel for each (safe — each collection
 *    belongs to a different machine in the bulk-select context).
 * 5. If updateCabinetHistory is true, pull deleted entry IDs from each machine's
 *    collectionMetersHistory using updateOne with $pull (avoids N PATCH HTTP calls).
 * 6. Return deleted count.
 *
 * @body {string[]} ids - Collection IDs to delete (required, non-empty)
 * @body {boolean} [updateCabinetHistory=false] - Whether to remove entries from
 *   machine.collectionMetersHistory (true for edit-modal deletions)
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now()
  const functionName = 'DELETE /api/collection-reports/collections/batch'
  const logUser = extractUserFromRequest(req)

  return withApiAuth(req, async () => {
    // STEP 1: Parse and validate body
    let ids: string[]
    let updateCabinetHistory: boolean
    try {
      const body = await req.json() as { ids?: unknown; updateCabinetHistory?: unknown }
      ids = body.ids as string[]
      updateCabinetHistory = body.updateCabinetHistory === true
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      logRouteError(functionName, 'DELETE', ROUTE_PATH, 'ids must be a non-empty array', logUser)
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }

    // STEP 2: Fetch all target collections
    const collections = await Collections.find({ _id: { $in: ids } }).lean<CollectionDocument[]>()
    if (collections.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    // STEP 3: Delete all at once
    await Collections.deleteMany({ _id: { $in: ids } })

    // STEP 4: Propagate deletion in parallel — safe because each collection in a
    // bulk-select belongs to a different machine (one collection per machine per report)
    await Promise.all(collections.map(coll => propagateSingleCollectionDeletion(coll)))

    // STEP 5: Remove entries from machine.collectionMetersHistory when requested
    // (edit-modal path — history entries track the collection's _id as their own _id)
    if (updateCabinetHistory) {
      const machineToCollIds = new Map<string, string[]>()
      for (const coll of collections) {
        if (!coll.machineId) continue
        const machineId = String(coll.machineId)
        const collIds = machineToCollIds.get(machineId) ?? []
        collIds.push(String(coll._id))
        machineToCollIds.set(machineId, collIds)
      }
      await Promise.all(
        Array.from(machineToCollIds.entries()).map(([machineId, collIds]) =>
          Machine.updateOne(
            { _id: machineId },
            { $pull: { collectionMetersHistory: { _id: { $in: collIds } } } }
          )
        )
      )
    }

    const duration = Date.now() - startTime
    logRouteDelete(functionName, 'DELETE', ROUTE_PATH, collections.length, logUser, duration)
    if (duration > 1000) console.warn(`[Collections DELETE batch] Completed in ${duration}ms`)
    return NextResponse.json({ success: true, deleted: collections.length })
  })
}
