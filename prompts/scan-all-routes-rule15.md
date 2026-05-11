# Scan All API Routes for Rule 15 Violations

## Goal

Scan ALL `route.ts` files in `app/api/` for Rule 15 (Critical Operation Result Checking) violations.

## Rules to Check

### Rule 15 — Critical Operation Result Checking (Within Try Blocks)

When performing critical database operations, **always check the result** and return early on failure.

**Critical operations that MUST be checked:**

- `deleteOne()`, `deleteMany()` → Check `deletedCount`
- `findOneAndDelete()` → Check if result is null
- `findOneAndUpdate()`, `updateOne()`, `updateMany()` → Check `modifiedCount` or result
- `insertMany()` → Check `insertedCount`
- `save()` → Check if save was successful
- Helper functions returning `{ success: boolean; error?: string }` → Check `success`

### Rule 16 — Caller Responsibility

When calling functions that return `{ success: boolean; error?: string }`, the **caller MUST check the result**.

## Instructions

1. **Get all route.ts files:**

   ```powershell
   Get-ChildItem -Path "app/api" -Filter "route.ts" -Recurse | Select-Object -ExpandProperty FullName
   ```

2. **For EACH file, read and check:**
   - `await SomeModel.deleteOne(...)` → Is `deletedCount` checked?
   - `await SomeModel.findOneAndDelete(...)` → Is result checked for null?
   - `await SomeModel.findOneAndUpdate(...)` → Is result checked?
   - `await SomeModel.updateMany(...)` → Is `modifiedCount` checked?
   - `await SomeModel.insertMany(...)` → Is `insertedCount` checked?
   - `await someDoc.save()` → Is result checked?
   - `await someHelper(...)` → Does helper return `{ success }`? Is it checked?

3. **Report ONLY files with violations** (missing error checks)

4. **Exclude these already-fixed files:**
   - `app/api/collection-reports/route.ts` ✅
   - `app/api/collection-reports/[reportId]/route.ts` ✅
   - `app/api/auth/login/route.ts` ✅
   - `app/api/activity-logs/[id]/route.ts` ✅ (fixed)
   - `app/api/locations/route.ts` ✅ (fixed)
   - `app/api/users/route.ts` ✅ (helpers throw, caught by try/catch)
   - `app/api/vault/collection-session/finalize/route.ts` ✅ (fixed)

## Output Format

For each violation found, report:

```
### File: `app/api/[path]/route.ts`
- **Line XX**: `await Model.deleteOne(...)` — result not checked
- **Line YY**: `await helperFunction()` — returns `{success}` but not checked
```

## Summary

At the end, provide:

1. **Total files scanned**
2. **Files with violations** (list)
3. **Files that are compliant** (can be removed from future scans)

## Files Already Scanned (Status Known)

### ✅ Compliant (No action needed)

- `app/api/auth/login/route.ts`
- `app/api/vault/transfers/route.ts`
- `app/api/vault/payouts/route.ts`
- `app/api/cashier/shift/open/route.ts`
- `app/api/cabinets/route.ts`
- `app/api/analytics/charts/route.ts`
- `app/api/accounting-details/route.ts`

### ✅ Fixed (Violations found and corrected)

- `app/api/collection-reports/route.ts`
- `app/api/collection-reports/[reportId]/route.ts`
- `app/api/activity-logs/[id]/route.ts`
- `app/api/locations/route.ts`
- `app/api/vault/collection-session/finalize/route.ts`

### ❌ Violations Found (Need fixing)

- `app/api/smib/ota-update/route.ts` — `updateOne()` result not checked
- `app/api/movement-requests/[id]/route.ts` — `deleteOne/findOneAndUpdate` results not checked
- `app/api/cashier/shift/*.ts` (4 files) — `save()`, `updateOne()` results not checked
- `app/api/auth/totp/*.ts` (5 files) — `user.save()` results not checked
- `app/api/cabinets/[cabinetId]/route.ts` — `updateMany()`, `deleteOne()` results not checked

## Next Steps

After running this scan:

1. Fix all violations found
2. Update `prompts/guard-checklist.md` with results
3. Mark all compliant files as `[x]` in checklist
