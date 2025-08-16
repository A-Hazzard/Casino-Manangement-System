const fs = require('fs');
const path = require('path');

// Function to recursively find all API route files
function findApiFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findApiFiles(filePath, fileList);
    } else if (file === 'route.ts' || file === 'route.js') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to add logging to a single API file
function addLoggingToFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add import if not present
  if (!content.includes('apiLogger') && !content.includes('@/app/api/lib/utils/logger')) {
    const importMatch = content.match(/import.*from.*["']next\/server["']/);
    if (importMatch) {
      const importLine = importMatch[0];
      const newImport = importLine.replace(
        /import\s*{([^}]+)}\s*from\s*["']next\/server["']/,
        `import { $1 } from "next/server";\nimport { apiLogger } from "@/app/api/lib/utils/logger";`
      );
      content = content.replace(importLine, newImport);
      modified = true;
    } else {
      // Add import after existing imports
      const importEnd = content.lastIndexOf('import');
      if (importEnd !== -1) {
        const importEndLine = content.indexOf('\n', importEnd) + 1;
        content = content.slice(0, importEndLine) + 
                 'import { apiLogger } from "@/app/api/lib/utils/logger";\n' + 
                 content.slice(importEndLine);
        modified = true;
      }
    }
  }
  
  // Add logging to GET functions
  content = content.replace(
    /export async function GET\(([^)]+)\)\s*{/g,
    (match, params) => {
      const endpoint = filePath.replace(process.cwd(), '').replace(/\\/g, '/').replace('/app', '');
      return `export async function GET(${params}) {
  const context = apiLogger.createContext(${params.includes('NextRequest') ? params.split(' ')[0] : 'request as any'}, "${endpoint}");
  apiLogger.startLogging();`;
    }
  );
  
  // Add logging to POST functions
  content = content.replace(
    /export async function POST\(([^)]+)\)\s*{/g,
    (match, params) => {
      const endpoint = filePath.replace(process.cwd(), '').replace(/\\/g, '/').replace('/app', '');
      return `export async function POST(${params}) {
  const context = apiLogger.createContext(${params.includes('NextRequest') ? params.split(' ')[0] : 'request as any'}, "${endpoint}");
  apiLogger.startLogging();`;
    }
  );
  
  // Add logging to PUT functions
  content = content.replace(
    /export async function PUT\(([^)]+)\)\s*{/g,
    (match, params) => {
      const endpoint = filePath.replace(process.cwd(), '').replace(/\\/g, '/').replace('/app', '');
      return `export async function PUT(${params}) {
  const context = apiLogger.createContext(${params.includes('NextRequest') ? params.split(' ')[0] : 'request as any'}, "${endpoint}");
  apiLogger.startLogging();`;
    }
  }
  );
  
  // Add logging to DELETE functions
  content = content.replace(
    /export async function DELETE\(([^)]+)\)\s*{/g,
    (match, params) => {
      const endpoint = filePath.replace(process.cwd(), '').replace(/\\/g, '/').replace('/app', '');
      return `export async function DELETE(${params}) {
  const context = apiLogger.createContext(${params.includes('NextRequest') ? params.split(' ')[0] : 'request as any'}, "${endpoint}");
  apiLogger.startLogging();`;
    }
  );
  
  // Add success logging before return statements
  content = content.replace(
    /return new Response\(JSON\.stringify\(\{([^}]+)\}\),\s*\{[^}]*status:\s*200[^}]*\}\);/g,
    (match, responseData) => {
      return `apiLogger.logSuccess(context, "Operation completed successfully");
    ${match}`;
    }
  );
  
  content = content.replace(
    /return NextResponse\.json\(\{([^}]+)\},\s*\{[^}]*status:\s*200[^}]*\}\);/g,
    (match, responseData) => {
      return `apiLogger.logSuccess(context, "Operation completed successfully");
    ${match}`;
    }
  );
  
  // Add error logging in catch blocks
  content = content.replace(
    /} catch \(([^)]+)\)\s*{/g,
    (match, errorParam) => {
      return `} catch (${errorParam}) {
    const errorMessage = ${errorParam} instanceof Error ? ${errorParam}.message : "Unknown error";
    apiLogger.logError(context, "Operation failed", errorMessage);`;
    }
  );
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
}

// Main execution
const apiDir = path.join(process.cwd(), 'app', 'api');
const apiFiles = findApiFiles(apiDir);

console.log(`Found ${apiFiles.length} API route files:`);
apiFiles.forEach(file => console.log(`  - ${file}`));

console.log('\nAdding logging to API endpoints...');
apiFiles.forEach(addLoggingToFile);

console.log('\n✅ Logging has been added to all API endpoints!');
console.log('\nNote: You may need to manually review and adjust some endpoints for specific logging messages.');
