const fs = require('fs');
const path = require('path');

// List of documentation files to update (from search results)
const docsToUpdate = [
  '.cursor/known-issues-and-solutions.md',
  '.cursor/licensee-access-context.md',
  'docs/CABINETS_EMPTY_STATE_MESSAGE.md',
  'docs/COMPLETE_IMPLEMENTATION_SUMMARY.md',
  'docs/COMPLETE_METER_TESTING_SUMMARY.md',
  'docs/COMPREHENSIVE_TEST_EXECUTION_SUMMARY.md',
  'docs/COMPREHENSIVE_TESTING_PLAN.md',
  'docs/FINAL_SESSION_SUMMARY.md',
  'docs/JWT_ROLES_REL_FIX.md',
  'docs/LICENSEE_AND_LOCATION_ACCESS_CONTROL_GUIDELINE.md',
  'docs/LICENSEE_DISPLAY_AND_ASSIGNMENT_SUMMARY.md',
  'docs/LICENSEE_LOCATION_INTERSECTION_FIX.md',
  'docs/QUICK_START_GUIDE.md',
  'docs/README.md',
  'docs/TEST_RESULTS.md',
  'Documentation/DOCUMENTATION_INDEX.md',
  'Documentation/LICENSEE_FILTERING_DOCUMENTATION_UPDATE.md',
  'Documentation/licensee-location-filtering.md',
  'Documentation/backend/api-overview.md',
  'Documentation/frontend/administration.md',
  'Documentation/frontend/collection-report.md',
  'Documentation/frontend/dashboard.md',
  'Documentation/frontend/locations.md',
  'Documentation/frontend/machines.md',
  'Documentation/frontend/pages-overview.md',
];

let totalUpdated = 0;
let totalFiles = 0;

console.log('Starting role name update in documentation files...\n');

docsToUpdate.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Replace all variations
    content = content.replace(/Evolution Admin/g, 'Developer');
    content = content.replace(/evolution admin/g, 'developer');
    content = content.replace(/Evo Admin/g, 'Developer');
    content = content.replace(/evo_admin/g, 'developer');
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      const changes = (originalContent.match(/Evolution Admin|evolution admin|Evo Admin|evo_admin/g) || []).length;
      console.log(`✅ Updated ${filePath} (${changes} replacements)`);
      totalUpdated++;
      totalFiles += changes;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n✅ Complete! Updated ${totalFiles} instances across ${totalUpdated} files.`);

