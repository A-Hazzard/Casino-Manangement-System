require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

/**
 * Migration script to add performance indexes for location metrics queries
 * 
 * This adds critical indexes to speed up:
 * - Machine lookups by location
 * - Meter lookups by machine and date range
 * 
 * Run with: node scripts/migrations/add-performance-indexes.js
 */

(async () => {
  console.log('🚀 Starting index creation migration...\n');
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('Connected to database\n');

    // Helper function to create index safely
    const createIndexSafely = async (collection, keys, options, description) => {
      try {
        await db.collection(collection).createIndex(keys, options);
        console.log(`✅ Created index: ${description}`);
        return true;
      } catch (error) {
        if (error.code === 85 || error.message.includes('already exists')) {
          console.log(`⚠️  Index already exists: ${description}`);
          return false;
        }
        throw error;
      }
    };

    // 1. Machines collection indexes
    console.log('📊 Creating indexes on machines collection...');
    
    // Index for location lookups (used in reports/locations API)
    await createIndexSafely(
      'machines',
      { gamingLocation: 1 },
      { background: true, name: 'idx_machines_gamingLocation' },
      'machines.gamingLocation'
    );

    // Compound index for location lookups with deletion filter
    await createIndexSafely(
      'machines',
      { gamingLocation: 1, deletedAt: 1 },
      { background: true, name: 'idx_machines_gamingLocation_deletedAt' },
      'machines.gamingLocation + deletedAt'
    );

    // Index for machine status checks
    await createIndexSafely(
      'machines',
      { lastActivity: 1 },
      { background: true, name: 'idx_machines_lastActivity' },
      'machines.lastActivity'
    );

    // 2. Meters collection indexes
    console.log('\n📊 Creating indexes on meters collection...');

    // Compound index for machine + date range queries (PRIMARY INDEX for performance)
    await createIndexSafely(
      'meters',
      { machine: 1, readAt: 1 },
      { background: true, name: 'idx_meters_machine_readAt' },
      'meters.machine + readAt'
    );

    // Index for date range queries
    await createIndexSafely(
      'meters',
      { readAt: 1 },
      { background: true, name: 'idx_meters_readAt' },
      'meters.readAt'
    );

    // Index for machine lookups
    await createIndexSafely(
      'meters',
      { machine: 1 },
      { background: true, name: 'idx_meters_machine' },
      'meters.machine'
    );

    // 3. Gaming Locations collection indexes
    console.log('\n📊 Creating indexes on gaminglocations collection...');

    // Index for licensee filtering
    await createIndexSafely(
      'gaminglocations',
      { 'rel.licencee': 1 },
      { background: true, name: 'idx_locations_licensee' },
      'gaminglocations.rel.licencee'
    );

    // Index for deletion filter
    await createIndexSafely(
      'gaminglocations',
      { deletedAt: 1 },
      { background: true, name: 'idx_locations_deletedAt' },
      'gaminglocations.deletedAt'
    );

    // Index for name search
    await createIndexSafely(
      'gaminglocations',
      { name: 1 },
      { background: true, name: 'idx_locations_name' },
      'gaminglocations.name'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ All indexes created successfully!');
    console.log('='.repeat(80));
    console.log('\n📊 Index Summary:');
    console.log('  Machines: 3 indexes');
    console.log('  Meters: 3 indexes');
    console.log('  Gaming Locations: 3 indexes');
    console.log('\n💡 These indexes will significantly improve query performance.');
    console.log('   Expected improvement: 5-20x faster queries');
    console.log('\n⚠️  Note: Index creation runs in background and may take a few minutes for large collections.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
})();

