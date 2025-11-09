# Database Migration Scripts

This directory contains database migration scripts for Evolution CMS.

---

## 📋 Available Migrations

### 1. **Add Session Version to Users**

**Script:** `migrate-add-session-version.js`

**Purpose:** Adds the `sessionVersion` field to all existing users for the auto-logout feature.

**What it does:**
- Finds all users without `sessionVersion` field
- Adds `sessionVersion: 1` to those users
- Enables automatic logout when permissions change

---

## 🚀 Quick Start

### **Step 1: Dry Run (Preview Changes)**

Always run a dry run first to see what will change:

```bash
npm run migrate:session-version:dry
```

or

```bash
node scripts/migrate-add-session-version.js --dry-run
```

**Output:**
```
📊 Total users in database: 150
🔍 Users WITHOUT sessionVersion field: 145
✅ Users WITH sessionVersion field: 5

📋 Sample users that will be updated:
  1. mkirton (mkirton@dynamic1group.com)
     - Roles: collector
     - Will add: sessionVersion: 1
  2. admin (admin@example.com)
     - Roles: admin
     - Will add: sessionVersion: 1
  ... and 143 more users

🔍 DRY RUN MODE - No changes will be made
```

---

### **Step 2: Apply Migration**

Once you've reviewed the dry run results:

```bash
npm run migrate:session-version
```

or

```bash
node scripts/migrate-add-session-version.js
```

**Output:**
```
⚠️  READY TO APPLY CHANGES
   This will update 145 users

⏳ Starting migration in 3 seconds...
   Press Ctrl+C to cancel

🚀 Applying migration...

✅ Migration completed!

📊 Results:
  - Matched: 145 users
  - Modified: 145 users
  - Duration: 0.87 seconds

✅ Verification successful!
   All users now have sessionVersion field

🎉 Migration successful!
```

---

## 🔧 Detailed Usage

### **Environment Variables**

The script uses the MongoDB connection string from your `.env` file:

```bash
MONGODB_URI=mongodb://username:password@host:port/database
```

**Priority order:**
1. `MONGODB_URI`
2. `MONGO_URI`
3. `DATABASE_URL`
4. Default: `mongodb://localhost:27017/dynamic1cms`

---

### **Custom MongoDB URI**

Override the connection string:

```bash
MONGODB_URI=mongodb://user:pass@server:27017/mydb node scripts/migrate-add-session-version.js
```

---

### **Command Line Options**

| Option | Description |
|--------|-------------|
| `--dry-run` or `-d` | Preview changes without applying |
| None | Apply migration to database |

---

## 🛡️ Safety Features

### **1. Dry Run Mode**
- Preview all changes before applying
- Shows sample users that will be updated
- No database modifications

### **2. Cancellation Window**
- 3-second countdown before applying
- Press `Ctrl+C` to cancel
- Safe exit at any time

### **3. Idempotent**
- Safe to run multiple times
- Only updates users WITHOUT the field
- Won't modify existing `sessionVersion` values

### **4. Verification**
- Automatically verifies results after migration
- Checks that all users have the field
- Reports any issues

---

## 📊 What Gets Changed

### **Before Migration:**

```javascript
// User document in MongoDB
{
  _id: "68a6195a0c156b25a3cedd84",
  username: "mkirton",
  emailAddress: "mkirton@dynamic1group.com",
  roles: ["collector"],
  // ❌ NO sessionVersion field
}
```

### **After Migration:**

```javascript
// User document in MongoDB
{
  _id: "68a6195a0c156b25a3cedd84",
  username: "mkirton",
  emailAddress: "mkirton@dynamic1group.com",
  roles: ["collector"],
  sessionVersion: 1,  // ✅ ADDED
}
```

---

## 🔍 Monitoring & Verification

### **Check Migration Status**

Connect to MongoDB and run:

```javascript
// Count users without sessionVersion
db.users.countDocuments({ sessionVersion: { $exists: false } })
// Should return: 0

// Count users with sessionVersion
db.users.countDocuments({ sessionVersion: { $exists: true } })
// Should return: total user count

// Sample users
db.users.find({ sessionVersion: 1 }).limit(5)
```

---

### **Monitor Auto-Logout Feature**

After migration, monitor these logs:

**Server logs:**
```
[Administration] 🔒 Permission fields changed - incrementing sessionVersion
[SESSION INVALIDATION] User X session version mismatch. DB: 2, JWT: 1
```

**Browser console:**
```
🔒 Session invalidated or authentication failed
✅ Session cleared
```

---

## ⚠️ Important Notes

### **When to Run This Migration**

Run this migration **once** after deploying the auto-logout feature:

1. ✅ After updating code with `sessionVersion` implementation
2. ✅ Before users start experiencing permission changes
3. ✅ During maintenance window (recommended, but not required)

### **Impact on Users**

- ✅ **No immediate impact** - users can continue working
- ✅ **No logout required** - users stay logged in
- ✅ Auto-logout only triggers **after** admin changes their permissions

### **Rollback**

If you need to remove the field (not recommended):

```bash
node scripts/rollback-session-version.js
```

*(Script not included - contact dev team if needed)*

---

## 🐛 Troubleshooting

### **Error: "Cannot connect to MongoDB"**

**Check:**
1. MongoDB is running
2. `.env` file has correct `MONGODB_URI`
3. Network connectivity to MongoDB server
4. Firewall rules allow connection

**Solution:**
```bash
# Test MongoDB connection
mongo "$MONGODB_URI"

# Or with mongosh
mongosh "$MONGODB_URI"
```

---

### **Error: "Permission denied"**

**Check:**
1. MongoDB user has write permissions
2. Database exists and is accessible
3. Correct credentials in `.env`

**Solution:**
Grant permissions in MongoDB:
```javascript
db.grantRolesToUser("username", [
  { role: "readWrite", db: "your_database" }
])
```

---

### **Migration Partially Completed**

If migration was interrupted:

1. **Check how many users were updated:**
   ```bash
   node scripts/migrate-add-session-version.js --dry-run
   ```

2. **Re-run the migration:**
   ```bash
   node scripts/migrate-add-session-version.js
   ```

3. **The script is idempotent** - it will only update remaining users

---

## 📚 Related Documentation

- **Auto-Logout Feature:** `docs/AUTO_LOGOUT_ON_PERMISSION_CHANGE.md`
- **Access Control:** `docs/LICENSEE_AND_LOCATION_ACCESS_CONTROL_GUIDELINE.md`
- **Implementation Summary:** `docs/COMPLETE_IMPLEMENTATION_SUMMARY.md`

---

## 💡 Need Help?

1. Run dry run first: `npm run migrate:session-version:dry`
2. Check MongoDB connection: `mongo $MONGODB_URI`
3. Verify `.env` settings
4. Check server logs for errors
5. Contact development team if issues persist

---

**Created:** 2025-11-08  
**Last Updated:** 2025-11-08  
**Version:** 1.0

