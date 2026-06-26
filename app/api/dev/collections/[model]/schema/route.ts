/**
 * Developer DB Explorer — Model Schema API
 *
 * Returns the flat field descriptors and date fields for one registry model so
 * the explorer can render the structured edit form and date-filter options.
 *
 * @module app/api/dev/collections/[model]/schema/route
 *
 * Features:
 * - Developer-role only
 * - Field descriptors (kind, required, editable, enum) via schema introspection
 * - Selectable Date fields + the model's default date field
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getDevModel } from '@/app/api/lib/helpers/dev/modelRegistry';
import {
  describeSchema,
  listDateFields,
} from '@/app/api/lib/helpers/dev/schemaIntrospection';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dev/collections/[model]/schema
 *
 * Flow:
 * 1. Authenticate — developer role required
 * 2. Resolve the registry model
 * 3. Introspect the schema → fields + date fields
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
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
    // STEP 2: Resolve the registry model
    // ==========================================================================
    const { model } = await params;
    const entry = getDevModel(model);
    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Unknown model' },
        { status: 404 }
      );
    }

    // ==========================================================================
    // STEP 3: Introspect
    // ==========================================================================
    const dateFields = listDateFields(entry.model);
    const defaultDateField = dateFields.includes(entry.defaultDateField)
      ? entry.defaultDateField
      : (dateFields[0] ?? null);

    return NextResponse.json({
      success: true,
      fields: describeSchema(entry.model),
      dateFields,
      defaultDateField,
    });
  });
}
