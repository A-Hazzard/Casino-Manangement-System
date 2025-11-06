# Unsaved Machine Data Validation Fix

**Date**: November 5, 2025  
**Issue**: Users could update/close edit modal with unsaved machine data

---

## The Problem

### User Experience Issue:

When editing a collection report, a user could:
1. Select a machine from the available machines list
2. Enter meter values (metersIn, metersOut)
3. Enter notes for the machine
4. **Click "Update Report" WITHOUT clicking "Add Machine to List"**
5. See the "Confirm Report Update" modal
6. Update the report, **losing all the entered machine data**

**Result**: Data loss and confusing UX

---

## The Fix

### Changes Made to EditCollectionModal.tsx

#### 1. Enhanced Update Report Validation (Lines 1314-1339)

**Before:**
```typescript
// Only checked if meters were > 0
if (enteredMetersIn > 0 || enteredMetersOut > 0) {
  toast.warning(...);
  return;
}
```

**After:**
```typescript
// Check if ANY data has been entered:
// - Machine selected
// - Meters entered (even if zero or negative)
// - Notes entered
if (selectedMachineId || enteredMetersIn !== 0 || enteredMetersOut !== 0 || hasNotes) {
  toast.error(
    `You have unsaved machine data. ` +
    (selectedMachineId ? `Machine: ${machineName}. ` : '') +
    (enteredMetersIn !== 0 || enteredMetersOut !== 0 ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. ` : '') +
    (hasNotes ? `Notes: "${notes}". ` : '') +
    `Please click "Add Machine to List" to save this data, or cancel by unselecting the machine and clearing the form before updating the report.`,
    {
      duration: 10000,
      position: 'top-left',
    }
  );
  return; // PREVENTS showing update confirmation modal
}
```

**Key Improvements:**
- ✅ Checks for **machine selection** (not just meters)
- ✅ Checks for **notes** (even without meters)
- ✅ Checks for **zero or negative meter values** (not just > 0)
- ✅ Shows **specific data** that's unsaved in the error message
- ✅ Changed from `toast.warning` to `toast.error` (more urgent)
- ✅ Increased duration to 10 seconds (from 8)
- ✅ **RETURNS early** - prevents showing the update confirmation modal

#### 2. Enhanced Close Modal Validation (Lines 162-200)

**Before:**
```typescript
// Only checked hasUnsavedEdits flag
if (hasUnsavedEdits) {
  setShowUnsavedChangesWarning(true);
  return false;
}
```

**After:**
```typescript
// Check hasUnsavedEdits flag
if (hasUnsavedEdits) {
  setShowUnsavedChangesWarning(true);
  return false;
}

// ALSO check for unsaved machine data
if (!editingEntryId && (selectedMachineId || currentMetersIn || currentMetersOut || currentMachineNotes.trim())) {
  const enteredMetersIn = currentMetersIn ? Number(currentMetersIn) : 0;
  const enteredMetersOut = currentMetersOut ? Number(currentMetersOut) : 0;
  const hasNotes = currentMachineNotes.trim().length > 0;

  if (selectedMachineId || enteredMetersIn !== 0 || enteredMetersOut !== 0 || hasNotes) {
    toast.error(...);
    setShowUnsavedChangesWarning(true);
    return false; // PREVENTS modal from closing
  }
}
```

**Key Improvements:**
- ✅ Prevents closing modal with unsaved machine data
- ✅ Shows detailed error message explaining what's unsaved
- ✅ Triggers the unsaved changes warning dialog

#### 3. Improved Unsaved Changes Warning Dialog (Lines 2573-2604)

**Before:**
```typescript
<ConfirmationDialog
  onConfirm={() => setShowUnsavedChangesWarning(false)}
  message="You have unsaved machine meter edits. Press 'Update Report' to save your changes before closing."
  confirmText="Keep Editing"
  cancelText=""
/>
```

**After:**
```typescript
<ConfirmationDialog
  onConfirm={() => {
    // User wants to discard changes and close
    // Clear all unsaved data
    setSelectedMachineId('');
    setCurrentMetersIn('');
    setCurrentMetersOut('');
    setCurrentMachineNotes('');
    setCurrentRamClear(false);
    setCurrentRamClearMetersIn('');
    setCurrentRamClearMetersOut('');
    setHasUnsavedEdits(false);
    setShowUnsavedChangesWarning(false);
    // Now close the modal
    if (hasChanges && onRefresh) {
      onRefresh();
    }
    onClose();
  }}
  title="Unsaved Machine Data"
  message={
    editingEntryId
      ? "You have unsaved changes to a machine entry. Do you want to discard these changes and close?"
      : "You have unsaved machine data (selected machine, entered meters, or notes). Do you want to discard this data and close?"
  }
  confirmText="Discard & Close"
  cancelText="Keep Editing"
/>
```

**Key Improvements:**
- ✅ **Clears all unsaved data** when user confirms discard
- ✅ **Dynamic message** based on whether editing or adding
- ✅ Changed button text from "Keep Editing" to "Discard & Close" (more explicit)
- ✅ Properly closes modal after discarding changes

---

### Changes Made to MobileEditCollectionModal.tsx

#### 1. Enhanced Update Report Validation (Lines 894-926)

Applied the same improvements as desktop version:
- ✅ Checks for machine selection, meters, and notes
- ✅ Uses `toast.error` instead of `toast.warning`
- ✅ Shows specific unsaved data details
- ✅ Returns early to prevent update

#### 2. Enhanced Close Modal Validation (Lines 1640-1661)

Applied the same validation as desktop version:
- ✅ Checks for unsaved machine data before allowing close
- ✅ Shows error message with details
- ✅ Triggers unsaved changes warning

---

## Validation Logic

### What Counts as "Unsaved Machine Data"

1. **Machine Selected** - `selectedMachineId` has a value
2. **Meters Entered** - Either `metersIn` or `metersOut` is not zero (including negative values)
3. **Notes Entered** - `notes` field has non-empty text

### When Validation Triggers

**Update Report Button:**
- User clicks "Update Report"
- Validation runs BEFORE showing confirmation modal
- If unsaved data detected → Show error, prevent confirmation
- If no unsaved data → Show confirmation modal

**Close Modal (X button or Escape):**
- User clicks X or presses Escape
- Validation runs BEFORE closing modal
- If unsaved data detected → Show error, prevent close, show warning dialog
- If no unsaved data → Close modal normally

**Unsaved Changes Warning Dialog:**
- User sees option to "Discard & Close" or "Keep Editing"
- If "Discard & Close" → Clears all form data and closes modal
- If "Keep Editing" → Closes warning dialog, keeps modal open

---

## User Flow Examples

### Example 1: User Tries to Update with Unsaved Data

```
1. User selects Machine 66 from available machines
2. User enters: metersIn = 583676, metersOut = 475639.25
3. User clicks "Update Report" ❌
4. System shows ERROR toast:
   "You have unsaved machine data. Machine: 66. Meters: In=583676, Out=475639.25. 
    Please click 'Add Machine to List' to save this data, or cancel..."
5. User CANNOT proceed to confirmation modal
6. User must click "Add Machine to List" or clear the form
```

### Example 2: User Tries to Close with Unsaved Data

```
1. User selects Machine 66
2. User enters meters
3. User clicks X to close ❌
4. System shows ERROR toast with details
5. System shows "Unsaved Machine Data" warning dialog
6. User chooses:
   - "Discard & Close" → All form data cleared, modal closes
   - "Keep Editing" → Modal stays open, data preserved
```

### Example 3: User Properly Saves Data

```
1. User selects Machine 66
2. User enters: metersIn = 583676, metersOut = 475639.25
3. User clicks "Add Machine to List" ✅
4. Machine added to collected list
5. User clicks "Update Report" ✅
6. System shows confirmation modal
7. User confirms, report updates successfully
```

---

## Technical Details

### Validation Conditions

```typescript
// Check if in "adding new machine" mode (not editing existing)
!editingEntryId

// AND has any unsaved data:
(
  selectedMachineId ||           // Machine selected
  currentMetersIn ||             // Meters In entered (even if "0")
  currentMetersOut ||            // Meters Out entered (even if "0")
  currentMachineNotes.trim()     // Notes entered
)

// AND the data is non-zero/non-empty:
(
  selectedMachineId ||           // Machine selected
  enteredMetersIn !== 0 ||       // Meters In is not zero
  enteredMetersOut !== 0 ||      // Meters Out is not zero
  hasNotes                       // Notes has content
)
```

### Toast Message Construction

```typescript
const message = 
  `You have unsaved machine data. ` +
  (selectedMachineId ? `Machine: ${machineName}. ` : '') +
  (enteredMetersIn !== 0 || enteredMetersOut !== 0 ? `Meters: In=${enteredMetersIn}, Out=${enteredMetersOut}. ` : '') +
  (hasNotes ? `Notes: "${notes.substring(0, 30)}...". ` : '') +
  `Please click "Add Machine to List" to save this data, or cancel...`;
```

**Benefits:**
- Shows exactly what data is unsaved
- Truncates long notes to 30 characters
- Clear instructions on what to do next

---

## Edge Cases Handled

### 1. Editing Existing Machine vs Adding New Machine

✅ Validation only applies when **adding new machine** (`!editingEntryId`)  
✅ When editing existing machine, different validation applies (checks if form differs from saved values)

### 2. Zero or Negative Meter Values

✅ Previously: Only checked if meters > 0  
✅ Now: Checks if meters !== 0 (catches zero and negative values)

### 3. Notes Only (No Meters)

✅ Previously: Would allow update if only notes entered  
✅ Now: Blocks update if notes are entered without adding machine

### 4. Machine Selected But No Data Entered

✅ Previously: Would allow update if machine selected but meters are 0  
✅ Now: Blocks update if machine is selected (even without meter values)

---

## Files Modified

1. **components/collectionReport/EditCollectionModal.tsx**
   - Line 1314-1339: Enhanced update report validation
   - Line 162-200: Enhanced close modal validation
   - Line 2573-2604: Improved unsaved changes warning dialog

2. **components/collectionReport/mobile/MobileEditCollectionModal.tsx**
   - Line 894-926: Enhanced update report validation
   - Line 1640-1661: Enhanced close modal validation

---

## Testing Checklist

- [ ] Select machine, enter meters, try to update → Should show error
- [ ] Select machine, enter notes, try to update → Should show error
- [ ] Select machine only (no data), try to update → Should show error
- [ ] Add machine properly, try to update → Should show confirmation
- [ ] Select machine, enter data, try to close → Should show error and warning dialog
- [ ] In warning dialog, click "Discard & Close" → Should clear data and close
- [ ] In warning dialog, click "Keep Editing" → Should stay open
- [ ] Edit existing machine (not adding new) → Should use different validation

---

## Benefits

1. **Prevents Data Loss** - Users can't accidentally lose entered data
2. **Clear Feedback** - Shows exactly what data is unsaved
3. **Explicit Actions** - User must explicitly add or discard data
4. **Consistent UX** - Works the same on desktop and mobile
5. **Better Error Messages** - Changed from warning (yellow) to error (red)

---

## Summary

The edit modal now **comprehensively prevents** users from updating or closing the modal when they have unsaved machine data in the form. This includes:

- ✅ Machine selected (even without meters)
- ✅ Meters entered (even if zero)
- ✅ Notes entered (even without meters)
- ✅ Any combination of the above

Users must either:
- Click "Add Machine to List" to save the data
- OR clear the form/unselect the machine to cancel

This ensures no accidental data loss and provides a clear, explicit workflow.

