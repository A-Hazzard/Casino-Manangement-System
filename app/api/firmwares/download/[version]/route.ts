import { connectDB } from '@/app/api/lib/middleware/db';
import { Firmware } from '@/app/api/lib/models/firmware';
import { GridFSBucket } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/firmwares/download/[version]
 * Downloads a firmware file by version (e.g. /api/firmwares/download/v1.0.1)
 * This endpoint is used by SMIBs for OTA updates
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const bucket = new GridFSBucket(db, { bucketName: 'firmwares' });
    const { version } = await params;

    console.log(`📥 [FIRMWARE DOWNLOAD] Requested version: ${version}`);

    // Find the firmware document by version
    const firmwareDoc = await Firmware.findOne({
      version: version,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).lean();

    if (!firmwareDoc) {
      console.error(
        `❌ [FIRMWARE DOWNLOAD] Firmware version ${version} not found`
      );
      return NextResponse.json(
        { error: `Firmware version ${version} not found` },
        { status: 404 }
      );
    }

    // Type assertion for firmware document
    const firmware = firmwareDoc as unknown as {
      fileId: Parameters<typeof bucket.openDownloadStream>[0];
      fileName: string;
    };

    console.log(`✅ [FIRMWARE DOWNLOAD] Found firmware: ${firmware.fileName}`);

    // Create download stream from GridFS
    const downloadStream = bucket.openDownloadStream(firmware.fileId);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log(
      `✅ [FIRMWARE DOWNLOAD] Serving ${firmware.fileName} (${buffer.length} bytes)`
    );

    // Return the file with appropriate headers for SMIB OTA
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${firmware.fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('❌ [FIRMWARE DOWNLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download firmware' },
      { status: 500 }
    );
  }
}
