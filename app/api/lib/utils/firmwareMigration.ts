import { connectDB } from '@/app/api/lib/middleware/db';
import { Firmware } from '@/app/api/lib/models/firmware';

/**
 * Migration utility to handle existing firmware records with old schema
 * This function should be called once to migrate any existing data
 */
export async function migrateFirmwareSchema() {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Find all firmware documents that might have the old schema
    const oldFirmwares = await Firmware.find({
      $or: [
        { file: { $exists: true } }, // Old schema with file object
        { fileName: { $exists: false } }, // Missing new fields
        { fileSize: { $exists: false } },
      ],
    });

    // console.log(`Found ${oldFirmwares.length} firmware records to migrate`);

    for (const firmware of oldFirmwares) {
      try {
        // If it has the old file object structure, we need to handle it
        if (firmware.file && typeof firmware.file === 'object') {
          type OldFileType = {
            originalname?: string;
            filename?: string;
            size?: number;
          };
          const oldFile: OldFileType = firmware.file;

          // Update with new schema fields
          // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
          await Firmware.findOneAndUpdate({ _id: firmware._id }, {
            $set: {
              fileName:
                oldFile.originalname || oldFile.filename || 'unknown.bin',
              fileSize: oldFile.size || 0,
            },
            $unset: {
              file: 1, // Remove the old file object
            },
          });

          // console.log(`Migrated firmware ${firmware._id}: ${firmware.product} ${firmware.version}`);
        } else {
          // If missing new fields but no old file object, set defaults
          // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
          await Firmware.findOneAndUpdate({ _id: firmware._id }, {
            $set: {
              fileName: 'unknown.bin',
              fileSize: 0,
            },
          });

          // console.log(`Set defaults for firmware ${firmware._id}: ${firmware.product} ${firmware.version}`);
        }
      } catch (error) {
        console.error(`Failed to migrate firmware ${firmware._id}:`, error);
      }
    }

    // console.log('Firmware migration completed');
  } catch (error) {
    console.error('Error during firmware migration:', error);
    throw error;
  }
}

/**
 * Check if migration is needed
 */
export async function checkMigrationNeeded(): Promise<boolean> {
  try {
    const db = await connectDB();
    if (!db) {
      return false;
    }

    const count = await Firmware.countDocuments({
      $or: [
        { file: { $exists: true } },
        { fileName: { $exists: false } },
        { fileSize: { $exists: false } },
      ],
    });

    return count > 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}
