#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to automatically apply error handling to all pages
 * This script adds PageErrorBoundary to all page components
 */

const pagesDir = path.join(__dirname, '../app');
const componentsDir = path.join(__dirname, '../components');

// Files to update with error handling
const filesToUpdate = [
  'app/page.tsx',
  'app/locations/page.tsx',
  'app/cabinets/page.tsx',
  'app/members/page.tsx',
  'app/sessions/page.tsx',
  'app/reports/page.tsx',
  'app/administration/page.tsx',
  'app/collection-report/page.tsx',
];

// Import statement to add
const errorBoundaryImport = `import PageErrorBoundary from "@/components/ui/errors/PageErrorBoundary";`;

// Wrapper to add around page content
const errorBoundaryWrapper = (content) => `<PageErrorBoundary>
        ${content}
      </PageErrorBoundary>`;

/**
 * Apply error handling to a file
 */
function applyErrorHandling(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has error handling
  if (content.includes('PageErrorBoundary')) {
    console.log(`✅ ${filePath} already has error handling`);
    return;
  }

  // Add import if not present
  if (!content.includes('PageErrorBoundary')) {
    // Find the last import statement
    const importRegex = /import\s+.*?from\s+["'].*?["'];?\s*\n/g;
    const imports = content.match(importRegex) || [];
    const lastImport = imports[imports.length - 1];
    
    if (lastImport) {
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      content = content.slice(0, insertIndex) + '\n' + errorBoundaryImport + '\n' + content.slice(insertIndex);
    }
  }

  // Wrap the main content with PageErrorBoundary
  // Look for the main export function
  const exportRegex = /export\s+default\s+function\s+(\w+)\s*\(\s*\)\s*{[\s\S]*?return\s*\(\s*<ProtectedRoute>[\s\S]*?<\/ProtectedRoute>\s*\);\s*}/;
  const match = content.match(exportRegex);
  
  if (match) {
    const functionName = match[1];
    const functionStart = content.indexOf(`export default function ${functionName}`);
    const functionEnd = content.indexOf('}', functionStart) + 1;
    
    const beforeFunction = content.slice(0, functionStart);
    const functionContent = content.slice(functionStart, functionEnd);
    const afterFunction = content.slice(functionEnd);
    
    // Extract the return statement content
    const returnMatch = functionContent.match(/return\s*\(\s*<ProtectedRoute>\s*([\s\S]*?)\s*<\/ProtectedRoute>\s*\);/);
    
    if (returnMatch) {
      const innerContent = returnMatch[1].trim();
      const newFunctionContent = functionContent.replace(
        returnMatch[0],
        `return (
    <ProtectedRoute>
      <PageErrorBoundary>
        ${innerContent}
      </PageErrorBoundary>
    </ProtectedRoute>
  );`
      );
      
      content = beforeFunction + newFunctionContent + afterFunction;
    }
  }

  // Write the updated content
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Applied error handling to ${filePath}`);
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Applying error handling to all pages...\n');
  
  filesToUpdate.forEach(file => {
    try {
      applyErrorHandling(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
  
  console.log('\n✨ Error handling application complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes made to each file');
  console.log('2. Test the error handling by simulating connection issues');
  console.log('3. Verify that error messages are user-friendly');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { applyErrorHandling };
