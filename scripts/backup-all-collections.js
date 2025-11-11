require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Database Backup Script
 * 
 * Backs up ALL collections EXCEPT meters (too large)
 * 
 * Collections backed up:
 * - collections (Collection history data)
 * - collectionreports (Collection reports)
 * - machines (Gaming machines)
 * - gaminglocations (Gaming locations)
 * - users (User accounts)
 * - schedulers (Collection schedules)
 * - movementrequests (Movement requests)
 * - members (Player members)
 * - machinesessions (Machine sessions)
 * - machineevents (Machine events)
 * - licencees (Licensees)
 * - firmwares (Firmware versions)
 * - countries (Country data)
 * - activitylogs (Activity logs)
 * - acceptedbills (Bill acceptor data)
 * 
 * NOT backed up:
 * - meters (too large, ~1.5M records)
 */

const MONGODB_URI = process.env.MONGODB_URI;

// All collections to backup (excluding meters)
const COLLECTIONS_TO_BACKUP = [
  'collections',
  'collectionreports',
  'machines',
  'gaminglocations',
  'users',
  'schedulers',
  'movementrequests',
  'members',
  'machinesessions',
  'machineevents',
  'licencees',
  'firmwares',
  'countries',
  'activitylogs',
  'acceptedbills',
];

async function backupAllCollections() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('\n🔄 COMPREHENSIVE DATABASE BACKUP\n');
    console.log('='.repeat(80));
    
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups', `backup-${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    console.log(`📁 Backup directory: ${backupDir}\n`);
    console.log('📦 Backing up collections:\n');
    
    const results = {
      success: [],
      failed: [],
      totalDocs: 0,
      totalSize: 0,
    };
    
    // Backup each collection
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      try {
        const startTime = Date.now();
        
        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
          console.log(`  ⚠️  ${collectionName}: Collection not found - skipping`);
          results.failed.push({ collection: collectionName, reason: 'Not found' });
          continue;
        }
        
        // Get all documents
        const docs = await db.collection(collectionName).find({}).toArray();
        const docCount = docs.length;
        
        // Write to JSON file
        const filename = path.join(backupDir, `${collectionName}.json`);
        const jsonData = JSON.stringify(docs, null, 2);
        fs.writeFileSync(filename, jsonData);
        
        const fileSize = (fs.statSync(filename).size / 1024).toFixed(2);
        const duration = Date.now() - startTime;
        
        console.log(`  ✅ ${collectionName}: ${docCount} docs (${fileSize}KB) - ${duration}ms`);
        
        results.success.push({
          collection: collectionName,
          docs: docCount,
          size: parseFloat(fileSize),
          duration,
        });
        results.totalDocs += docCount;
        results.totalSize += parseFloat(fileSize);
        
      } catch (error) {
        console.log(`  ❌ ${collectionName}: ERROR - ${error.message}`);
        results.failed.push({
          collection: collectionName,
          reason: error.message,
        });
      }
    }
    
    // Create summary file
    const summaryFilename = path.join(backupDir, 'BACKUP_SUMMARY.json');
    const summary = {
      timestamp: new Date().toISOString(),
      backupDirectory: backupDir,
      results: {
        successCount: results.success.length,
        failedCount: results.failed.length,
        totalDocuments: results.totalDocs,
        totalSizeKB: results.totalSize.toFixed(2),
      },
      collections: results,
    };
    
    fs.writeFileSync(summaryFilename, JSON.stringify(summary, null, 2));
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 BACKUP SUMMARY:\n');
    console.log(`  ✅ Successful: ${results.success.length} collections`);
    console.log(`  ❌ Failed: ${results.failed.length} collections`);
    console.log(`  📄 Total documents: ${results.totalDocs.toLocaleString()}`);
    console.log(`  💾 Total size: ${results.totalSize.toFixed(2)}KB`);
    console.log(`  📁 Location: ${backupDir}`);
    
    if (results.failed.length > 0) {
      console.log('\n⚠️  Failed collections:');
      results.failed.forEach(f => {
        console.log(`  - ${f.collection}: ${f.reason}`);
      });
    }
    
    console.log('\n✅ Backup complete!\n');
    
    // Create a RESTORE guide
    const restoreGuide = `# How to Restore This Backup

**Backup Date:** ${new Date().toISOString()}
**Backup Location:** ${backupDir}

## Restore All Collections

\`\`\`bash
# Using mongoimport
${results.success.map(r => `mongoimport --uri="${MONGODB_URI}" --collection=${r.collection} --file=${path.join(backupDir, r.collection + '.json')} --jsonArray --drop`).join('\n')}
\`\`\`

## Restore Individual Collection

\`\`\`bash
# Example: Restore only collections
mongoimport --uri="${MONGODB_URI}" --collection=collections --file=${path.join(backupDir, 'collections.json')} --jsonArray --drop
\`\`\`

## Collections Backed Up

${results.success.map((r, idx) => `${idx + 1}. ${r.collection} (${r.docs} documents, ${r.size}KB)`).join('\n')}

## NOT Backed Up

- meters (too large, ~1.5M records)

---

**Total:** ${results.totalDocs.toLocaleString()} documents, ${results.totalSize.toFixed(2)}KB
`;
    
    fs.writeFileSync(path.join(backupDir, 'RESTORE_GUIDE.md'), restoreGuide);
    console.log('📖 Restore guide created: RESTORE_GUIDE.md\n');
    
  } catch (error) {
    console.error('\n❌ Backup error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run backup
backupAllCollections().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

