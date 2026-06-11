/**
 * Member by ID Operations
 *
 * Helpers for CRUD operations on individual member documents.
 * Handles fetching with location join, profile & field updates,
 * soft deletion, and activity logging.
 *
 * @module app/api/lib/helpers/members/memberByIdOperations
 */

// ============================================================================
// Imports
// ============================================================================

import { Member } from '@/app/api/lib/models/members';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { MemberDocument } from '@shared/types';
import type { NextRequest } from 'next/server';
import type { PipelineStage } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type MemberProfileInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  occupation?: string;
  address?: string;
  gender?: string;
  dob?: string;
};

export type MemberFieldUpdate = {
  username?: string;
  phoneNumber?: string;
  points?: number;
  uaccount?: unknown;
  gamingLocation?: string;
};

export type MemberWithLocation = MemberDocument & {
  locationName?: string;
};

export type DeleteActivityMetadata = {
  resource: string;
  resourceId: string;
  resourceName: string;
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  previousData: unknown;
  newData: null;
};

// ============================================================================
// GET: Fetch Member with Location
// ============================================================================

/**
 * Fetches a member with its associated location name via aggregation lookup.
 *
 * @param {string} memberId - Member ID to fetch
 * @returns {Promise<MemberWithLocation | null>} Member with location name or null
 */
export async function fetchMemberWithLocation(
  memberId: string
): Promise<MemberWithLocation | null> {
  const pipeline: PipelineStage[] = [
    { $match: { _id: memberId } },
    {
      $lookup: {
        from: 'gaminglocations',
        let: { memberLocation: '$gamingLocation' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$_id', '$$memberLocation'] },
                  {
                    $eq: [
                      { $toString: '$_id' },
                      { $toString: '$$memberLocation' },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'locationInfo',
      },
    },
    {
      $addFields: {
        locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
      },
    },
    {
      $project: {
        locationInfo: 0,
      },
    },
  ];

  const members = await Member.aggregate<MemberWithLocation>(
    pipeline
  ).exec();

  return members[0] || null;
}

// ============================================================================
// PUT: Update Member Profile Fields
// ============================================================================

/**
 * Updates member profile fields from input, preserving existing fields and identification.
 *
 * @param {Record<string, unknown> | undefined} profile - Existing profile fields
 * @param {MemberProfileInput | undefined} profileInput - New profile field values
 * @returns {Record<string, unknown> | null} Updated profile fields or null
 */
export function updateMemberProfileFields(
  profile: Record<string, unknown> | undefined,
  profileInput: MemberProfileInput | undefined
): Record<string, unknown> | null {
  if (!profileInput || profileInput === undefined) return null;

  const existingIdentification = (profile?.indentification as
    | { number?: string; type?: string }
    | undefined) || { number: '', type: '' };

  const safeIdentification = {
    number: existingIdentification.number || '',
    type: existingIdentification.type || '',
  };

  const updatedProfile: Record<string, unknown> = {
    firstName: (profile?.firstName as string) || '',
    lastName: (profile?.lastName as string) || '',
    email: (profile?.email as string) || '',
    occupation: (profile?.occupation as string) || '',
    address: (profile?.address as string) || '',
    gender: (profile?.gender as string) || '',
    dob: (profile?.dob as string) || '',
    indentification: safeIdentification,
  };

  const trimString = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    return '';
  };

  const updateField = (
    key: string,
    inputValue: unknown
  ): void => {
    if (inputValue !== undefined) {
      updatedProfile[key] = trimString(inputValue);
    }
  };

  updateField('firstName', profileInput.firstName);
  updateField('lastName', profileInput.lastName);
  updateField('email', profileInput.email);
  updateField('occupation', profileInput.occupation);
  updateField('address', profileInput.address);
  updateField('gender', profileInput.gender);
  updateField('dob', profileInput.dob);

  updatedProfile.indentification = safeIdentification;

  return updatedProfile;
}

// ============================================================================
// PUT: Check Unique Field (email/username)
// ============================================================================

/**
 * Checks if a member field value (username or email) is already taken by another member.
 *
 * @param {'username' | 'profile.email'} field - Field to check
 * @param {string} value - Value to check for uniqueness
 * @param {string} excludeMemberId - Member ID to exclude from check
 * @returns {Promise<boolean>} True if the value is already in use
 */
export async function checkMemberFieldUniqueness(
  field: 'username' | 'profile.email',
  value: string,
  excludeMemberId: string
): Promise<boolean> {
  const query =
    field === 'username'
      ? { username: value, _id: { $ne: excludeMemberId } }
      : { 'profile.email': value, _id: { $ne: excludeMemberId } };

  const existing = await Member.findOne(query);
  return existing !== null;
}

// ============================================================================
// PUT: Update Member Fields from Body
// ============================================================================

/**
 * Applies a field update to a member object, trimming string values.
 *
 * @template T - Value type
 * @param {Record<string, unknown>} member - Member object to update
 * @param {string} field - Field name to set
 * @param {T} value - Value to set
 */
export function applyMemberFieldUpdate<T>(
  member: Record<string, unknown>,
  field: string,
  value: T
): void {
  if (value !== undefined) {
    if (typeof value === 'string') {
      member[field] = value.trim();
    } else {
      member[field] = value;
    }
  }
}

// ============================================================================
// DELETE: Soft Delete Member
// ============================================================================

export type DeleteMemberResult = {
  success: boolean;
  member: MemberDocument | null;
};

/**
 * Soft-deletes a member by setting its deletedAt timestamp.
 *
 * @param {string} memberId - Member ID to delete
 * @returns {Promise<DeleteMemberResult>} Result with success status and deleted member
 */
export async function softDeleteMember(
  memberId: string
): Promise<DeleteMemberResult> {
  const member = await Member.findOne({ _id: memberId });

  if (!member) {
    return { success: false, member: null };
  }

  member.deletedAt = new Date();
  await member.save();

  return {
    success: true,
    member: member.toObject ? member.toObject() : member,
  };
}

// ============================================================================
// DELETE: Build Activity Log Params
// ============================================================================

/**
 * Builds activity log parameters for a member deletion event.
 *
 * @param {string} memberId - Deleted member ID
 * @param {MemberDocument} member - Deleted member document
 * @param {{ _id: string; emailAddress?: string }} currentUser - Currently authenticated user
 * @param {NextRequest} request - HTTP request for IP extraction
 * @returns {{ action: string; details: string; ipAddress?: string; userId: string; username: string; metadata: DeleteActivityMetadata }}
 */
export function buildDeleteActivityParams(
  memberId: string,
  member: MemberDocument,
  currentUser: { _id: string; emailAddress?: string },
  request: NextRequest
): {
  action: string;
  details: string;
  ipAddress?: string;
  userId: string;
  username: string;
  metadata: DeleteActivityMetadata;
} {
  return {
    action: 'DELETE',
    details: `Deleted member "${(member.username as string) || memberId}"`,
    ipAddress: getClientIP(request) || undefined,
    userId: currentUser._id,
    username: currentUser.emailAddress || '',
    metadata: {
      resource: 'member',
      resourceId: memberId,
      resourceName: member.username || memberId,
      changes: [],
      previousData: member,
      newData: null,
    },
  };
}
