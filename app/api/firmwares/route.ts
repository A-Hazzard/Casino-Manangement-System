import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Firmware } from '@/app/api/lib/models/firmware';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { GridFSBucket, type Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

/**
 * Main GET handler for fetching firmwares
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    try {
      const { searchParams } = new URL(request.url);
      const includeDeleted = searchParams.get('includeDeleted') === 'true';

      const query = includeDeleted ? {} : {
        $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
      };

      const firmwares = await Firmware.find(query).sort({ createdAt: -1 }).lean();
      const duration = Date.now() - startTime;
      if (duration > 1000) console.warn(`[Firmwares GET API] Completed in ${duration}ms`);
      return NextResponse.json(firmwares);
    } catch (error) {
      console.error(`[Firmwares GET API] Error:`, error);
      return NextResponse.json({ error: 'Failed to fetch firmwares' }, { status: 500 });
    }
  });
}

/**
 * POST /api/firmwares
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, db }) => {
    try {
      if (!db) throw new Error('Database connection failed');
      const bucket = new GridFSBucket(db as unknown as Db, { bucketName: 'firmwares' });


      const formData = await request.formData();
      const product = formData.get('product') as string;
      const version = formData.get('version') as string;
      const versionDetails = formData.get('versionDetails') as string;
      const file = formData.get('file') as File;

      if (!product || !version || !file) {
        return NextResponse.json({ error: 'Product, version, and file are required' }, { status: 400 });
      }

      if (!file.name.endsWith('.bin')) {
        return NextResponse.json({ error: 'Only .bin files are allowed' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      const uploadStream = bucket.openUploadStream(file.name, {
        metadata: { originalName: file.name, mimeType: file.type, size: file.size, uploadedAt: new Date() },
      });

      const fileId = uploadStream.id;
      await new Promise((resolve, reject) => {
        stream.pipe(uploadStream).on('error', reject).on('finish', resolve);
      });

      const firmwareId = await generateMongoId();
      const firmware = new Firmware({
        _id: firmwareId, product, version, versionDetails: versionDetails || '',
        fileId, fileName: file.name, fileSize: file.size, deletedAt: new Date(-1),
        releaseDate: new Date(), description: versionDetails || '', downloadUrl: '', checksum: '',
      });

      await firmware.save();

      if (currentUser && currentUser.emailAddress) {
        await logActivity({
          action: 'CREATE',
          details: `Uploaded new firmware "${product} v${version}" (${file.name})`,
          ipAddress: getClientIP(request) || undefined,
          userId: currentUser._id,
          username: currentUser.username || currentUser.emailAddress,

          metadata: {
            resource: 'Firmware',
            resourceId: firmwareId,
            resourceName: `${product} v${version}`,
            changes: [
              { field: 'product', oldValue: null, newValue: product },
              { field: 'version', oldValue: null, newValue: version },
              { field: 'fileName', oldValue: null, newValue: file.name },
            ],
          },
        });
      }

      return NextResponse.json(firmware, { status: 201 });
    } catch (error) {
      console.error('Error uploading firmware:', error);
      return NextResponse.json({ error: 'Failed to upload firmware' }, { status: 500 });
    }
  });
}

