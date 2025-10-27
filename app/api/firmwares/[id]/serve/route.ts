import { connectDB } from '@/app/api/lib/middleware/db';
import { Firmware } from '@/app/api/lib/models/firmware';
import fs from 'fs';
import { GridFSBucket } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/**
 * GET /api/firmwares/[id]/serve
 * Downloads firmware from GridFS to /public/firmwares/ and returns static URL
 * Auto-cleans up file after 30 minutes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const bucket = new GridFSBucket(db, { bucketName: 'firmwares' });
    const { id } = await params;

    // Find the firmware document
    const firmwareDoc = await Firmware.findById(id).lean();
    if (!firmwareDoc) {
      return NextResponse.json(
        { error: 'Firmware not found' },
        { status: 404 }
      );
    }

    // Type assertion for firmware document
    const firmware = firmwareDoc as unknown as {
      fileId: Parameters<typeof bucket.openDownloadStream>[0];
      fileName: string;
    };

    console.log(
      `📥 [FIRMWARE SERVE] Downloading ${firmware.fileName} from GridFS`
    );

    // Create /public/firmwares directory if it doesn't exist
    const firmwaresDir = path.join(process.cwd(), 'public', 'firmwares');
    if (!fs.existsSync(firmwaresDir)) {
      fs.mkdirSync(firmwaresDir, { recursive: true });
      console.log(`📁 [FIRMWARE SERVE] Created directory: ${firmwaresDir}`);
    }

    // Full path to save the file
    const filePath = path.join(firmwaresDir, firmware.fileName);

    // Download from GridFS
    const downloadStream = bucket.openDownloadStream(firmware.fileId);
    const chunks: Buffer[] = [];

    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Write to /public/firmwares/
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ [FIRMWARE SERVE] File saved to: ${filePath}`);

    // Auto-cleanup after 30 minutes
    setTimeout(
      () => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(
              `🗑️ [FIRMWARE SERVE] Auto-cleaned up: ${firmware.fileName}`
            );
          }
        } catch (cleanupError) {
          console.error(`❌ [FIRMWARE SERVE] Cleanup failed:`, cleanupError);
        }
      },
      30 * 60 * 1000
    ); // 30 minutes

    // Return the static URL path
    const staticUrl = `/firmwares/${firmware.fileName}`;

    return NextResponse.json({
      success: true,
      fileName: firmware.fileName,
      staticUrl,
      size: buffer.length,
    });
  } catch (error) {
    console.error('❌ [FIRMWARE SERVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve firmware' },
      { status: 500 }
    );
  }
}
