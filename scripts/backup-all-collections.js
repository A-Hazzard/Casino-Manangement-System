require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  process.env.DATABASE_URI;

const MODELS_DIR = path.resolve(__dirname, '../app/api/lib/models');
const COLLECTION_OVERRIDES = {
  activitylog: null,
  activitylogs: 'activityLogs',
  collectionreport: null,
  licencee: null,
  movementrequest: null,
  scheduler: null,
  firmware: null,
  member: null,
};

function getCollectionsFromModels() {
  const collectionNames = new Set();
  const modelFiles = fs
    .readdirSync(MODELS_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
    .map(entry => entry.name);

  const modelPattern =
    /(mongoose\.)?model\s*(?:<[^>]*>)?\s*\(\s*['"`]([\w-]+)['"`]\s*,\s*[^,]+?(?:,\s*['"`]([\w-]+)['"`])?\s*\)/gis;

  modelFiles.forEach(fileName => {
    const filePath = path.join(MODELS_DIR, fileName);
    const contents = fs.readFileSync(filePath, 'utf8');

    let matched = false;
    const matches = contents.matchAll(modelPattern);
    for (const match of matches) {
      const modelName = match[2];
      const explicitCollection = match[3];

      if (modelName) {
        matched = true;
        collectionNames.add(modelName.toLowerCase());
      }

      if (explicitCollection) {
        matched = true;
        collectionNames.add(explicitCollection.toLowerCase());
      }
    }

    if (!matched) {
      console.warn(
        `⚠️  Could not determine collection name for model file: ${fileName}`
      );
    }
  });

  const normalized = new Set();
  collectionNames.forEach(name => {
    if (!name) return;
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return;

    let override = undefined;
    if (Object.prototype.hasOwnProperty.call(COLLECTION_OVERRIDES, trimmed)) {
      override = COLLECTION_OVERRIDES[trimmed];
    } else if (
      Object.prototype.hasOwnProperty.call(
        COLLECTION_OVERRIDES,
        `${trimmed}_actual`
      )
    ) {
      override = COLLECTION_OVERRIDES[`${trimmed}_actual`];
    }

    if (override === null) {
      return;
    }

    if (override) {
      normalized.add(override);
    } else {
      normalized.add(trimmed);
    }
  });

  return Array.from(normalized).sort();
}

const COLLECTIONS_TO_BACKUP = getCollectionsFromModels();

async function backupAllCollections() {
  if (!MONGODB_URI) {
    throw new Error(
      'MongoDB connection string not found. Set MONGODB_URI, MONGO_URI, or DATABASE_URL in your environment.'
    );
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('\n🔄 COMPREHENSIVE DATABASE BACKUP\n');
    console.log('='.repeat(80));
    console.log('📚 Models directory:', MODELS_DIR);
    console.log(
      '📦 Discovered collections:',
      COLLECTIONS_TO_BACKUP.join(', ') || '(none found)'
    );
    console.log('='.repeat(80) + '\n');

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
        const collections = await db
          .listCollections({ name: collectionName })
          .toArray();
        if (collections.length === 0) {
          console.log(
            `  ⚠️  ${collectionName}: Collection not found - skipping`
          );
          results.failed.push({
            collection: collectionName,
            reason: 'Not found',
          });
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

        console.log(
          `  ✅ ${collectionName}: ${docCount} docs (${fileSize}KB) - ${duration}ms`
        );

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
backupAllCollections()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
