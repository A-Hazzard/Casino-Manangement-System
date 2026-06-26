/**
 * Collection Report V2 — Google Drive File Proxy
 *
 * GET /api/collection-reports-v2/drive-files/[fileId]
 * Fetches and proxies a file from Google Drive by file ID.
 *
 * @module app/api/collection-reports-v2/drive-files/[fileId]/route
 */

import { getDriveFileMeta } from '@/lib/utils/drive';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
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
    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[drive-files/[fileId]] Error serving file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve file from Google Drive' },
      { status: 500 }
    );
  }
}
