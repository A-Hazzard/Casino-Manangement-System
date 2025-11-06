# Database Cleanup Script - Implementation Summary

**Created:** November 6th, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

A comprehensive database cleanup script has been created to remove all collections, collection reports, and collection history from machines that are older than January 1, 2025.

## Files Created

### 1. `scripts/cleanup-old-collections.js`

**Purpose:** Main cleanup script that performs the deletion operations (Node.js script)

**Key Features:**

- ✅ **Dry-run mode by default** - Preview changes before executing
- ✅ Deletes all `collections` documents with `timestamp < 2025-01-01`
- ✅ Deletes all `collectionReport` documents with `timestamp < 2025-01-01`
- ✅ Removes all `collectionMetersHistory` entries from machines with `timestamp < 2025-01-01`
- ✅ Comprehensive logging with detailed console output
- ✅ Sample data preview (shows first 5 items)
- ✅ Error handling and summary reporting
- ✅ Safety warnings before execution
- ✅ Non-zero exit code on errors
- ✅ Requires `--execute` flag to actually delete data

**Technical Implementation:**

- Node.js script using MongoDB native driver
- Uses MongoDB atomic operations ($pull for arrays)
- Follows Engineering Guidelines and existing script patterns
- Proper error handling and reporting
- Efficient bulk operations
- Same style as existing scripts in the `scripts/` directory

### 2. `scripts/README.md`

**Purpose:** Complete documentation for all maintenance scripts

**Contents:**

- Usage instructions
- Safety requirements
- Example output
- Best practices
- Guidelines for creating new scripts

### 3. Updated Files

#### `package.json`

- Added `cleanup:old-collections` script (runs the Node.js script)

#### `.cursor/application-context.md`

- Added "Essential Documentation References" section at the top
- Clear categorization of documentation files
- Critical Guidelines for Collection Reports, Database Models, and Financial Calculations
- Added Database Maintenance Scripts section
- Updated November 6th Major Work section

## Usage

### Prerequisites

Ensure `MONGO_URI` is set in your `.env` or `.env.local` file:

```env
MONGO_URI=mongodb://your-connection-string
```

### Running the Script

**Important:** Always backup your database before running this script with `--execute`!

#### Step 1: Dry Run (Preview Only)

```bash
# Run in dry-run mode (default - no deletions)
pnpm cleanup:old-collections

# Or run directly with Node.js
node scripts/cleanup-old-collections.js
```

This will show you exactly what would be deleted without actually deleting anything.

#### Step 2: Execute Deletion

After reviewing the dry-run output and backing up your database:

```bash
# Execute actual deletion
node scripts/cleanup-old-collections.js --execute
```

### What Gets Deleted

The script will delete:

1. **Collections** - All collection documents where `timestamp < 2025-01-01`
2. **Collection Reports** - All collection report documents where `timestamp < 2025-01-01`
3. **Machine History** - All `collectionMetersHistory` entries where `timestamp < 2025-01-01`

### Example Output

```
🧹 Starting cleanup of collections older than 2025...
📅 Cutoff date: 2025-01-01T00:00:00.000Z

🔍 Finding collections older than 2025...
   Found 1523 collections to delete
   ✅ Deleted 1523 collections

🔍 Finding collection reports older than 2025...
   Found 87 collection reports to delete
   ✅ Deleted 87 collection reports

🔍 Finding machines with old collection history...
   Found 245 machines with old history entries
   Found 1523 history entries to remove across 245 machines
   ✅ Removed 1523 history entries from 245 machines

📊 CLEANUP SUMMARY
═══════════════════════════════════════════════════════════
Collections deleted:        1523
Collection reports deleted: 87
Machines updated:           245
History entries removed:    1523
═══════════════════════════════════════════════════════════

✅ Cleanup completed successfully with no errors!

🎉 Total items cleaned up: 3133
```

## Safety Features

### Dry-Run Mode (Default)

- ⚠️ **Runs in preview mode by default** - No data is deleted
- Shows exactly what would be deleted with sample data
- Displays counts and examples for all operations
- Clear instructions on how to execute actual deletion
- Must explicitly pass `--execute` flag to delete data

### Execute Mode (--execute flag)

- ⚠️ Clear warnings before execution ("Data WILL BE DELETED")
- Reminder that operation is irreversible
- Detailed logging of each operation
- Progress indicators for each step
- Count of items found before deletion
- Sample data preview (first 5 items)

### Post-Execution

- Comprehensive summary report
- Total counts of all deletions
- Error reporting if any issues occurred
- Non-zero exit code for errors (useful for automation)
- Confirmation of successful completion

## Documentation Structure Enhancement

The `application-context.md` file has been enhanced with a new "Essential Documentation References" section at the top:

### Collection Report System Documentation

- Backend Collection Report Guide
- Frontend Collection Report Guide
- Collection Report Details Backend
- Collection Report Details Frontend

### Database & Type System Documentation

- Database Models & Relationships
- TypeScript Type Safety Rules
- Financial Metrics Guide
- Engineering Guidelines

### Critical Guidelines

Clear instructions for:

- Modifying Collection Reports
- Modifying Database Models
- Implementing Financial Calculations

## Technical Details

### Database Operations

**Collections Deletion:**

```typescript
await Collections.deleteMany({
  timestamp: { $lt: CUTOFF_DATE },
});
```

**Collection Reports Deletion:**

```typescript
await CollectionReport.deleteMany({
  timestamp: { $lt: CUTOFF_DATE },
});
```

**Machine History Cleanup:**

```typescript
await Machine.updateMany(
  { 'collectionMetersHistory.timestamp': { $lt: CUTOFF_DATE } },
  {
    $pull: {
      collectionMetersHistory: {
        timestamp: { $lt: CUTOFF_DATE },
      },
    },
  }
);
```

### Type Safety

All types properly defined:

```typescript
type CleanupResults = {
  collectionsDeleted: number;
  collectionReportsDeleted: number;
  machinesUpdated: number;
  historyEntriesRemoved: number;
  errors: string[];
};
```

### Error Handling

Comprehensive error handling:

- Try-catch blocks for all database operations
- Error messages captured and reported
- Non-zero exit code on failures
- Proper database connection cleanup

## Best Practices

### Before Running

1. **Backup Database:**

   ```bash
   mongodump --uri="your-mongodb-uri" --out=backup-$(date +%Y%m%d)
   ```

2. **Test on Staging:**
   - Run on staging database first
   - Verify results before running on production

3. **Check Data:**
   - Verify what will be deleted
   - Confirm date range is correct

### During Execution

1. **Monitor Output:**
   - Watch for error messages
   - Verify counts make sense
   - Check summary report

2. **Document Results:**
   - Save output to log file
   - Record counts deleted
   - Note any errors

### After Execution

1. **Verify Data:**
   - Check that old data was removed
   - Verify current data is intact
   - Test application functionality

2. **Update Documentation:**
   - Record cleanup execution
   - Document any issues encountered
   - Update maintenance logs

## Integration with Existing System

### Follows Engineering Guidelines

- ✅ TypeScript discipline (proper types, no `any`)
- ✅ Database operations (atomic updates, error handling)
- ✅ Code organization (scripts directory)
- ✅ Documentation standards (comprehensive docs)

### Follows Collection Report Guidelines

- ✅ Understands collection structure
- ✅ Properly handles collection history
- ✅ Maintains data integrity
- ✅ Respects database relationships

### Follows Type Safety Rules

- ✅ Types in appropriate locations
- ✅ No duplicate type definitions
- ✅ Proper imports from shared types
- ✅ Comprehensive type coverage

## Future Enhancements

Potential improvements for future versions:

1. **Configurable Cutoff Date:**
   - Allow passing cutoff date as parameter
   - Support for different date ranges

2. **Dry Run Mode:**
   - Preview what would be deleted
   - No actual deletions performed

3. **Archive Option:**
   - Export data before deletion
   - Save to JSON or CSV files

4. **Scheduled Execution:**
   - Cron job integration
   - Automated cleanup schedules

5. **Selective Cleanup:**
   - Filter by location
   - Filter by collector
   - Filter by specific criteria

## Support and Troubleshooting

### Common Issues

**Script Won't Run:**

- Ensure tsx is installed: `pnpm install`
- Check Node.js version (should be 18+)
- Verify TypeScript compilation

**Database Connection Errors:**

- Check MONGODB_URI in .env.local
- Verify database is accessible
- Check network connectivity

**No Data Deleted:**

- Verify data exists older than 2025
- Check database permissions
- Review error messages

### Getting Help

- Review `scripts/README.md` for detailed instructions
- Check `.cursor/application-context.md` for system context
- Review Collection Report documentation for data structure
- Consult Engineering Guidelines for best practices

## References

### Documentation Files

- `Documentation/backend/collection-report.md`
- `Documentation/frontend/collection-report.md`
- `Documentation/database-models.md`
- `Documentation/typescript-type-safety-rules.md`
- `Documentation/financial-metrics-guide.md`
- `Documentation/ENGINEERING_GUIDELINES.md`

### Code Files

- `scripts/cleanup-old-collections.js` - Main Node.js cleanup script
- `scripts/README.md` - Usage documentation
- `package.json` - Script definition
- `.cursor/application-context.md` - System context
- `CLEANUP_SCRIPT_SUMMARY.md` - This implementation summary

---

**Last Updated:** November 6th, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Ready for Use
