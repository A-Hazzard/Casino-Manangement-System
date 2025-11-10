require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

/**
 * SAFE Detection and Fix Workflow
 * 
 * This script ensures backups are created BEFORE running any fix operations.
 * 
 * Workflow:
 * 1. Create backup of all critical collections
 * 2. Run issue detection (Go or JS version)
 * 3. Display issues found
 * 4. Ask user confirmation before running fixes
 * 5. Run fix scripts if confirmed
 * 
 * Usage:
 *   node scripts/safe-detect-and-fix.js [--detect-only] [--fix] [--include-meters]
 * 
 * Flags:
 *   --detect-only    Only run backup and detection, no fixes
 *   --fix           Automatically run fixes after detection (requires confirmation)
 *   --include-meters Include meters in backup (slower, larger)
 */

async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  console.log(`   Command: ${command}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.join(__dirname, '..'),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 SAFE DETECTION AND FIX WORKFLOW');
  console.log('='.repeat(80) + '\n');
  
  // Parse flags
  const args = process.argv.slice(2);
  const detectOnly = args.includes('--detect-only');
  const autoFix = args.includes('--fix');
  const includeMeters = args.includes('--include-meters');
  
  console.log('Configuration:');
  console.log(`   Detect Only: ${detectOnly}`);
  console.log(`   Auto Fix: ${autoFix}`);
  console.log(`   Include Meters: ${includeMeters}\n`);
  
  // STEP 1: Create Backup
  console.log('='.repeat(80));
  console.log('STEP 1: CREATING BACKUP');
  console.log('='.repeat(80));
  
  const backupCmd = includeMeters 
    ? 'node scripts/backup-before-fixes.js --include-meters'
    : 'node scripts/backup-before-fixes.js';
  
  const backupSuccess = await runCommand(backupCmd, 'Creating backup');
  
  if (!backupSuccess) {
    console.error('\n❌ BACKUP FAILED! Stopping workflow.');
    console.error('⚠️  DO NOT proceed with any fix operations without a successful backup!');
    process.exit(1);
  }
  
  // STEP 2: Run Detection
  console.log('='.repeat(80));
  console.log('STEP 2: DETECTING ISSUES');
  console.log('='.repeat(80));
  
  // Check if Go is available
  let useGo = false;
  try {
    await execAsync('go version');
    useGo = true;
    console.log('✅ Go detected - using faster Go detection script\n');
  } catch {
    console.log('⚠️  Go not found - using JavaScript detection script\n');
  }
  
  const detectCmd = useGo 
    ? 'go run scripts/detect-issues.go'
    : 'node scripts/detect-all-collection-issues.js';
  
  const detectSuccess = await runCommand(detectCmd, 'Detecting issues');
  
  if (!detectSuccess) {
    console.error('\n❌ DETECTION FAILED!');
    console.error('Check the error messages above for details.');
    process.exit(1);
  }
  
  // STEP 3: Display Summary
  console.log('='.repeat(80));
  console.log('STEP 3: ISSUE SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  const summaryPath = path.join(__dirname, 'COLLECTION_ISSUES_SUMMARY.md');
  if (fs.existsSync(summaryPath)) {
    const summary = fs.readFileSync(summaryPath, 'utf8');
    const lines = summary.split('\n').slice(0, 20); // Show first 20 lines
    console.log(lines.join('\n'));
    console.log('\n... (see COLLECTION_ISSUES_SUMMARY.md for full report)\n');
  }
  
  const reportPath = path.join(__dirname, 'COLLECTION_ISSUES_REPORT.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log('📊 Quick Stats:');
    console.log(`   Total Reports: ${report.totalReports}`);
    console.log(`   Reports with Issues: ${report.reportsWithIssues}`);
    console.log(`   Total Issues: ${report.totalIssues}\n`);
  }
  
  // STEP 4: Fix Operations (if requested)
  if (!detectOnly) {
    console.log('='.repeat(80));
    console.log('STEP 4: FIX OPERATIONS');
    console.log('='.repeat(80) + '\n');
    
    if (!autoFix) {
      console.log('⚠️  Fix operations available but not enabled.');
      console.log('   To run fixes, use: node scripts/safe-detect-and-fix.js --fix\n');
    } else {
      console.log('🚨 AUTO-FIX MODE ENABLED\n');
      console.log('⚠️  This will modify your database!');
      console.log('✅ Backup created: Check backups folder');
      console.log('\nAvailable fix scripts:');
      console.log('   - Fix SAS times: node scripts/detect-and-fix-sas-times.js');
      console.log('   - Fix collection history: API endpoints available');
      console.log('\n⚠️  Review the issues first, then run specific fix scripts as needed.\n');
    }
  }
  
  // Final Summary
  console.log('='.repeat(80));
  console.log('✅ WORKFLOW COMPLETE');
  console.log('='.repeat(80) + '\n');
  
  console.log('📁 Generated Files:');
  console.log(`   - ${path.relative(process.cwd(), summaryPath)}`);
  if (fs.existsSync(reportPath)) {
    console.log(`   - ${path.relative(process.cwd(), reportPath)}`);
  }
  
  // Find latest backup directory
  const backupDirs = fs.readdirSync(CONFIG.BACKUP_DIR)
    .filter(dir => !dir.startsWith('.'))
    .sort()
    .reverse();
  
  if (backupDirs.length > 0) {
    const latestBackup = path.join(CONFIG.BACKUP_DIR, backupDirs[0]);
    console.log(`\n💾 Latest Backup: ${path.relative(process.cwd(), latestBackup)}`);
    
    const backupFiles = fs.readdirSync(latestBackup);
    console.log('   Files:');
    backupFiles.forEach(file => {
      const filePath = path.join(latestBackup, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${file} (${sizeMB} MB)`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Review COLLECTION_ISSUES_SUMMARY.md');
  console.log('   2. Decide which issues need fixing');
  console.log('   3. Run specific fix scripts for issues found');
  console.log('   4. Keep backup until fixes are verified\n');
  
} catch (error) {
  console.error('\n❌ Workflow failed:', error);
  process.exit(1);
}

main();

