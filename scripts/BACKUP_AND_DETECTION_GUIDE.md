# 🔒 Backup and Issue Detection Guide

## Overview

Before running ANY fix scripts that modify your database, you should **ALWAYS create a backup** of your critical collections.

---

## 📚 Available Scripts

### Detection Scripts (READ-ONLY - Safe to Run)

**1. Go Version (Faster - Concurrent Processing)**
```bash
go run scripts/detect-issues.go
```
- Uses goroutines for parallel processing
- Faster for large datasets
- Generates: `COLLECTION_ISSUES_SUMMARY.md` and `COLLECTION_ISSUES_REPORT.json`

**2. JavaScript Version (Slower - Sequential Processing)**
```bash
node scripts/detect-all-collection-issues.js
```
- Single-threaded processing
- Easier to debug
- Generates same output files

### Backup Scripts (IMPORTANT - Run Before Fixes!)

**1. Comprehensive Backup (Recommended)**
```bash
node scripts/backup-before-fixes.js
```
- Backs up: `machines`, `collectionreports`, `collections`
- Creates timestamped backup folder
- Includes restore instructions

**2. Backup with Meters Collection (Slow, Large)**
```bash
node scripts/backup-before-fixes.js --include-meters
```
- Also backs up `meters` collection (can be very large!)
- Use only if you're modifying meters data

**3. Legacy Backup Script**
```bash
node scripts/backup-collections-data.js
```
- Original backup script (still works)

### Safe Workflow Script (All-in-One)

**Master Script - Backup + Detection**
```bash
# Detect only (with auto-backup)
node scripts/safe-detect-and-fix.js --detect-only

# Detect with meters backup
node scripts/safe-detect-and-fix.js --detect-only --include-meters
```

---

## 🎯 Recommended Workflow

### Safe Detection and Fix Process

```bash
# STEP 1: Create backup (ALWAYS DO THIS FIRST!)
node scripts/backup-before-fixes.js

# STEP 2: Run detection
go run scripts/detect-issues.go
# OR
node scripts/detect-all-collection-issues.js

# STEP 3: Review the issues
cat scripts/COLLECTION_ISSUES_SUMMARY.md

# STEP 4: Run specific fix scripts (if needed)
# ONLY run fixes AFTER reviewing the issues!
# Examples:
# - node scripts/fix-iscompleted-status.js
# - node scripts/detect-and-fix-sas-times.js
# - etc.
```

---

## 📦 What Gets Backed Up

### Critical Collections (Always)
1. **`machines`** - Machine configuration and metadata
2. **`collectionreports`** - Collection report summaries
3. **`collections`** - Individual collection records

### Optional Collections (With --include-meters flag)
4. **`meters`** - Meter readings (LARGE - only backup if modifying)

---

## 💾 Backup Structure

```
scripts/backups/
  └── 2025-11-10T18-30-00-000Z/
      ├── machines.json              (Machine data)
      ├── collectionreports.json     (Collection reports)
      ├── collections.json           (Collections)
      ├── backup-summary.json        (Metadata)
      └── RESTORE_INSTRUCTIONS.md    (How to restore)
```

---

## 🔄 How to Restore from Backup

### Option 1: Using mongoimport (Easiest)

```bash
# Navigate to backup directory
cd scripts/backups/2025-11-10T18-30-00-000Z

# Restore machines
mongoimport --uri="YOUR_MONGO_URI" --collection=machines --file=machines.json --jsonArray --drop

# Restore collections
mongoimport --uri="YOUR_MONGO_URI" --collection=collections --file=collections.json --jsonArray --drop

# Restore collectionreports
mongoimport --uri="YOUR_MONGO_URI" --collection=collectionreports --file=collectionreports.json --jsonArray --drop
```

### Option 2: Using MongoDB Compass
1. Open MongoDB Compass
2. Connect to your database
3. Select the collection
4. Click "Add Data" → "Import File"
5. Select the .json file
6. Click "Import"

---

## ⚠️ CRITICAL SAFETY RULES

### Before Running ANY Fix Script:

✅ **1. CREATE A BACKUP**
```bash
node scripts/backup-before-fixes.js
```

✅ **2. VERIFY THE BACKUP**
- Check that backup files exist in `scripts/backups/[timestamp]/`
- Verify files are not empty (check file sizes)
- Open one backup file to confirm it contains valid JSON

✅ **3. TEST IN DEVELOPMENT FIRST**
- If possible, restore backup to a test database
- Run fix script on test database
- Verify results before running on production

✅ **4. KEEP MULTIPLE BACKUPS**
- Don't delete old backups immediately
- Keep backups until fixes are verified in production
- Consider keeping weekly backups long-term

---

## 📊 Detection Scripts Output

Both detection scripts generate:

### 1. `COLLECTION_ISSUES_SUMMARY.md`
- Human-readable markdown report
- Lists all issues found
- Grouped by collection report
- First 50 reports shown (full details in JSON)

### 2. `COLLECTION_ISSUES_REPORT.json`
- Complete machine-readable JSON
- All issues with full details
- Can be parsed programmatically
- Used by automated fix scripts

---

## 🔧 Fix Scripts Available

Based on issue types detected, you can run:

### SAS Time Issues
```bash
node scripts/detect-and-fix-sas-times.js
```

### Collection History Issues
```bash
# Use API endpoints:
# POST /api/collection-reports/fix-all-collection-history
# POST /api/collection-report/[reportId]/fix-collection-history
```

### IsCompleted Status Issues
```bash
node scripts/fix-iscompleted-status.js
```

---

## 🚨 Emergency Rollback

If a fix script causes problems:

```bash
# 1. Stop all scripts immediately (Ctrl+C)

# 2. Navigate to latest backup
cd scripts/backups/[latest-timestamp]

# 3. Restore all collections
mongoimport --uri="YOUR_MONGO_URI" --collection=machines --file=machines.json --jsonArray --drop
mongoimport --uri="YOUR_MONGO_URI" --collection=collections --file=collections.json --jsonArray --drop
mongoimport --uri="YOUR_MONGO_URI" --collection=collectionreports --file=collectionreports.json --jsonArray --drop

# 4. Verify restoration
# Run detection again to confirm data is back to original state
```

---

## 📈 Performance Comparison

| Script | Language | Speed | Use Case |
|--------|----------|-------|----------|
| `detect-issues.go` | Go | **FAST** | Large datasets (1000+ reports) |
| `detect-all-collection-issues.js` | JavaScript | Slower | Smaller datasets, easier debugging |

**Recommendation:** Use Go version for production scans (faster)

---

## 🔍 Current Status

Based on your latest scan:

```
Total Reports: 4,567
Reports with Issues: 97
Total Issues: 709
```

**Issue Types:**
- Missing SAS Start Time: 691 issues
- Collection History Issues: 18 issues
- SAS Time Issues: 0 issues
- Inverted SAS Times: 0 issues

---

## 🎯 Quick Reference

### Just Want to Detect Issues?
```bash
# Fast (Go - Recommended)
go run scripts/detect-issues.go

# Slower (JavaScript)
node scripts/detect-all-collection-issues.js
```

### Need to Run Fixes?
```bash
# 1. Backup first (ALWAYS!)
node scripts/backup-before-fixes.js

# 2. Detect issues
go run scripts/detect-issues.go

# 3. Review issues
cat scripts/COLLECTION_ISSUES_SUMMARY.md

# 4. Run specific fix scripts as needed
# (Based on issues found)
```

### All-in-One Safe Workflow?
```bash
# Backup + Detection only
node scripts/safe-detect-and-fix.js --detect-only

# With meters backup (slower)
node scripts/safe-detect-and-fix.js --detect-only --include-meters
```

---

## 📝 Notes

- **Detection scripts are READ-ONLY** - Safe to run anytime, won't modify data
- **Fix scripts MODIFY DATA** - Always backup first!
- **Backups are timestamped** - Multiple backups can coexist
- **Go version is faster** - Use for production scans
- **JavaScript version is simpler** - Use for debugging or if Go not available

---

**Last Updated:** November 10, 2025  
**Status:** Complete workflow with backup protection

