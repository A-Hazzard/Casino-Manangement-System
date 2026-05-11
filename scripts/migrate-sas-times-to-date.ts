/**
 * Migration Script: Convert sasMeters.sasStartTime and sasEndTime from String to Date
 *
 * This script converts all string-formatted SAS time fields in the Collections
 * collection to proper BSON Date objects.
 *
 * Usage:
 *   bun run scripts/migrate-sas-times-to-date.ts
 *
 * Prerequisites:
 *   - Set MONGODB_URI environment variable
 *   - Ensure backup of database exists before running
 */

import mongoose from 'mongoose';

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

interface ICollectionDoc {
  _id: unknown;
  sasMeters?: {
    sasStartTime?: string | Date | null;
    sasEndTime?: string | Date | null;
  };
}

async function migrateSasTimesToDate(): Promise<void> {
  console.log(
    '🔄 Starting migration: sasMeters sasStartTime/sasEndTime String → Date\n'
  );

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection not established');
      process.exit(1);
    }

    const collections = db.collection<ICollectionDoc>('collections');

    // Find all documents where sasMeters.sasEndTime or sasMeters.sasStartTime is a string
    const stringCount = await collections.countDocuments({
      $or: [
        { 'sasMeters.sasEndTime': { $type: 'string' } },
        { 'sasMeters.sasStartTime': { $type: 'string' } },
      ],
    });

    console.log(
      `📊 Found ${stringCount} documents with string-formatted SAS times\n`
    );

    if (stringCount === 0) {
      console.log(
        '✅ No documents need migration - all SAS times are already Date type\n'
      );
      await mongoose.disconnect();
      return;
    }

    // Migration 1: Convert sasMeters.sasEndTime from string to Date
    const endTimeResult = await collections.updateMany(
      { 'sasMeters.sasEndTime': { $type: 'string' } },
      [
        {
          $set: {
            'sasMeters.sasEndTime': {
              $convert: {
                input: '$sasMeters.sasEndTime',
                to: 'date',
                onError: null,
                onNull: null,
              },
            },
          },
        },
      ]
    );
    console.log(
      `✅ Updated sasMeters.sasEndTime: ${endTimeResult?.modifiedCount ?? 0} documents`
    );

    // Migration 2: Convert sasMeters.sasStartTime from string to Date
    const startTimeResult = await collections.updateMany(
      { 'sasMeters.sasStartTime': { $type: 'string' } },
      [
        {
          $set: {
            'sasMeters.sasStartTime': {
              $convert: {
                input: '$sasMeters.sasStartTime',
                to: 'date',
                onError: null,
                onNull: null,
              },
            },
          },
        },
      ]
    );
    console.log(
      `✅ Updated sasMeters.sasStartTime: ${startTimeResult?.modifiedCount ?? 0} documents`
    );

    // Verify migration
    const remainingStringCount = await collections.countDocuments({
      $or: [
        { 'sasMeters.sasEndTime': { $type: 'string' } },
        { 'sasMeters.sasStartTime': { $type: 'string' } },
      ],
    });

    console.log(
      `\n📊 Remaining string-formatted SAS times: ${remainingStringCount}`
    );

    if (remainingStringCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log(
        '\n⚠️  Some documents could not be migrated. Check for invalid date strings.'
      );

      // Show sample of problematic documents
      const cursor = collections
        .find({
          $or: [
            { 'sasMeters.sasEndTime': { $type: 'string' } },
            { 'sasMeters.sasStartTime': { $type: 'string' } },
          ],
        })
        .limit(5);

      const problematic = await cursor.toArray();

      console.log('\nSample problematic documents:');
      problematic.forEach(doc => {
        console.log(`  _id: ${doc._id}`);
        console.log(`  sasMeters.sasEndTime: ${doc.sasMeters?.sasEndTime}`);
        console.log(`  sasMeters.sasStartTime: ${doc.sasMeters?.sasStartTime}`);
      });
    }
  } catch (error) {
    console.error(
      '\n❌ Migration failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

migrateSasTimesToDate();
