/**
 * Script to remove verbose logging from fix-report route
 * Keeps only progress indicators and final summary
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/collection-reports/fix-report/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Count original console statements
const originalCount = (content.match(/console\.(warn|log|error)/g) || []).length;
console.log(`Original console statements: ${originalCount}`);

// Remove specific verbose log patterns while keeping progress logs
const patterns = [
  // Remove individual collection processing logs
  /console\.warn\(\s*`\\n🔍 PHASE 1.*?\);/gs,
  /console\.warn\(\s*`\s*🔧 Fixing.*?\);/gs,
  /console\.warn\(\s*`\s*✅ Fixed.*?\);/gs,
  /console\.warn\(\s*`\s*ℹ️.*?\);/gs,
  /console\.warn\(\s*`\s*⚠️.*?\);/gs,
  
  // Remove debug logs
  /console\.warn\(\s*`\\n🔍 \[fixMachineHistoryIssues\].*?\);/gs,
  /console\.warn\(\s*`\s*Collection ID:.*?\);/gs,
  /console\.warn\(\s*`\s*locationReportId:.*?\);/gs,
  /console\.warn\(\s*`\s*Machine ID:.*?\);/gs,
  /console\.warn\(\s*`\s*machineCustomName:.*?\);/gs,
  /console\.warn\(\s*`\s*Machine has.*?\);/gs,
  /console\.warn\(\s*`\s*Found history entry.*?\);/gs,
  
  // Remove multi-line console.warn with objects
  /console\.warn\(\s*`[^`]*`,\s*\{[^}]*\}\s*\);/gs,
  
  // Remove console.error for individual collection errors (keep summary)
  /console\.error\(\s*`\s*❌ Error (processing|fixing|updating).*?\);/gs,
];

patterns.forEach(pattern => {
  content = content.replace(pattern, '');
});

// Clean up empty lines (more than 2 consecutive)
content = content.replace(/\n{4,}/g, '\n\n\n');

// Count remaining console statements
const remainingCount = (content.match(/console\.(warn|log|error)/g) || []).length;
console.log(`Remaining console statements: ${remainingCount}`);
console.log(`Removed: ${originalCount - remainingCount} console statements`);

// Save
fs.writeFileSync(filePath, content);
console.log('✅ File cleaned!');

