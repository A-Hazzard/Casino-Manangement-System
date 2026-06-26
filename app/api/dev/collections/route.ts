/**
 * Developer DB Explorer — Model List API
 *
 * Returns the allow-list of collections the developer DB explorer may browse.
 *
 * @module app/api/dev/collections/route
 *
 * Features:
 * - Developer-role only
 * - Returns { key, label, group } for each explorable model
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { listDevModels } from '@/app/api/lib/helpers/dev/modelRegistry';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dev/collections
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Return the registry's public model list
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, async ({ userRoles }) => {
    // ==========================================================================
    // STEP 1: Enforce developer-only access
    // ==========================================================================
    if (!userRoles?.includes('developer')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // ==========================================================================
    // STEP 2: Return the model list
    // ==========================================================================
    return NextResponse.json({ success: true, models: listDevModels() });
  });
}
