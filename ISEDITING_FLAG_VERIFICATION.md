# isEditing Flag Verification & Documentation

**Date**: November 5, 2025

---

## Summary

✅ **The `isEditing` flag system is FULLY IMPLEMENTED and working correctly!**

---

## How It Works

### 1. When Collections Are Modified (Sets isEditing: true)

**Backend** (`app/api/collections/[id]/route.ts` lines 244-260, 516-548):

```typescript
// When a collection's meters are updated via PATCH
if (updateData.metersIn !== undefined || updateData.metersOut !== undefined) {
  // Mark parent CollectionReport as isEditing: true
  const updateResult = await CollectionReport.findOneAndUpdate(
    { locationReportId: reportIdToUpdate },
    {
      $set: {
        isEditing: true,  // ← FLAG SET HERE
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
}
```

**When this triggers:**
- User edits a machine's meters in the edit modal
- User adds a new machine to an existing report
- Any meter value changes on a collection

**Purpose:**
- Indicates the report has unsaved changes
- Prevents users from losing work if they refresh or leave the page
- Allows auto-reopening the edit modal on page load

---

### 2. Page Load Auto-Open (Checks isEditing: true)

**Frontend** (`app/collection-report/page.tsx` lines 286-331):

```typescript
useEffect(() => {
  const checkForUnfinishedEdits = async () => {
    // Query for most recent report with isEditing: true
    const response = await axios.get('/api/collection-reports', {
      params: {
        isEditing: true,  // ← QUERY FOR FLAG
        limit: 1,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
    });

    if (response.data && response.data.length > 0) {
      const unfinishedReport = response.data[0];
      
      // Set the report ID to edit
      setEditingReportId(unfinishedReport._id);

      toast.info('Resuming unfinished edit...', {
        duration: 3000,
        position: 'top-right',
      });

      // Open the appropriate modal based on screen size
      if (isMobileSize()) {
        setShowMobileEditCollectionModal(true);
      } else {
        setShowDesktopEditCollectionModal(true);
      }
    }
  };

  // Run check on mount
  checkForUnfinishedEdits();
}, []); // Empty dependency array - run once on mount
```

**When this triggers:**
- User loads the collection reports page (`/collection-report`)
- On initial page mount (runs once)
- Finds the most recent report with `isEditing: true`
- Auto-opens the edit modal with that report

**User Experience:**
- User edits a report → refreshes page → edit modal automatically reopens
- Toast notification: "Resuming unfinished edit..."
- Work is not lost

---

### 3. Edit Modal Recognition (Sets hasUnsavedEdits)

**Desktop** (`components/collectionReport/EditCollectionModal.tsx` lines 511-518):

```typescript
// When report data is loaded in the edit modal
if (data.isEditing) {
  console.warn(
    '⚠️ Report has isEditing: true - marking as having unsaved edits'
  );
  setHasUnsavedEdits(true);  // ← SETS UNSAVED FLAG
}
```

**Mobile** (`components/collectionReport/mobile/MobileEditCollectionModal.tsx` lines 1224-1231):

```typescript
// CRITICAL: If report has isEditing: true, there are unsaved changes
if (reportData.isEditing) {
  console.warn(
    '⚠️ Report has isEditing: true - marking as having unsaved edits'
  );
  setModalState(prev => ({ ...prev, hasUnsavedEdits: true }));  // ← SETS UNSAVED FLAG
}
```

**Purpose:**
- Prevents closing the modal without saving
- Shows unsaved changes warning if user tries to close
- Maintains data integrity

---

### 4. Report Update Finalization (Clears isEditing: false)

**Backend** (`app/api/collection-report/[reportId]/route.ts` lines 92-101):

```typescript
// When user clicks "Update Report" and finalizes changes
const updatedReport = await CollectionReport.findOneAndUpdate(
  { _id: reportId },
  {
    ...body,
    isEditing: false,  // ← FLAG CLEARED HERE
    updatedAt: new Date(),
  },
  { new: true }
);
```

**When this triggers:**
- User clicks "Update Report" button in edit modal
- PATCH request sent to `/api/collection-report/[reportId]`
- Report is finalized with all financial data

**Purpose:**
- Marks the report as no longer being edited
- Prevents auto-reopening on next page load
- Indicates work is saved

---

## Complete Workflow

### Scenario: User Edits a Collection Report

```
1. User clicks "Edit" on a collection report
   → Edit modal opens

2. User modifies a machine's meters
   → Collection updated via PATCH /api/collections/[id]
   → Backend sets isEditing: true on the parent report

3. User refreshes the page
   → Collection reports page loads
   → Auto-open logic finds report with isEditing: true
   → Edit modal automatically reopens
   → Toast: "Resuming unfinished edit..."
   → hasUnsavedEdits flag is set

4. User tries to close modal
   → Validation checks hasUnsavedEdits flag
   → Warning dialog shown
   → User cannot close without saving or discarding

5. User clicks "Update Report"
   → Report updated via PATCH /api/collection-report/[reportId]
   → Backend sets isEditing: false
   → Modal closes successfully

6. User refreshes page again
   → No report with isEditing: true found
   → Edit modal does NOT auto-open
   → Normal page view
```

---

## Database Schema

**CollectionReport Model** (`app/api/lib/models/collectionReport.ts` line 32):

```typescript
{
  isEditing: { type: Boolean, default: false }
}
```

**Default value**: `false`  
**Set to true when**: Collection meters are modified  
**Set to false when**: Report is finalized with "Update Report"

---

## API Endpoints

### Set isEditing: true

**Endpoint**: `PATCH /api/collections/[id]`  
**Trigger**: When meters are updated  
**Code**: `app/api/collections/[id]/route.ts` lines 244-260, 516-548

### Query isEditing: true

**Endpoint**: `GET /api/collection-reports?isEditing=true`  
**Usage**: Auto-open logic on page load  
**Code**: `app/api/collection-reports/route.ts` lines 20-22

### Clear isEditing: false

**Endpoint**: `PATCH /api/collection-report/[reportId]`  
**Trigger**: When report is finalized  
**Code**: `app/api/collection-report/[reportId]/route.ts` line 97

---

## Verification Checklist

✅ **Backend sets isEditing: true** when collections are modified  
✅ **Backend queries isEditing: true** via API parameter  
✅ **Frontend auto-opens modal** when isEditing: true found  
✅ **Desktop modal sets hasUnsavedEdits** when isEditing: true  
✅ **Mobile modal sets hasUnsavedEdits** when isEditing: true (JUST FIXED)  
✅ **Backend clears isEditing: false** when report is finalized  
✅ **New validation prevents** updating/closing with unsaved machine data  

---

## Recent Fix (November 5, 2025)

### What Was Missing:

The mobile edit modal was checking for `reportData.isEditing` but **NOT setting the `hasUnsavedEdits` flag**.

**Before** (Line 1226-1230):
```typescript
if (reportData.isEditing) {
  console.warn(
    '⚠️ Report has isEditing: true - marking as having unsaved edits'
  );
  // ❌ No state update!
}
```

**After** (Line 1226-1231):
```typescript
if (reportData.isEditing) {
  console.warn(
    '⚠️ Report has isEditing: true - marking as having unsaved edits'
  );
  setModalState(prev => ({ ...prev, hasUnsavedEdits: true }));  // ✅ FIXED!
}
```

**Impact:**
- Mobile users can now be properly warned about unsaved edits
- Consistent behavior between desktop and mobile
- Prevents accidental data loss on mobile devices

---

## Summary

The `isEditing` flag system is **fully functional** and provides a complete workflow for:

1. ✅ Tracking when reports have unsaved changes
2. ✅ Auto-reopening edit modal after page refresh
3. ✅ Preventing data loss with warnings
4. ✅ Clearing the flag when reports are finalized

**The system works as designed!** The mobile modal just needed a small fix to set the `hasUnsavedEdits` flag, which has now been corrected.

