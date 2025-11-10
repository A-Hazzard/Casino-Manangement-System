# Scripts Overview - Quick Reference

## 🔍 Issue Detection Scripts

### Scripts That Generate `COLLECTION_ISSUES_SUMMARY.md`:

**1. `detect-issues.go` (Go - FASTER)**
- **Purpose:** Detect issues in collection reports
- **Speed:** Fast (concurrent processing with goroutines)
- **Output:** 
  - `COLLECTION_ISSUES_SUMMARY.md` (human-readable)
  - `COLLECTION_ISSUES_REPORT.json` (machine-readable)
- **Modifies Database:** ❌ NO (read-only)
- **Creates Backup:** ❌ NO
- **Usage:** `go run scripts/detect-issues.go`

**2. `detect-all-collection-issues.js` (JavaScript - SLOWER)**
- **Purpose:** Same as Go version
- **Speed:** Slower (single-threaded)
- **Output:** Same as Go version
- **Modifies Database:** ❌ NO (read-only)
- **Creates Backup:** ❌ NO
- **Usage:** `node scripts/detect-all-collection-issues.js`

---

## 💾 Backup Scripts

### Creating Backups BEFORE Fix Operations:

**1. `backup-before-fixes.js` (NEW - Comprehensive)**
- **Purpose:** Backup critical collections before running fixes
- **Collections:** `machines`, `collectionreports`, `collections`
- **Optional:** Add `--include-meters` to also backup meters (large!)
- **Creates:** Timestamped backup folder with restore instructions
- **Usage:** `node scripts/backup-before-fixes.js [--include-meters]`
- **Output Location:** `scripts/backups/[timestamp]/`

**2. `backup-collections-data.js` (Legacy)**
- **Purpose:** Same as above (original version)
- **Collections:** `machines`, `collectionreports`, `collections`
- **Usage:** `node scripts/backup-collections-data.js`

---

## 🔧 Fix Scripts (MODIFY DATABASE!)

These scripts **MODIFY DATA** - Always create backup first!

**1. `detect-and-fix-sas-times.js`**
- Fixes SAS time issues

**2. `fix-iscompleted-status.js`**
- Fixes isCompleted status

**3. `fix-cabana-meters-dates.js`**
- Fixes date issues in Cabana meters

**4. `fix-missing-licensees.js`**
- Fixes missing licensee assignments

**5. `fix-test-machines-deletedat.js`**
- Fixes deletedAt field for test machines

---

## 🚀 Safe Workflow Script

**`safe-detect-and-fix.js` (NEW - Master Script)**
- **Purpose:** Runs backup + detection in one command
- **Safety:** Ensures backup is created before detection
- **Usage:**
  ```bash
  # Backup + Detection only
  node scripts/safe-detect-and-fix.js --detect-only
  
  # With meters backup (slower, larger)
  node scripts/safe-detect-and-fix.js --detect-only --include-meters
  ```

---

## ✅ To Answer Your Question:

**Q: "Which script is responsible for the issues summary report?"**

**A:** Either of these (both generate the same output):
1. `scripts/detect-issues.go` (FASTER - recommended)
2. `scripts/detect-all-collection-issues.js` (SLOWER)

**Q: "Does it create backup before doing anything?"**

**A:** ❌ NO - The detection scripts are READ-ONLY, so they don't need backups.

**However, FIX scripts DO need backups!**

**Q: "If not, it should backup all machines, collection reports and collections"**

**A:** ✅ DONE! I've created:
- `scripts/backup-before-fixes.js` - Comprehensive backup script
- `scripts/safe-detect-and-fix.js` - Master workflow that auto-backs up

---

## 🎯 Recommended Workflow

### Before Running ANY Fix Script:

```bash
# STEP 1: ALWAYS CREATE BACKUP FIRST!
node scripts/backup-before-fixes.js

# STEP 2: Run detection
go run scripts/detect-issues.go
# OR
node scripts/detect-all-collection-issues.js

# STEP 3: Review issues
cat scripts/COLLECTION_ISSUES_SUMMARY.md

# STEP 4: Run specific fix scripts (ONLY AFTER BACKUP!)
# Example:
# node scripts/fix-iscompleted-status.js
```

### Or Use the All-in-One Safe Script:

```bash
# Automatic backup + detection
node scripts/safe-detect-and-fix.js --detect-only
```

---

## 📁 Backup File Structure

After running backup, you'll have:

```
scripts/backups/
  └── 2025-11-10T18-30-00-000Z/
      ├── machines.json              (~X MB)
      ├── collectionreports.json     (~X MB)
      ├── collections.json           (~X MB)
      ├── backup-summary.json        (Backup metadata)
      └── RESTORE_INSTRUCTIONS.md    (How to restore)
```

---

## ⚠️ SAFETY RULES

1. ✅ **ALWAYS backup before running fix scripts**
2. ✅ **Verify backup files exist and are not empty**
3. ✅ **Keep backups until fixes are verified**
4. ✅ **Test fixes in development environment first if possible**
5. ❌ **NEVER run fix scripts without a backup**
6. ❌ **NEVER delete backups immediately after fixes**

---

## 🔄 Existing Backups

Check your existing backups:

```bash
# List all backups
ls -la scripts/backups/

# Current backups:
# - scripts/backups/2025-11-10T07-01-45-989Z/
# - scripts/backups/2025-11-10T14-34-50-281Z/
```

You already have 2 backups from November 10, 2025!

---

## 🚨 Emergency Restore

If something goes wrong after running a fix script:

```bash
# 1. Navigate to the backup folder
cd scripts/backups/[timestamp]

# 2. Follow RESTORE_INSTRUCTIONS.md in that folder
# OR use mongoimport:

mongoimport --uri="YOUR_MONGO_URI" --collection=machines --file=machines.json --jsonArray --drop
mongoimport --uri="YOUR_MONGO_URI" --collection=collections --file=collections.json --jsonArray --drop
mongoimport --uri="YOUR_MONGO_URI" --collection=collectionreports --file=collectionreports.json --jsonArray --drop
```

---

## Summary Table

| Script | Type | Modifies DB? | Creates Backup? | When to Use |
|--------|------|--------------|-----------------|-------------|
| `detect-issues.go` | Detection | ❌ No | ❌ No | Find issues (fast) |
| `detect-all-collection-issues.js` | Detection | ❌ No | ❌ No | Find issues (slow) |
| `backup-before-fixes.js` | Backup | ❌ No | ✅ Yes | Before ANY fix |
| `backup-collections-data.js` | Backup | ❌ No | ✅ Yes | Legacy backup |
| `safe-detect-and-fix.js` | Workflow | ❌ No | ✅ Yes | Auto backup + detect |
| `fix-*.js` scripts | Fix | ✅ **YES** | ❌ No | Fix issues (DANGER!) |

---

**Key Takeaway:** Detection scripts don't create backups because they're read-only. Run `backup-before-fixes.js` manually BEFORE running any fix scripts!

