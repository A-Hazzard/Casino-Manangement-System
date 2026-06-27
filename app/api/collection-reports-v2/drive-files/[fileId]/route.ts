/**
 * Collection Report V2 — Google Drive File Proxy
 *
 * GET /api/collection-reports-v2/drive-files/[fileId]
 * Fetches and proxies a file from Google Drive by file ID.
 *
 * @module app/api/collection-reports-v2/drive-files/[fileId]/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getDriveFileMeta } from '@/lib/utils/drive';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const startTime = Date.now();

  return withApiAuth(req, async () => {
  try {
    // ============================================================================
    // STEP 1: Validate fileId
    // ============================================================================
    const { fileId } = await params;
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Fetch file from Drive
    // ============================================================================
    const file = await getDriveFileMeta(fileId);

    // ============================================================================
    // STEP 3: Return file response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[GET /api/collection-reports-v2/drive-files] slow: ${duration}ms`);
    }
    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('[drive-files/[fileId]] Error serving file:', e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to serve file from Google Drive' },
      { status: 500 }
    );
  }
  });
}
