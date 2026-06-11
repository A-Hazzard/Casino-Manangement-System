/**
 * Feedback Handler Functions
 *
 * Extracted handler logic for feedback CRUD operations — PATCH, PUT, DELETE
 * execution flows (pre-fetch, execute, verify, log activity, build response).
 *
 * @module app/api/lib/helpers/feedbackHandlers
 */

import {
  buildPatchUpdateData,
  buildPutUpdateData,
  logFeedbackActivity,
  type LogContextUser,
  type UserPayload,
} from '@/app/api/lib/helpers/feedbackOperations';
import { FeedbackModel } from '@/app/api/lib/models/feedback';
import { logRouteDelete, logRouteError, logRouteUpdate } from '@/app/api/lib/utils/routeLogger';
import type { FeedbackDocument } from '@shared/types';
import { NextRequest, NextResponse } from 'next/server';

type PutUpdateInput = {
  status?: string;
  archived?: boolean | null;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | Date | null;
};

type PatchBody = Record<string, unknown>;

/**
 * Executes a PATCH update on a feedback document.
 *
 * @param {PatchBody} body - Parsed request body with _id and fields to update
 * @param {UserPayload} currentUser - Authenticated admin user
 * @param {string[]} userRoles - User role list for activity logging
 * @param {NextRequest} request - Original request for IP/user-agent extraction
 * @param {string} functionName - Route function name for error logging
 * @param {LogContextUser | null | undefined} logUser - User context for error logging
 * @param {number} startTime - Request start timestamp for duration tracking
 * @returns {Promise<NextResponse>} Success or error response
 */
export async function handleFeedbackPatch(
  body: PatchBody,
  currentUser: UserPayload,
  userRoles: string[],
  request: NextRequest,
  functionName: string,
  logUser: LogContextUser | null | undefined,
  startTime: number
): Promise<NextResponse> {
  const { _id } = body;

  if (!_id || typeof _id !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Feedback ID is required' },
      { status: 400 }
    );
  }

  const updateData = buildPatchUpdateData(body, currentUser);

  if (Object.keys(updateData).length === 0) {
    logRouteError(functionName, 'PATCH', '/api/feedback', 'No fields to update', logUser);
    return NextResponse.json(
      { success: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  const existingFeedbackDoc = await FeedbackModel.findOne({ _id }).lean<FeedbackDocument>();
  if (!existingFeedbackDoc) {
    logRouteError(functionName, 'PATCH', '/api/feedback', 'Feedback not found', logUser);
    return NextResponse.json(
      { success: false, error: 'Feedback not found' },
      { status: 404 }
    );
  }

  const result = await FeedbackModel.updateOne({ _id }, { $set: updateData });

  if (result.matchedCount === 0) {
    logRouteError(functionName, 'PATCH', '/api/feedback', 'Feedback not found', logUser);
    return NextResponse.json(
      { success: false, error: 'Feedback not found' },
      { status: 404 }
    );
  }

  await logFeedbackActivity({
    request,
    action: 'update',
    feedbackId: _id,
    currentUser,
    userRoles,
    existingFeedback: existingFeedbackDoc,
    updateData,
    resourceName: 'Feedback update',
    details: `Admin updated feedback (PATCH): ${JSON.stringify(updateData)}`,
    newData: updateData,
  });

  const duration = Date.now() - startTime;
  logRouteUpdate(functionName, 'PATCH', '/api/feedback', 1, logUser, duration);

  return NextResponse.json(
    {
      success: true,
      message: 'Feedback updated successfully',
      feedback: { ...existingFeedbackDoc, ...updateData },
    },
    { status: 200 }
  );
}

/**
 * Executes a PUT (full) update on a feedback document with verified archived status.
 *
 * @param {PutUpdateInput & { _id: string }} validatedData - Zod-validated update data
 * @param {UserPayload} currentUser - Authenticated admin user
 * @param {string[]} userRoles - User role list for activity logging
 * @param {NextRequest} request - Original request for IP/user-agent extraction
 * @param {string} functionName - Route function name for error logging
 * @param {LogContextUser | null | undefined} logUser - User context for error logging
 * @returns {Promise<NextResponse>} Success or error response
 */
export async function handleFeedbackPut(
  validatedData: PutUpdateInput & { _id: string },
  currentUser: UserPayload,
  userRoles: string[],
  request: NextRequest,
  functionName: string,
  logUser: LogContextUser | null | undefined
): Promise<NextResponse> {
  const { _id } = validatedData;

  const existingFeedback = await FeedbackModel.findOne({ _id }).lean<FeedbackDocument>();
  if (!existingFeedback) {
    logRouteError(functionName, 'PUT', '/api/feedback', 'Feedback not found', logUser);
    return NextResponse.json(
      { success: false, error: 'Feedback not found' },
      { status: 404 }
    );
  }

  const updateData = buildPutUpdateData(validatedData, currentUser);

  const updatedFeedback = await FeedbackModel.findOneAndUpdate(
    { _id },
    { $set: updateData },
    { new: true, lean: true, runValidators: false }
  );

  if (!updatedFeedback) {
    const errorMsg = 'Failed to update feedback - document not found or update failed';
    console.error(`[${functionName}] ${errorMsg}`);
    logRouteError(functionName, 'PUT', '/api/feedback', errorMsg, logUser);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  const verifiedDoc = await FeedbackModel.findOne({ _id }).lean<FeedbackDocument>();
  const verifiedArchived = (verifiedDoc as { archived?: boolean } | null)?.archived ?? false;
  const responseFeedback = { ...updatedFeedback, archived: verifiedArchived };

  await logFeedbackActivity({
    request,
    action: 'update',
    feedbackId: _id,
    currentUser,
    userRoles,
    existingFeedback,
    updateData,
    resourceName: `Feedback from ${existingFeedback.email || 'unknown'}`,
    newData: updatedFeedback as Record<string, unknown>,
  });

  return NextResponse.json(
    { success: true, message: 'Feedback updated successfully', feedback: responseFeedback },
    { status: 200 }
  );
}

/**
 * Permanently deletes a feedback document.
 *
 * @param {{ _id: string }} validatedData - Zod-validated delete data
 * @param {UserPayload} currentUser - Authenticated admin user
 * @param {string[]} userRoles - User role list for activity logging
 * @param {NextRequest} request - Original request for IP/user-agent extraction
 * @param {string} functionName - Route function name for error logging
 * @param {LogContextUser | null | undefined} logUser - User context for error logging
 * @param {number} startTime - Request start timestamp for duration tracking
 * @returns {Promise<NextResponse>} Success or error response
 */
export async function handleFeedbackDelete(
  validatedData: { _id: string },
  currentUser: UserPayload,
  userRoles: string[],
  request: NextRequest,
  functionName: string,
  logUser: LogContextUser | null | undefined,
  startTime: number
): Promise<NextResponse> {
  const { _id } = validatedData;

  const existingFeedback = await FeedbackModel.findOne({ _id }).lean<FeedbackDocument>();
  if (!existingFeedback) {
    logRouteError(functionName, 'DELETE', '/api/feedback', 'Feedback not found', logUser);
    return NextResponse.json(
      { success: false, error: 'Feedback not found' },
      { status: 404 }
    );
  }

  const deletedFeedback = await FeedbackModel.findOneAndDelete({ _id });
  if (!deletedFeedback) {
    logRouteError(functionName, 'DELETE', '/api/feedback', 'Failed to delete feedback', logUser);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }

  await logFeedbackActivity({
    request,
    action: 'delete',
    feedbackId: _id,
    currentUser,
    userRoles,
    existingFeedback,
  });

  const duration = Date.now() - startTime;
  logRouteDelete(functionName, 'DELETE', '/api/feedback', 1, logUser, duration);

  return NextResponse.json(
    { success: true, message: 'Feedback deleted successfully' },
    { status: 200 }
  );
}
