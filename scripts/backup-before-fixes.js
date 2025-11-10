require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Comprehensive Backup Script - Run BEFORE any fix operations
 * 
 * Backs up critical collections:
 * - machines
 * - collectionreports
 * - collections
 * - meters (optional - can be very large)
 * 
 * Usage: node scripts/backup-before-fixes.js [--include-meters]
 */

const CONFIG = {
  CRITICAL_COLLECTIONS: ['machines', 'collectionreports', 'collections'],
  OPTIONAL_COLLECTIONS: ['meters'], // Only if --include-meters flag is provided
  BACKUP_DIR: path.join(__dirname, 'backups'),
};

async function createBackup(includemeters = false) {
  console.log('\n🔒 COMPREHENSIVE BACKUP BEFORE FIX OPERATIONS\n');
  console.log('='.repeat(80));
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(CONFIG.BACKUP_DIR, timestamp);
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    console.log(`📁 Backup directory: ${backupDir}\n`);
    
    // Determine which collections to backup
    const collectionsToBackup = [...CONFIG.CRITICAL_COLLECTIONS];
    if (includeMeters) {
      collectionsToBackup.push(...CONFIG.OPTIONAL_COLLECTIONS);
      console.log('⚠️  Including meters collection (this may take a while)...\n');
    }
    
    const backupSummary = {
      timestamp: new Date().toISOString(),
      database: db.databaseName,
      mongoUri: process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@'), // Hide credentials
      collections: [],
      totalDocuments: 0,
      totalSize: 0,
    };
    
    // Backup each collection
    for (const collectionName of collectionsToBackup) {
      const startTime = Date.now();
      console.log(`📦 Backing up ${collectionName}...`);
      
      const collection = db.collection(collectionName);
      
      // Get count first
      const count = await collection.countDocuments({});
      console.log(`   📊 Total documents: ${count.toLocaleString()}`);
      
      // Stream data to file for large collections
      const filePath = path.join(backupDir, `${collectionName}.json`);
      const writeStream = fs.createWriteStream(filePath);
      
      // Start JSON array
      writeStream.write('[\n');
      
      let documentCount = 0;
      let isFirst = true;
      
      // Use cursor for memory-efficient streaming
      const cursor = collection.find({});
      
      for await (const doc of cursor) {
        if (!isFirst) {
          writeStream.write(',\n');
        }
        writeStream.write(JSON.stringify(doc));
        isFirst = false;
        documentCount++;
        
        // Progress indicator for large collections
        if (documentCount % 10000 === 0) {
          console.log(`   ⏳ Progress: ${documentCount.toLocaleString()} / ${count.toLocaleString()} documents...`);
        }
      }
      
      // Close JSON array
      writeStream.write('\n]');
      writeStream.end();
      
      // Wait for write to complete
      await new Promise((resolve) => writeStream.on('finish', resolve));
      
      const duration = Date.now() - startTime;
      const fileStats = fs.statSync(filePath);
      const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`   ✅ Backup complete: ${documentCount.toLocaleString()} documents`);
      console.log(`   💾 File size: ${fileSizeMB} MB`);
      console.log(`   ⏱️  Time taken: ${(duration / 1000).toFixed(2)}s\n`);
      
      backupSummary.collections.push({
        name: collectionName,
        documentCount,
        fileSizeMB: parseFloat(fileSizeMB),
        duration: duration,
        filePath: path.relative(process.cwd(), filePath),
      });
      
      backupSummary.totalDocuments += documentCount;
      backupSummary.totalSize += parseFloat(fileSizeMB);
    }
    
    // Save backup summary
    const summaryPath = path.join(backupDir, 'backup-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(backupSummary, null, 2));
    
    // Save restore instructions
    const restoreInstructions = `# Restore Instructions

## Backup Details
- **Timestamp:** ${backupSummary.timestamp}
- **Database:** ${backupSummary.database}
- **Total Documents:** ${backupSummary.totalDocuments.toLocaleString()}
- **Total Size:** ${backupSummary.totalSize.toFixed(2)} MB

## Collections Backed Up
${backupSummary.collections.map(c => `- ${c.name}: ${c.documentCount.toLocaleString()} documents (${c.fileSizeMB} MB)`).join('\n')}

## How to Restore

### Option 1: Using mongorestore (Recommended)
\`\`\`bash
# Restore all collections
mongorestore --uri="${process.env.MONGO_URI}" --dir="${backupDir}"

# Restore specific collection
mongorestore --uri="${process.env.MONGO_URI}" --collection=machines ${path.join(backupDir, 'machines.json')}
\`\`\`

### Option 2: Using restore script
\`\`\`bash
node scripts/restore-from-backup.js ${timestamp}
\`\`\`

### Option 3: Manual restoration via mongoimport
\`\`\`bash
mongoimport --uri="${process.env.MONGO_URI}" --collection=machines --file="${path.join(backupDir, 'machines.json')}" --jsonArray
mongoimport --uri="${process.env.MONGO_URI}" --collection=collections --file="${path.join(backupDir, 'collections.json')}" --jsonArray
mongoimport --uri="${process.env.MONGO_URI}" --collection=collectionreports --file="${path.join(backupDir, 'collectionreports.json')}" --jsonArray
\`\`\`

## ⚠️ Important Notes
- Always verify backup integrity before proceeding with fix operations
- Keep multiple backups if making critical changes
- Test restoration process in development environment first
`;
    
    fs.writeFileSync(path.join(backupDir, 'RESTORE_INSTRUCTIONS.md'), restoreInstructions);
    
    // Display final summary
    console.log('='.repeat(80));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   Total Documents: ${backupSummary.totalDocuments.toLocaleString()}`);
    console.log(`   Total Size: ${backupSummary.totalSize.toFixed(2)} MB`);
    console.log(`   Backup Location: ${backupDir}\n`);
    
    console.log('📋 Collections:');
    backupSummary.collections.forEach(c => {
      console.log(`   - ${c.name}: ${c.documentCount.toLocaleString()} docs (${c.fileSizeMB} MB)`);
    });
    
    console.log('\n📄 Files created:');
    console.log(`   - backup-summary.json`);
    console.log(`   - RESTORE_INSTRUCTIONS.md`);
    backupSummary.collections.forEach(c => {
      console.log(`   - ${c.name}.json`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 Next Steps:');
    console.log('   1. Verify backup files exist and are not empty');
    console.log('   2. Run detection scripts to identify issues');
    console.log('   3. Run fix scripts ONLY after backup is confirmed');
    console.log('   4. Keep this backup until fixes are verified\n');
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    console.error('\n⚠️  DO NOT proceed with fix operations without a backup!');
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Parse command line arguments
const includeMeters = process.argv.includes('--include-meters');

// Run backup
createBackup(includeMeters);

