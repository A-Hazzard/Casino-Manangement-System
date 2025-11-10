const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/collection-reports/fix-report/route.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Removing ALL verbose console statements...');

// Remove specific verbose patterns while KEEPING progress logs and summary
const removePatterns = [
  // Remove machine ID logging
  /console\.warn\(\s*`\s*Machine ID:.*?\);/gs,
  /console\.warn\(\s*`\s*machineCustomName:.*?\);/gs,
  
  // Remove needsUpdate logging
  /console\.warn\(\s*`\s*needsUpdate:.*?\);/gs,
  
  // Remove prev meters checking
  /console\.warn\(\s*`\s*🔍 Checking prev meters.*?\);/gs,
  
  // Remove individual error messages (keep summary)
  /console\.error\(\s*`\s*❌ Error fixing SAS times.*?\n.*?\n.*?\n.*?\n.*?\);/gs,
  
  // Remove all ⚠️ warnings
  /console\.warn\(\s*`\s*⚠️.*?\);/gs,
  
  // Remove all 🔧 fixing messages
  /console\.warn\(\s*`\s*🔧 Fixing movement.*?\);/gs,
  /console\.warn\(\s*`\s*✅ Fixed movement.*?\);/gs,
  /console\.warn\(\s*`\s*✅ Fixed SAS times.*?\);/gs,
];

removePatterns.forEach(pattern => {
  content = content.replace(pattern, '// Verbose log removed');
});

// Save
fs.writeFileSync(filePath, content);
console.log('✅ Verbose logs removed!');
console.log('Rebuild with: pnpm build');

