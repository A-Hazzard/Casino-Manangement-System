/**
 * Collections API Route
 *
 * Handles CRUD operations for machine collections with SAS metrics
 * calculation, movement tracking, role-based access, and activity logging.
 *
 * @module app/api/collection-reports/collections/route
 */

import { createCollectionWithCalculations } from '@/app/api/lib/helpers/collectionReport/creation'
import {
  buildCollectionData,
  detectCollectionChanges,
  handleRamClearToggle,
  logCollectionActivity,
  normalizeCollectionDates,
  propagateSingleCollectionDeletion,
  recalculateSasMetricsForPatch,
  resolvePreviousMetersForPatch,
  runPostUpdatePropagation,
} from '@/app/api/lib/helpers/collectionReport/collectionOperations'
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter'
import { getUserFromServer } from '@/app/api/lib/helpers/users/users'
import { connectDB } from '@/app/api/lib/middleware/db'
import { Collections } from '@/app/api/lib/models/collections'
import { Machine } from '@/app/api/lib/models/machines'
import {
  extractUserFromRequest,
  logRouteCreate,
  logRouteDelete,
  logRouteError,
  logRouteFetch,
  logRouteUpdate,
} from '@/app/api/lib/utils/routeLogger'
import type {
  CollectionDocument,
  CreateCollectionPayload,
} from '@/lib/types/collection'
import type { GamingMachine } from '@shared/types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROUTE_PATH = '/api/collection-reports/collections'

// ============================================================================
// GET — Fetch collections with filtering, searching, and pagination
// ============================================================================

/**
 * @param {string} locationReportId - Filter by location report ID
 * @param {string} location - Filter by location name or ID
 * @param {string} licencee - Filter by licencee
 * @param {string} machineId - Filter by machine ID
 * @param {boolean} incompleteOnly - Only unlinked collections
 * @param {string} beforeTimestamp - ISO date for previous collections
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort direction
 * @param {number} limit - Maximum results
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const functionName = 'GET /api/collection-reports/collections'
  const logUser = extractUserFromRequest(req)

  try {
    // STEP 1: Connect to database
    await connectDB()

    // STEP 2: Parse query parameters
    const { searchParams } = new URL(req.url)
    const locationReportId = searchParams.get('locationReportId')
    const location = searchParams.get('location') || searchParams.get('locationId')
    const collector = searchParams.get('collector')
    const isCompleted = searchParams.get('isCompleted')
    const incompleteOnly = searchParams.get('incompleteOnly')
    const machineId = searchParams.get('machineId')
    const beforeTimestamp = searchParams.get('beforeTimestamp')
    const limit = searchParams.get('limit')
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder')

    // STEP 3: Get user's accessible licencees and permissions
    const user = await getUserFromServer()
    if (!user) {
      logRouteError(functionName, 'GET', ROUTE_PATH, 'Unauthorized', logUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRoles = (user.roles as string[]) || []
    const userAccessibleLicencees = (user as { assignedLicencees?: string[] }).assignedLicencees || []
    const userLocationPermissions = (user as { assignedLocations?: string[] }).assignedLocations || []
    const isAdmin = userRoles.includes('admin') || userRoles.includes('developer') || userRoles.includes('owner')
    const licencee = searchParams.get('licencee')

    // STEP 4: Determine allowed location IDs
    const allowedLocationIds = await getUserLocationFilter(
      isAdmin ? 'all' : userAccessibleLicencees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    )

    // STEP 5: Build filter query
    const filter: Record<string, unknown> = {}
    if (locationReportId) filter.locationReportId = locationReportId

    if (location) {
      if (allowedLocationIds === 'all' || allowedLocationIds.includes(location)) {
        filter.location = location
      } else {
        return NextResponse.json([])
      }
    } else if (allowedLocationIds !== 'all') {
      filter.location = { $in: allowedLocationIds }
    }

    if (collector) filter.collector = collector
    if (isCompleted !== null && isCompleted !== undefined) filter.isCompleted = isCompleted === 'true'
    if (machineId) filter.machineId = machineId

    if (incompleteOnly === 'true') {
      filter.isCompleted = false
      filter.locationReportId = ''
      if (allowedLocationIds !== 'all') {
        filter.location = allowedLocationIds.length > 0
          ? { $in: allowedLocationIds }
          : 'IMPOSSIBLE_LOCATION'
      }
    }

    if (beforeTimestamp) filter.timestamp = { $lt: new Date(beforeTimestamp) }

    // STEP 6: Apply sorting and pagination
    let query = Collections.find(filter)
    if (sortBy) query = query.sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    if (limit) query = query.limit(parseInt(limit, 10))

    // STEP 7: Execute query and return
    const collections = await query.lean<CollectionDocument[]>()
    const duration = Date.now() - startTime
    logRouteFetch(functionName, 'GET', ROUTE_PATH, collections.length, logUser, duration)
    if (duration > 1000) console.warn(`[Collections GET] Completed in ${duration}ms`)
    return NextResponse.json(collections)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections'
    logRouteError(functionName, 'GET', ROUTE_PATH, errorMessage, logUser)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ============================================================================
// POST — Create a new collection with SAS metrics calculation
// ============================================================================

/**
 * @body {string} machineId - Machine ID
 * @body {string} location - Location name
 * @body {number} metersIn - Current meter in reading
 * @body {number} metersOut - Current meter out reading
 * @body {string} [collector] - Collector user ID
 * @body {string} [locationReportId] - Links to existing report
 * @body {string} [timestamp] - Collection timestamp
 * @body {boolean} [ramClear] - RAM clear flag
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const functionName = 'POST /api/collection-reports/collections'
  const user = extractUserFromRequest(req)

  try {
    // STEP 1: Connect and authenticate
    await connectDB()
    const apiUser = await getUserFromServer()
    if (!apiUser) {
      logRouteError(functionName, 'POST', ROUTE_PATH, 'Unauthorized', user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // STEP 2: Parse and validate
    const payload: CreateCollectionPayload = await req.json()
    const effectiveCollector = payload.collector || String(apiUser._id)
    const missingFields = [
      !payload.machineId && 'machineId',
      !payload.location && 'location',
      !effectiveCollector && 'collector',
    ].filter(Boolean) as string[]

    if (missingFields.length > 0) {
      logRouteError(functionName, 'POST', ROUTE_PATH, `Missing: ${missingFields.join(', ')}`, user)
      return NextResponse.json({ error: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 })
    }

    let finalLocationReportId = payload.locationReportId?.trim() || ''

    if (typeof payload.metersIn !== 'number' || typeof payload.metersOut !== 'number') {
      logRouteError(functionName, 'POST', ROUTE_PATH, 'Invalid meters', user)
      return NextResponse.json({ error: 'metersIn and metersOut must be valid numbers' }, { status: 400 })
    }

    // STEP 3: Get machine
    const machine = await Machine.findOne({ _id: payload.machineId }).lean<GamingMachine>()
    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    // STEP 4: Normalize dates and calculate metrics
    const normalizedDates = normalizeCollectionDates(payload)
    const calculationPayload: Record<string, unknown> = {
      ...payload,
      sasStartTime: normalizedDates.sasStartTime,
      sasEndTime: normalizedDates.sasEndTime,
      timestamp: normalizedDates.timestamp,
      collectionTime: normalizedDates.collectionTime,
    }

    const { sasMeters, movement, previousMeters, locationReportId: calculatedLocationReportId } =
      await createCollectionWithCalculations(calculationPayload)

    if (calculatedLocationReportId && calculatedLocationReportId !== finalLocationReportId) {
      finalLocationReportId = calculatedLocationReportId
    }

    // STEP 5: Build and save
    const collectionData = await buildCollectionData(
      calculationPayload, machine, sasMeters, movement,
      previousMeters, effectiveCollector, finalLocationReportId
    )
    const created = await Collections.create(collectionData)

    // STEP 6: Log activity and return
    const createdObj = created.toObject ? created.toObject() : created
    await logCollectionActivity('CREATE', createdObj as CollectionDocument, req, null, createdObj as Record<string, unknown>,
      `Created collection for machine ${payload.machineId} at location ${payload.location} (${payload.metersIn} in, ${payload.metersOut} out)`)

    const duration = Date.now() - startTime
    logRouteCreate(functionName, 'POST', ROUTE_PATH, 1, user, duration)
    if (duration > 1000) console.warn(`[Collections POST] Completed in ${duration}ms`)
    return NextResponse.json({
      success: true,
      data: created,
      calculations: { sasMeters, movement, previousMeters },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create collection'
    logRouteError(functionName, 'POST', ROUTE_PATH, errorMessage, user)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ============================================================================
// PATCH — Update a collection with recalculation of metrics
// ============================================================================

/**
 * @param {string} id - Collection ID to update
 * @body {Object} updateData - Partial collection fields
 * @body {number} [updateData.metersIn] - Updated meter in
 * @body {number} [updateData.metersOut] - Updated meter out
 * @body {string} [updateData.timestamp] - Updated timestamp
 * @body {string} [updateData.sasStartTime] - SAS window start override
 * @body {string} [updateData.sasEndTime] - SAS window end override
 */
export async function PATCH(req: NextRequest) {
  const startTime = Date.now()
  const functionName = 'PATCH /api/collection-reports/collections'
  const user = extractUserFromRequest(req)

  try {
    // STEP 1: Connect and parse
    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      logRouteError(functionName, 'PATCH', ROUTE_PATH, 'Missing id', user)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const updateData = await req.json()
    if (updateData.sasStartTime) {
      updateData.sasStartTime = typeof updateData.sasStartTime === 'string'
        ? new Date(updateData.sasStartTime) : updateData.sasStartTime
    }
    if (updateData.sasEndTime) {
      updateData.sasEndTime = typeof updateData.sasEndTime === 'string'
        ? new Date(updateData.sasEndTime) : updateData.sasEndTime
    }

    // STEP 2: Get original collection and resolve location
    const originalCollection = await Collections.findOne({ _id: id })
    if (!originalCollection) {
      logRouteError(functionName, 'PATCH', ROUTE_PATH, `Not found: ${id}`, user)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    let locationId = ''
    if (originalCollection.machineId) {
      const machineDoc = await Machine.findOne({ _id: originalCollection.machineId }).lean<GamingMachine>()
      if (machineDoc?.gamingLocation) locationId = String(machineDoc.gamingLocation)
    }

    // STEP 3: Detect changes
    const { metersChanged, timestampChanged, sasTimesChanged } =
      detectCollectionChanges(originalCollection, updateData)

    // STEP 4: Resolve previous meters if meters changed
    if (metersChanged) {
      await resolvePreviousMetersForPatch(originalCollection, updateData, id)
    }

    // STEP 5: Recalculate SAS metrics if needed
    if (timestampChanged || metersChanged || sasTimesChanged) {
      await recalculateSasMetricsForPatch(originalCollection, updateData)
    }

    // STEP 5.5: Fallback dot notation for sasMeters when recalc was skipped
    if (!updateData.sasMeters) {
      if (updateData.sasEndTime) updateData['sasMeters.sasEndTime'] = updateData.sasEndTime
      if (updateData.sasStartTime) updateData['sasMeters.sasStartTime'] = updateData.sasStartTime
    }
    const explicitSasEndTime: string | Date | undefined = updateData.sasEndTime
    delete updateData.sasEndTime
    delete updateData.sasStartTime
    delete updateData.collector

    // STEP 6: Handle RAM clear toggle
    const { unsetData } = await handleRamClearToggle(
      originalCollection, updateData, locationId, explicitSasEndTime
    )

    // STEP 7: Update collection and propagate
    const updateQuery: Record<string, unknown> = { $set: updateData }
    if (Object.keys(unsetData).length > 0) updateQuery.$unset = unsetData

    const updated = await Collections.findOneAndUpdate({ _id: id }, updateQuery, { new: true })
    if (updated) {
      await runPostUpdatePropagation(updated as unknown as CollectionDocument)
    }

    // STEP 8: Log activity and return
    const originalObj = originalCollection.toObject
      ? originalCollection.toObject() : originalCollection
    await logCollectionActivity('UPDATE', originalCollection, req,
      originalObj as Record<string, unknown>,
      (updated || originalCollection) as unknown as Record<string, unknown>)

    const duration = Date.now() - startTime
    logRouteUpdate(functionName, 'PATCH', ROUTE_PATH, 1, user, duration)
    if (duration > 1000) console.warn(`[Collections PATCH] Completed in ${duration}ms`)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update collection'
    logRouteError(functionName, 'PATCH', ROUTE_PATH, errorMessage, user)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ============================================================================
// DELETE — Delete a collection with machine meter reversion
// ============================================================================

/**
 * @param {string} id - Collection ID to delete
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now()
  const functionName = 'DELETE /api/collection-reports/collections'
  const user = extractUserFromRequest(req)

  try {
    // STEP 1: Connect and validate
    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      logRouteError(functionName, 'DELETE', ROUTE_PATH, 'Missing id', user)
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const collectionToDelete = await Collections.findOne({ _id: id })
    if (!collectionToDelete) {
      logRouteError(functionName, 'DELETE', ROUTE_PATH, `Not found: ${id}`, user)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // STEP 2: Delete collection
    const deletedCollection = await Collections.findOneAndDelete({ _id: id })
    if (!deletedCollection) {
      return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 })
    }

    // STEP 3: Propagate deletion
    if (collectionToDelete.machineId) {
      const collectionObj = collectionToDelete.toObject
        ? collectionToDelete.toObject() as CollectionDocument
        : collectionToDelete as unknown as CollectionDocument
      await propagateSingleCollectionDeletion(collectionObj)
    }

    // STEP 4: Log activity and return
    const deleteObj = collectionToDelete.toObject
      ? collectionToDelete.toObject() : collectionToDelete
    await logCollectionActivity('DELETE', collectionToDelete, req,
      deleteObj as Record<string, unknown>, null)

    const duration = Date.now() - startTime
    logRouteDelete(functionName, 'DELETE', ROUTE_PATH, 1, user, duration)
    if (duration > 1000) console.warn(`[Collections DELETE] Completed in ${duration}ms`)
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete collection'
    logRouteError(functionName, 'DELETE', ROUTE_PATH, errorMessage, user)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
