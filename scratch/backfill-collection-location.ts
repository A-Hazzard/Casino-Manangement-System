/**
 * Backfill script: Fix collections where `location` is the location name
 * instead of the location _id.
 *
 * After the fix that sends location _id from frontend hooks, existing
 * collections still have the location name stored in the `location` field.
 *
 * Usage: bun run scratch/backfill-collection-location.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
const COLLECTION_NAME = 'collections';

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // Find all unique location values that are NOT valid 24-char hex strings (ObjectId-like)
  const allLocationValues = await db
    .collection(COLLECTION_NAME)
    .aggregate([
      { $match: { location: { $exists: true, $ne: '' } } },
      { $group: { _id: '$location' } },
    ])
    .toArray();

  const isObjectId = (v: string) => /^[a-f0-9]{24}$/i.test(v);

  const nameValues = allLocationValues
    .map(d => String(d._id))
    .filter(v => !isObjectId(v));

  if (nameValues.length === 0) {
    console.log('No collections with location name found — all already use _id');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${nameValues.length} unique location name values:`);
  console.log(nameValues.map(v => `  "${v}"`).join('\n'));

  // Look up GamingLocations by name to get _id
  const locations = await db
    .collection('gaminglocations')
    .find({ name: { $in: nameValues } }, { projection: { _id: 1, name: 1 } })
    .toArray();

  const nameToId = new Map(locations.map(l => [l.name, String(l._id)]));
  const unmatched = nameValues.filter(n => !nameToId.has(n));

  if (unmatched.length > 0) {
    console.log('\nWARNING: Could not find matching location for:');
    unmatched.forEach(n => console.log(`  "${n}"`));
  }

  // Update each batch
  let totalUpdated = 0;
  for (const [name, id] of nameToId) {
    const result = await db.collection(COLLECTION_NAME).updateMany(
      { location: name },
      { $set: { location: id } }
    );
    console.log(`  "${name}" → ${id}: ${result.modifiedCount} documents updated`);
    totalUpdated += result.modifiedCount;
  }

  console.log(`\nTotal collections updated: ${totalUpdated}`);

  // Also update Meters collection which may have the same issue
  const meterNameValues = await db
    .collection('meters')
    .aggregate([
      { $match: { location: { $exists: true, $ne: '' } } },
      { $group: { _id: '$location' } },
    ])
    .toArray();

  const meterNamesToFix = meterNameValues
    .map(d => String(d._id))
    .filter(v => !isObjectId(v) && nameToId.has(v));

  let meterUpdated = 0;
  for (const name of meterNamesToFix) {
    const id = nameToId.get(name)!;
    const result = await db.collection('meters').updateMany(
      { location: name },
      { $set: { location: id } }
    );
    console.log(`  Meters "${name}" → ${id}: ${result.modifiedCount} documents updated`);
    meterUpdated += result.modifiedCount;
  }

  if (meterUpdated > 0) {
    console.log(`Total meters updated: ${meterUpdated}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
