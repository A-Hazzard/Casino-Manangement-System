# Database Cleanup Scripts

This directory contains maintenance and cleanup scripts for the Evolution One Casino Management System database.

## Available Scripts

### cleanup-old-collections.js

**Purpose:** Deletes all collections, collection reports, and collection history from machines that are older than January 1, 2025.

**What it does:**
1. Deletes all `collections` documents with `timestamp < 2025-01-01`
2. Deletes all `collectionReport` documents with `timestamp < 2025-01-01`
3. Removes all `collectionMetersHistory` entries from machines with `timestamp < 2025-01-01`

**Safety Features:**
- **Dry-run mode by default** - Preview changes before executing
- Detailed sample output showing what will be deleted
- Must pass `--execute` flag to actually delete data

**Usage:**

```bash
# Dry run (preview only, no deletions)
pnpm cleanup:old-collections

# Or run directly with Node.js
node scripts/cleanup-old-collections.js

# Execute actual deletion
node scripts/cleanup-old-collections.js --execute
```

**Prerequisites:**
- Ensure `MONGO_URI` is set in your `.env` or `.env.local` file
- **CRITICAL:** Always backup your database before running this script with `--execute`
- Recommended: Always run in dry-run mode first to preview changes

**Output:**
The script provides detailed console output including:
- Number of collections deleted
- Number of collection reports deleted
- Number of machines updated
- Number of history entries removed
- Summary of any errors encountered

**Example Output (Dry Run):**
```
✅ Connected to MongoDB

================================================================================
🔍 DRY RUN MODE
================================================================================
📅 Cutoff date: 2025-01-01T00:00:00.000Z

⚠️  DRY RUN MODE: No data will be deleted
   Run with --execute flag to actually delete data
   WARNING: Always backup your database before running with --execute

🔍 Step 1: Finding collections older than 2025...
   Found 1523 collections to delete
   Sample collections:
      - GM12345 | 2024-12-15
      - GM12346 | 2024-11-20
      - GM12347 | 2024-10-05
      - GM12348 | 2024-09-12
      - GM12349 | 2024-08-28
      ... and 1518 more

   Would delete 1523 collections

🔍 Step 2: Finding collection reports older than 2025...
   Found 87 collection reports to delete
   Sample reports:
      - Main Casino | 2024-12-15 | Report ID: abc-123
      - Downtown Bar | 2024-11-20 | Report ID: def-456
      - Airport Lounge | 2024-10-05 | Report ID: ghi-789
      - Beach Club | 2024-09-12 | Report ID: jkl-012
      - City Center | 2024-08-28 | Report ID: mno-345
      ... and 82 more

   Would delete 87 collection reports

🔍 Step 3: Finding machines with old collection history...
   Found 245 machines with old history entries
   Found 1523 history entries to remove across 245 machines
   Sample machines:
      - GM12345 | 6 old entries (of 12 total)
      - GM12346 | 8 old entries (of 15 total)
      - GM12347 | 5 old entries (of 10 total)
      - GM12348 | 7 old entries (of 14 total)
      - GM12349 | 4 old entries (of 9 total)
      ... and 240 more machines

   Would remove 1523 history entries from 245 machines

================================================================================
📊 CLEANUP SUMMARY
================================================================================
Collections to delete:        1523
Collection reports to delete: 87
Machines to update:           245
History entries to remove:    1523
================================================================================

🎉 Would clean up 3133 total items

To actually delete this data, run:
   node scripts/cleanup-old-collections.js --execute

✅ MongoDB connection closed
```

**Example Output (Execute Mode):**
```
✅ Connected to MongoDB

================================================================================
⚠️  EXECUTE MODE
================================================================================
📅 Cutoff date: 2025-01-01T00:00:00.000Z

⚠️⚠️⚠️  EXECUTE MODE: Data WILL BE DELETED ⚠️⚠️⚠️
   This operation is irreversible!

🔍 Step 1: Finding collections older than 2025...
   Found 1523 collections to delete
   Sample collections:
      - GM12345 | 2024-12-15
      ... (sample list)

   ✅ Deleted 1523 collections

🔍 Step 2: Finding collection reports older than 2025...
   Found 87 collection reports to delete
   Sample reports:
      - Main Casino | 2024-12-15 | Report ID: abc-123
      ... (sample list)

   ✅ Deleted 87 collection reports

🔍 Step 3: Finding machines with old collection history...
   Found 245 machines with old history entries
   Found 1523 history entries to remove across 245 machines
   Sample machines:
      - GM12345 | 6 old entries (of 12 total)
      ... (sample list)

   ✅ Removed 1523 history entries from 245 machines

================================================================================
📊 CLEANUP SUMMARY
================================================================================
Collections deleted:        1523
Collection reports deleted: 87
Machines updated:           245
History entries removed:    1523
================================================================================

✅ Cleanup completed successfully!
🎉 Total items cleaned up: 3133

✅ MongoDB connection closed
```

**Safety Features:**
- Warning message before execution
- Detailed logging of all operations
- Error handling and reporting
- Summary report with counts
- Non-zero exit code on errors

**When to Run:**
- Database optimization and cleanup
- Archiving old data
- Performance improvements
- Storage management

**Documentation References:**
- [Backend Collection Report Guide](../Documentation/backend/collection-report.md)
- [Database Models](../Documentation/database-models.md)
- [Engineering Guidelines](../Documentation/ENGINEERING_GUIDELINES.md)

## Creating New Scripts

When creating new database maintenance scripts:

1. **Follow TypeScript Discipline:**
   - Use proper types from `shared/types/` or `app/api/lib/types/`
   - No `any` types allowed
   - Comprehensive error handling

2. **Database Operations:**
   - Always use atomic operations
   - Implement proper error handling
   - Log all operations clearly
   - Provide detailed summary reports

3. **Safety:**
   - Add confirmation/warning messages
   - Test on staging database first
   - Document backup requirements
   - Handle edge cases properly

4. **Documentation:**
   - Add script description to this README
   - Document all parameters and options
   - Provide usage examples
   - Reference related documentation

5. **Package.json:**
   - Add npm/pnpm script for easy execution
   - Use clear, descriptive script names
   - Document any required environment variables

## Best Practices

1. **Always backup database before running cleanup scripts**
2. **Test scripts on staging environment first**
3. **Run during low-traffic periods**
4. **Monitor script output for errors**
5. **Document any manual interventions required**
6. **Keep detailed logs of script executions**

---

**Last Updated:** November 6, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer
