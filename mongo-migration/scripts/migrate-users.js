#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const localEnv = path.resolve(__dirname, '..', '.env');
const rootEnv = path.resolve(__dirname, '..', '..', '.env');
const envPath = fs.existsSync(localEnv) ? localEnv : rootEnv;

require('dotenv').config({ path: envPath });

async function migrateUsers() {
  const srcUri = process.env.SRC_MONGODB_URI;
  const dstUri = process.env.DST_MONGODB_URI;

  if (!srcUri || !dstUri) {
    console.error(
      'SRC_MONGODB_URI or DST_MONGODB_URI is missing from the environment.'
    );
    process.exit(1);
  }

  const srcClient = new MongoClient(srcUri, { ignoreUndefined: true });
  const dstClient = new MongoClient(dstUri, { ignoreUndefined: true });

  try {
    console.log('Connecting to source and destination databases...');
    await Promise.all([srcClient.connect(), dstClient.connect()]);

    const srcDb = srcClient.db('sas-prod');
    const dstDb = dstClient.db('sas-prod');
    const srcUsers = srcDb.collection('users');
    const dstUsers = dstDb.collection('users');

    const total = await srcUsers.countDocuments();
    console.log(`Source users count: ${total}`);

    const cursor = srcUsers.find({});
    let migrated = 0;
    const start = Date.now();

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const filter = { _id: doc._id };
      await dstUsers.replaceOne(filter, doc, { upsert: true });
      migrated += 1;
      if (migrated % 10 === 0) {
        console.log(`Migrated ${migrated}/${total} users...`);
      }
    }

    console.log(
      `✅ Migration complete. Migrated ${migrated} users in ${(Date.now() - start) / 1000}s.`
    );
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await Promise.allSettled([srcClient.close(), dstClient.close()]);
  }
}

migrateUsers();
