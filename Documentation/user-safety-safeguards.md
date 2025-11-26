# User Safety & Safeguards

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** November 22, 2025  
**Version:** 1.1.0

## Overview

This document analyzes potential mistakes non-technical users might make when using the Evolution One CMS and documents the system's safeguards to prevent data corruption or operational issues.

---

## 🎯 User Personas

### 1. **Manager** (Non-Technical)
- Views financial reports
- Creates collection reports
- Limited technical understanding
- Focus on business operations

### 2. **Collector** (Field Staff)
- Enters meter readings on mobile
- Creates collection reports
- Limited training
- Works under time pressure

### 3. **Location Admin** (Site Manager)
- Manages location-specific operations
- Reviews collection reports
- Basic computer skills
- Busy with on-site operations

---

## 🚨 Potential User Mistakes & Safeguards

### 1. **Abandoning Partially Completed Collection Reports**

#### **Mistake Scenario:**
User starts entering machine meter data, gets distracted (phone call, emergency), and tries to close the modal or navigate away without saving.

#### **Risk Level:** 🔴 HIGH
- Could lose 30+ minutes of data entry work
- User frustration and time waste
- Incomplete data in database

#### **Current Safeguards:** ✅ PROTECTED

**`isEditing` Flag System:**
```typescript
// Prevents navigation when unsaved changes exist
if (isEditing) {
  const confirmLeave = confirm("You have unsaved changes. Are you sure you want to leave?");
  if (!confirmLeave) return;
}
```

**Implementation:**
- `components/collectionReport/NewCollectionModal.tsx`
- `components/collectionReport/EditCollectionModal.tsx`
- Prompts user before closing modal
- Prompts user before navigating away
- Saves `isEditing` state in Zustand store

**Automatic Resume Flow (November 15th, 2025):**
- `app/collection-report/page.tsx` now auto-opens the edit modal when `?resume=<reportId>` is present or when the API reports an unfinished edit.
- `app/collection-report/report/[reportId]/page.tsx` redirects to `/collection-report?resume=...` whenever it detects an incomplete report, ensuring cross-device recovery.
- Users always return to the unfinished edit with a toast notification and cannot close the modal until changes are finalized or discarded.

**User Experience:**
- ✅ Clear warning dialog
- ✅ Option to stay and continue editing
- ✅ Works on desktop and mobile

#### **Recommended Enhancement:** 🟡
- **Auto-save to localStorage** every 30 seconds
- **Restore draft** option when user returns
- **Session recovery** after browser crash

---

### 2. **Editing Historical Collection Reports**

#### **Mistake Scenario:**
User notices a mistake in last week's collection report and tries to edit it, not realizing this will break the chronological chain of subsequent reports.

#### **Risk Level:** 🔴 CRITICAL
- Breaks SAS time chain integrity
- Causes cascading calculation errors
- Affects all subsequent reports
- Financial discrepancies

#### **Current Safeguards:** ✅ PROTECTED

**Edit Icon Restrictions:**
```typescript
// Only show edit icon on MOST RECENT report per location
const editableReportIds = useMemo(() => {
  const reportsByLocation = new Map<string, CollectionReport>();
  
  for (const report of allReports) {
    const existing = reportsByLocation.get(report.locationId);
    if (!existing || new Date(report.date) > new Date(existing.date)) {
      reportsByLocation.set(report.locationId, report);
    }
  }
  
  return new Set(Array.from(reportsByLocation.values()).map(r => r.locationReportId));
}, [allReports]);

// Only authorized roles can edit
const canUserEdit = hasManagerAccess(user) || user?.roles?.includes('admin') || user?.roles?.includes('developer');
```

**Implementation:**
- `app/collection-report/page.tsx` (lines 200-220)
- Edit/Delete icons only on most recent report
- Role-based access control
- Clear visual indication

**User Experience:**
- ✅ Historical reports show "view only" mode
- ✅ No edit button visible on old reports
- ✅ Prevents accidental edits

#### **Recommended Enhancement:** ⚪
- Current safeguard is sufficient
- Consider audit log for admin edits

---

### 3. **Entering Incorrect Meter Values**

#### **Mistake Scenario:**
User types wrong meter values:
- `1000` instead of `10000` (missing digit)
- `100` instead of `1000` (meters went DOWN)
- `1000000` instead of `10000` (extra digit)

#### **Risk Level:** 🟡 MEDIUM
- Financial calculation errors
- Audit trail inconsistencies
- Potential regulatory issues

#### **Current Safeguards:** ✅ PARTIALLY PROTECTED

**Validation Rules:**
```typescript
// Check meters are >= previous meters
if (currentMetersIn < previousMetersIn) {
  error = "Current meters cannot be less than previous meters";
}

// Check RAM clear scenario
if (hasRamClear) {
  if (ramClearMetersIn < previousMetersIn) {
    error = "RAM clear meters must be >= previous meters";
  }
}
```

**Implementation:**
- `components/collectionReport/NewCollectionModal.tsx`
- `components/collectionReport/EditCollectionModal.tsx`
- Real-time validation with debounce
- Clear error messages

**User Experience:**
- ✅ Prevents meters going backward
- ✅ Clear error message displayed
- ❌ NO warning for unusually large jumps

#### **Recommended Enhancement:** 🟡 MEDIUM PRIORITY

**Anomaly Detection:**
```typescript
// Warn on unusually large meter increase
const meterIncrease = currentMetersIn - previousMetersIn;
const averageIncrease = calculateAverageMeterIncrease(machineId);

if (meterIncrease > averageIncrease * 10) {
  showWarningDialog({
    title: "Unusually Large Meter Increase",
    message: `Meters increased by ${meterIncrease.toLocaleString()}, which is ${Math.round(meterIncrease / averageIncrease)}x higher than average. Please verify.`,
    confirmText: "I've Verified - Continue",
    cancelText: "Let Me Check"
  });
}
```

---

### 4. **Deleting Active Machines**

#### **Mistake Scenario:**
User tries to delete a machine that's currently in use or has recent collection data.

#### **Risk Level:** 🔴 HIGH
- Breaks collection chain
- Orphaned meter data
- Lost historical data
- Financial reporting gaps

#### **Current Safeguards:** ✅ PROTECTED

**Soft Delete System:**
```typescript
// Machines are never truly deleted
await Machine.updateOne(
  { _id: machineId },
  { 
    $set: { 
      deletedAt: new Date(),
      assetStatus: 'decommissioned'
    } 
  }
);
```

**Implementation:**
- All machine queries filter `deletedAt: { $exists: false }` or `deletedAt: -1`
- Historical data remains intact
- Machine can be "undeleted" by admin

**User Experience:**
- ✅ Machine disappears from active lists
- ✅ Historical reports still show data
- ✅ No data loss

#### **Recommended Enhancement:** ⚪
- Current safeguard is sufficient
- Consider additional confirmation dialog for machines with recent activity

---

### 5. **Creating Duplicate Collection Reports**

#### **Mistake Scenario:**
User creates 2 collection reports for the same location on the same day (e.g., clicks "Create Report" twice).

#### **Risk Level:** 🟢 ALLOWED
- Multiple reports per location per day is now permitted
- Use case: Mid-day and end-of-day collections
- Each report has unique `locationReportId`

#### **Current Safeguards:** ✅ NO RESTRICTION (Removed Nov 11, 2025)

**Behavior:**
- Users can create unlimited collection reports for the same location/date
- Each report gets a unique identifier
- All reports are stored and accessible
- No duplicate prevention at API or UI level

**Historical Note:**
Previous versions (before Nov 11, 2025) prevented duplicate reports with a 409 Conflict error. This restriction was removed per business requirement to allow multiple collections per day.

**Implementation:**
- `app/api/collectionReport/route.ts` - Duplicate check removed entirely

---

### 6. **Changing Licensee While Collections in Progress**

#### **Mistake Scenario:**
Admin changes a location's licensee assignment while collectors are actively entering collection data for that location.

#### **Risk Level:** 🔴 CRITICAL
- Collections orphaned (wrong licensee context)
- Data visibility issues (collections disappear for original licensee)
- Financial reporting errors
- Session invalidation mid-operation

#### **Current Safeguards:** ✅ PROTECTED

**Session Version System:**
```typescript
// ⚠️ IMPORTANT: sessionVersion is ONLY incremented when permissions change
// It is NOT incremented on login - this allows multiple concurrent sessions

// When permissions change, sessionVersion increments
await User.findOneAndUpdate(
  { _id: userId },
  { 
    $set: { 'rel.licencee': newLicenseeId },
    $inc: { sessionVersion: 1 }  // Increment version
  }
);

// On login, sessionVersion is NOT incremented:
await User.findOneAndUpdate(
  { _id: userId },
  {
    $set: { lastLoginAt: now },  // Only update login metadata
    $inc: { loginCount: 1 }      // Increment login count
    // sessionVersion remains unchanged
  }
);

// JWT middleware checks session version
if (user.sessionVersion !== tokenSessionVersion) {
  // Force logout
  return NextResponse.json(
    { error: "Session invalidated - please login again" },
    { status: 401 }
  );
}
```

**Implementation:**
- `app/api/users/route.ts` (user update endpoint)
- `app/api/lib/middleware/dbConnect.ts` (session validation)
- Automatic logout on permission changes

**User Experience:**
- ✅ Active users forced to logout
- ✅ Clear toast notification
- ✅ Must re-login with new permissions
- ✅ Prevents orphaned data

#### **Recommended Enhancement:** ⚪
- Current safeguard is sufficient
- Consider notifying active users before permission change

---

### 7. **Entering Meters During RAM Clear**

#### **Mistake Scenario:**
Machine undergoes RAM clear (meter reset), but user doesn't check the "RAM Clear" checkbox, causing meter validation to fail.

#### **Risk Level:** 🟡 MEDIUM
- Meter validation errors
- Collection blocked
- User confusion

#### **Current Safeguards:** ✅ PROTECTED

**RAM Clear Detection & Validation:**
```typescript
// Automatic detection when meters < previous
if (currentMetersIn < previousMetersIn) {
  setShouldShowRamClearPrompt(true);
  // Prompt: "Meters appear lower than previous. Did a RAM clear occur?"
}

// RAM Clear validation
if (hasRamClear) {
  if (!ramClearMetersIn || !ramClearMetersOut) {
    error = "RAM clear meters are required when RAM clear is checked";
  }
  
  // Calculate movement correctly
  const movement = (ramClearMetersIn - previousMetersIn) + currentMetersIn;
}
```

**Implementation:**
- `components/collectionReport/NewCollectionModal.tsx`
- Automatic detection
- Clear prompt and explanation
- Correct calculation handling

**User Experience:**
- ✅ Automatic prompt when meters go down
- ✅ Clear explanation of RAM clear process
- ✅ Validation prevents incorrect entry

#### **Recommended Enhancement:** 🟡
- Add visual guide/diagram explaining RAM clear
- Add example values

---

### 8. **Not Understanding Gaming Day Offset**

#### **Mistake Scenario:**
User creates collection report at 2 AM thinking it's for "today", but gaming day starts at 8 AM, so it's actually still part of "yesterday".

#### **Risk Level:** 🟡 MEDIUM
- Wrong date assignment
- Financial reporting confusion
- Audit trail issues

#### **Current Safeguards:** ✅ PROTECTED

**Gaming Day Offset Handling:**
```typescript
// Backend calculates correct gaming day
const gamingDayOffset = location.gameDayOffset || 8; // Default 8 AM
const now = new Date();
const currentHour = now.getHours();

// If before gaming day offset, use previous calendar date
const gamingDayDate = currentHour < gamingDayOffset
  ? new Date(now.setDate(now.getDate() - 1))
  : now;
```

**Implementation:**
- `lib/utils/timeCalculations.ts`
- Automatic calculation
- Location-specific offset support

**User Experience:**
- ✅ Correct date calculated automatically
- ❌ NO visual indicator of gaming day vs calendar day

#### **Recommended Enhancement:** 🟡

**Visual Gaming Day Indicator:**
```typescript
// Show gaming day info in UI
<div className="bg-blue-50 p-3 rounded-lg mb-4">
  <p className="text-sm text-blue-700">
    <strong>Gaming Day:</strong> {formatDate(gamingDayDate)}
    {currentHour < gamingDayOffset && (
      <span className="ml-2 text-xs">(Calendar date: {formatDate(new Date())})</span>
    )}
  </p>
  <p className="text-xs text-blue-600 mt-1">
    Gaming day starts at {gamingDayOffset}:00 AM
  </p>
</div>
```

---

## 🔒 Developer-Only Features

### Issue Warnings & Debug Information

**Restriction:** Only users with `developer` role can see technical issue warnings.

**Rationale:**
- Non-technical users shouldn't see complex SAS time chain issues
- Prevents user confusion and alarm
- Issues are automatically detected and can be auto-fixed
- Developers need this info for troubleshooting

**Implementation:**
```typescript
// Collection Report Details Page
{user?.roles?.includes('developer') && (hasSasTimeIssues || hasCollectionHistoryIssues) && (
  <div className="warning-banner">
    {/* SAS Time Issues Warning */}
    {/* Collection History Issues Warning */}
    {/* Fix Report Button */}
  </div>
)}
```

**Protected Information:**
- ✅ SAS time chain issues (inverted times, missing times)
- ✅ Collection history prev meters mismatches
- ✅ "Fix Report" button for auto-correction
- ✅ Technical error details and stack traces

**User Experience:**
- **Managers/Admins**: See clean interface without technical warnings
- **Developers**: See all debug information and fix tools
- **All Users**: Financial data displays correctly regardless

---

## 📊 Safeguard Summary Matrix

| Risk | Safeguard Status | Priority | Implementation |
|------|-----------------|----------|----------------|
| Abandoning partial entry | ✅ Protected | ⚪ Low | `isEditing` flag system |
| Editing historical reports | ✅ Protected | ⚪ Low | Edit icon restrictions |
| Incorrect meter values | 🟡 Partial | 🟡 Medium | Add anomaly detection |
| Deleting active machines | ✅ Protected | ⚪ Low | Soft delete system |
| Duplicate reports | 🟢 Allowed | N/A | No restriction (by design) |
| Licensee changes mid-operation | ✅ Protected | ⚪ Low | Session version system |
| RAM clear confusion | ✅ Protected | 🟡 Medium | Add visual guide |
| Gaming day confusion | 🟡 Partial | 🟡 Medium | Add visual indicator |

**Legend:**
- ✅ Protected: Full safeguard implemented
- 🟡 Partial: Partial protection, enhancement recommended
- 🟢 Allowed: Intentionally no restriction (by design)
- ⚠️ Unknown: Needs investigation
- 🔴 High: Critical priority
- 🟡 Medium: Moderate priority
- ⚪ Low: Current implementation sufficient

---

## 🎯 Recommended Enhancements (Priority Order)

### 1. **MEDIUM PRIORITY 🟡**

#### Meter Anomaly Detection
- **Implementation Time**: 4-6 hours
- **Impact**: Catches data entry errors before they become issues
- **Location**: Collection modal validation

#### Gaming Day Visual Indicator
- **Implementation Time**: 2-3 hours
- **Impact**: Reduces user confusion about dates
- **Location**: Collection modal header

#### RAM Clear Visual Guide
- **Implementation Time**: 2-3 hours
- **Impact**: Helps users understand RAM clear process
- **Location**: Collection modal RAM clear section

### 3. **LOW PRIORITY (Nice to Have) ⚪**

#### Auto-save to localStorage
- **Implementation Time**: 6-8 hours
- **Impact**: Improves UX, prevents data loss on crash
- **Location**: Collection modals

#### Pre-change Notifications
- **Implementation Time**: 3-4 hours
- **Impact**: Warns users before permission changes
- **Location**: Admin user management

---

## 🛡️ System Philosophy

The Evolution One CMS follows a **"Prevent, Don't Punish"** philosophy:

1. **Prevent Mistakes**: Use validation, confirmation dialogs, and UI design to prevent errors
2. **Soft Failures**: Use soft deletes, session invalidation, and reversible operations
3. **Clear Feedback**: Provide clear error messages and guidance
4. **Role-Based Visibility**: Show technical details only to technical users
5. **Audit Trail**: Log all critical operations for accountability

**Result**: Non-technical users can safely use the system without causing data corruption, while developers have full access to troubleshooting tools.

---

**Last Updated:** November 22, 2025  
**Next Review:** December 2025 (after user feedback)

