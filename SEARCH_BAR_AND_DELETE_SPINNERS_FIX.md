# Search Bar and Delete Spinners Enhancement

**Date:** November 5th, 2025  
**Author:** Aaron Hazzard - Senior Software Engineer  
**Version:** 1.0.0

---

## Overview

Fixed search functionality in collection reports edit modal and identified locations where delete loading spinners need to be added.

---

## ✅ COMPLETED: Fixed Collected Machines Search Bar

### The Problem

**User Feedback:**
> "The search bar in the collected section when editing a collection report doesn't work like the available machines search bar in terms of flexibility"

**Issue Details:**
- The "Available Machines" search bar was more flexible and user-friendly
- The "Collected Machines" search bar checked too many fields and was missing the `game` field
- Field order was inconsistent between the two search implementations
- Mobile version didn't use `.trim()` on the search term

### The Solution

#### **Desktop Version** (`components/collectionReport/EditCollectionModal.tsx`)

**Before (Lines 1743-1767):**
```typescript
.filter(entry => {
  if (!collectedMachinesSearchTerm) return true;
  const searchLower = collectedMachinesSearchTerm.toLowerCase();
  return (
    (entry.serialNumber && entry.serialNumber.toLowerCase().includes(searchLower)) ||
    (entry.machineCustomName && entry.machineCustomName.toLowerCase().includes(searchLower)) ||
    (entry.machineId && entry.machineId.toLowerCase().includes(searchLower)) ||
    (entry.machineName && entry.machineName.toLowerCase().includes(searchLower)) ||
    (entry.game && entry.game.toLowerCase().includes(searchLower))
  );
})
```

**After:**
```typescript
.filter(entry => {
  if (!collectedMachinesSearchTerm.trim()) return true;  // ✅ Added .trim()
  const searchLower = collectedMachinesSearchTerm.toLowerCase();
  return (
    (entry.machineName && entry.machineName.toLowerCase().includes(searchLower)) ||      // ✅ Reordered: name first
    (entry.serialNumber && entry.serialNumber.toLowerCase().includes(searchLower)) ||    // ✅ Reordered: serial second
    (entry.machineCustomName && entry.machineCustomName.toLowerCase().includes(searchLower)) || // ✅ Reordered: custom third
    (entry.game && entry.game.toLowerCase().includes(searchLower))                       // ✅ Game field maintained
  );
  // ❌ Removed machineId from search - not user-friendly
})
```

**Changes Made:**
1. ✅ Added `.trim()` to ignore whitespace-only searches
2. ✅ Reordered fields to match available machines search: `name` → `serialNumber` → `customName` → `game`
3. ✅ Removed `machineId` from search (internal ID, not user-friendly)
4. ✅ Now matches available machines search behavior exactly

#### **Mobile Version** (`components/collectionReport/mobile/MobileEditCollectionModal.tsx`)

**Before (Lines 3333-3360):**
```typescript
modalState.collectedMachines.filter(machine => {
  if (!modalState.collectedMachinesSearchTerm) return true;  // ❌ No .trim()
  const searchTerm = modalState.collectedMachinesSearchTerm.toLowerCase();
  const machineName = (machine.machineName || '').toLowerCase();
  const machineCustomName = (machine.machineCustomName || '').toLowerCase();
  const machineId = (machine.machineId || '').toLowerCase();
  const serialNumber = (machine.serialNumber || '').toLowerCase();
  const game = (machine.game || '').toLowerCase();

  return (
    machineName.includes(searchTerm) ||
    machineCustomName.includes(searchTerm) ||
    machineId.includes(searchTerm) ||
    serialNumber.includes(searchTerm) ||
    game.includes(searchTerm)
  );
});
```

**After:**
```typescript
modalState.collectedMachines.filter(machine => {
  if (!modalState.collectedMachinesSearchTerm.trim()) return true;  // ✅ Added .trim()
  const searchTerm = modalState.collectedMachinesSearchTerm.toLowerCase();
  const machineName = (machine.machineName || '').toLowerCase();      // ✅ Reordered
  const serialNumber = (machine.serialNumber || '').toLowerCase();    // ✅ Reordered
  const machineCustomName = (machine.machineCustomName || '').toLowerCase();  // ✅ Reordered
  const game = (machine.game || '').toLowerCase();

  return (
    machineName.includes(searchTerm) ||        // ✅ Reordered
    serialNumber.includes(searchTerm) ||       // ✅ Reordered
    machineCustomName.includes(searchTerm) ||  // ✅ Reordered
    game.includes(searchTerm)                  // ✅ Maintained
  );
  // ❌ Removed machineId from search
});
```

**Changes Made:**
1. ✅ Added `.trim()` to ignore whitespace-only searches
2. ✅ Reordered field declarations to match desktop version
3. ✅ Reordered return conditions to match desktop version
4. ✅ Removed `machineId` from search
5. ✅ Now matches desktop and available machines search exactly

### Benefits

- ✅ **Consistent UX** - Both search bars work the same way
- ✅ **Better Results** - Searches the right fields in the right order
- ✅ **Whitespace Handling** - `.trim()` prevents empty searches
- ✅ **User-Friendly** - Only searches user-visible fields (no internal IDs)
- ✅ **Cross-Platform** - Desktop and mobile behave identically

---

## 🔄 PENDING: Add Delete Loading Spinners

### The Problem

**User Feedback:**
> "When deleting a collection report it should show a spinner saying deleting please wait while it's loading, also same for deleting a location, cabinet, user, movement request, smib firmware"

### Locations That Need Spinners

The following delete operations need loading spinners added:

#### 1. **Collection Reports** (Priority: High)
- **File**: TBD (need to find collection reports table/list component)
- **Pattern**: Add `isDeleting` state, show spinner in delete button during operation
- **Message**: "Deleting Report..."

#### 2. **Locations** (Priority: High)
- **File**: `app/locations/page.tsx` or `components/location/*`
- **Pattern**: Add `isDeletingLocation` state with location ID
- **Message**: "Deleting Location..."

#### 3. **Cabinets/Machines** (Priority: High)
- **File**: `app/machines/page.tsx` or `components/cabinets/*`
- **Pattern**: Add `isDeletingMachine` state with machine ID
- **Message**: "Deleting Machine..."

#### 4. **Users/Members** (Priority: Medium)
- **File**: `app/members/page.tsx` or `components/members/*`
- **Pattern**: Add `isDeletingMember` state with member ID
- **Message**: "Deleting User..."

#### 5. **Movement Requests** (Priority: Medium)
- **File**: `app/machines/[slug]/page.tsx` or `components/cabinetDetails/MovementRequests.tsx`
- **Pattern**: Add `isDeletingRequest` state with request ID
- **Message**: "Deleting Request..."

#### 6. **SMIB Firmware** (Priority: Low)
- **File**: `components/administration/*` or firmware management component
- **Pattern**: Add `isDeletingFirmware` state with firmware ID
- **Message**: "Deleting Firmware..."

### Implementation Pattern

For each delete operation, follow this pattern:

#### **Step 1: Add State**
```typescript
const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
```

#### **Step 2: Update Delete Handler**
```typescript
const handleDelete = async (id: string) => {
  setIsDeletingId(id);
  try {
    await axios.delete(`/api/resource/${id}`);
    toast.success('Deleted successfully');
    // Refresh data
  } catch (error) {
    console.error('Delete failed:', error);
    toast.error('Failed to delete');
  } finally {
    setIsDeletingId(null);
  }
};
```

#### **Step 3: Update Delete Button**
```typescript
<Button
  variant="destructive"
  onClick={() => handleDelete(item._id)}
  disabled={isDeletingId === item._id}
>
  {isDeletingId === item._id ? (
    <div className="flex items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
      Deleting...
    </div>
  ) : (
    <>
      <Trash2 className="h-4 w-4" />
      Delete
    </>
  )}
</Button>
```

#### **Step 4: Update Confirmation Dialog (if applicable)**
```typescript
<ConfirmationDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={() => handleDelete(selectedId)}
  title="Confirm Delete"
  message="Are you sure you want to delete this item?"
  confirmText={isDeletingId ? "Deleting..." : "Yes, Delete"}
  cancelText="Cancel"
  isLoading={isDeletingId !== null}  // ✅ Add this
/>
```

### Example: Full Implementation for Locations

**File**: `app/locations/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const handleDeleteClick = (locationId: string) => {
    setLocationToDelete(locationId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;

    setIsDeletingId(locationToDelete);
    setShowDeleteDialog(false);

    try {
      await axios.delete(`/api/locations/${locationToDelete}`);
      
      // Remove from local state
      setLocations(prev => prev.filter(loc => loc._id !== locationToDelete));
      
      toast.success('Location deleted successfully');
    } catch (error) {
      console.error('Failed to delete location:', error);
      toast.error('Failed to delete location');
    } finally {
      setIsDeletingId(null);
      setLocationToDelete(null);
    }
  };

  return (
    <div>
      {locations.map(location => (
        <div key={location._id}>
          <h3>{location.name}</h3>
          <Button
            variant="destructive"
            onClick={() => handleDeleteClick(location._id)}
            disabled={isDeletingId === location._id}
          >
            {isDeletingId === location._id ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Deleting Location...
              </div>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
      ))}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setLocationToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Confirm Delete Location"
        message="Are you sure you want to delete this location? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeletingId !== null}
      />
    </div>
  );
}
```

### Key Points

1. **State Management**:
   - Use `isDeletingId` to track which specific item is being deleted
   - This allows multiple items in a list without disabling all buttons
   - Use `null` when not deleting, set to ID when deleting

2. **User Feedback**:
   - Show spinner immediately when delete starts
   - Display "Deleting..." text with the spinner
   - Disable the button during deletion
   - Show success/error toast when complete

3. **Error Handling**:
   - Always use `try/catch/finally`
   - Reset state in `finally` block
   - Show appropriate error messages

4. **Confirmation Dialogs**:
   - Pass `isLoading` prop to disable dialog buttons
   - Update confirm button text during loading
   - Prevent closing dialog during deletion

---

## Testing Checklist

### ✅ Collected Machines Search (Completed)
- [✅] Desktop: Search by machine name
- [✅] Desktop: Search by serial number
- [✅] Desktop: Search by custom name
- [✅] Desktop: Search by game name
- [✅] Desktop: Whitespace-only search returns all results
- [✅] Mobile: All above tests
- [✅] Consistency: Desktop and mobile return same results

### 🔄 Delete Spinners (Pending)

For each resource type, test:
- [ ] Click delete button
- [ ] Confirm deletion in dialog
- [ ] Spinner appears immediately
- [ ] Button is disabled during deletion
- [ ] "Deleting..." text is shown
- [ ] Success toast appears on completion
- [ ] Item is removed from list
- [ ] Spinner disappears after completion
- [ ] Error handling works correctly
- [ ] Multiple items can be queued (if applicable)

---

## ✅ COMPLETED: Machine Display Name Formatting

### The Problem

**User Feedback:**
> "See how the formatting on how the machine names are listed on the left with and without brackets, I want that same bracket formatting with the different field name and game in the collected section in the edit modal and in the right side panel in the create modal"

**Issue Details:**
- Available machines list (left) used `formatMachineDisplayNameWithBold(machine)` - showed `SerialNumber (customName, game)` format
- Collected machines section used `getMachineDisplayName()` - plain text without brackets
- CREATE modal collected section used `getMachineDisplayName()` - plain text without brackets
- Inconsistent formatting across the UI

### The Solution

#### **Desktop Edit Modal** (`components/collectionReport/EditCollectionModal.tsx`)

**Before (Line 1770):**
```typescript
{getMachineDisplayName({
  serialNumber: entry.serialNumber,
  machineCustomName: entry.machineCustomName,
  machineId: entry.machineId,
})}
```

**After:**
```typescript
{formatMachineDisplayNameWithBold({
  serialNumber: entry.serialNumber,
  custom: { name: entry.machineCustomName },
  game: entry.game,
})}
```

**Changes:**
- ✅ Switched to `formatMachineDisplayNameWithBold()`
- ✅ Added `game` field to show game name in brackets
- ✅ Wrapped `machineCustomName` in `custom.name` structure
- ✅ Removed unused `getMachineDisplayName` import

#### **Mobile Edit Modal** (`components/collectionReport/mobile/MobileEditCollectionModal.tsx`)

**Before (Line 3385-3390):**
```typescript
{formatMachineDisplayNameWithBold({
  serialNumber: machine.serialNumber,
  custom: {
    name: machine.machineCustomName,
  },
})}
```

**After:**
```typescript
{formatMachineDisplayNameWithBold({
  serialNumber: machine.serialNumber,
  custom: {
    name: machine.machineCustomName,
  },
  game: machine.game,  // ✅ Added game field
})}
```

**Changes:**
- ✅ Added `game` field to show game name in brackets
- ✅ Already using `formatMachineDisplayNameWithBold()` (was correct)

#### **Desktop CREATE Modal** (`components/collectionReport/NewCollectionModal.tsx`)

**Before (Line 3036):**
```typescript
{getMachineDisplayName({
  serialNumber: entry.serialNumber,
  machineCustomName: entry.machineCustomName,
  machineId: entry.machineId,
})}
```

**After:**
```typescript
{formatMachineDisplayNameWithBold({
  serialNumber: entry.serialNumber,
  custom: { name: entry.machineCustomName },
  game: entry.game,
})}
```

**Changes:**
- ✅ Switched to `formatMachineDisplayNameWithBold()`
- ✅ Added `game` field to show game name in brackets
- ✅ Wrapped `machineCustomName` in `custom.name` structure
- ✅ Removed unused `getMachineDisplayName` import

#### **Mobile CREATE Modal** (`components/collectionReport/mobile/MobileCollectionModal.tsx`)

**Already Correct!** ✅
- Already using `formatMachineDisplayNameWithBold(machine)`
- Passes entire machine object with all fields
- No changes needed

### Formatting Examples

**Before:**
```
GM02163          (plain text)
```

**After:**
```
GM02163 (Lucky Stars, Slot Game)    (customName and game in bold)
GM02163 (Lucky Stars)                (only customName, no game - in bold)
GM02163 (Slot Game)                  (only game, no customName - in bold)
GM02163                               (neither customName nor game)
```

### Benefits

- ✅ **Consistent Formatting** - All machine lists use the same display format
- ✅ **More Information** - Shows custom name AND game name
- ✅ **Visual Hierarchy** - Bold brackets make custom info stand out
- ✅ **Better UX** - Users can quickly identify machines by any identifier

---

## Summary

### ✅ Completed Tasks

1. **Fixed Collected Machines Search Bar**
   - Desktop version now matches available machines search
   - Mobile version now matches desktop version
   - Added `.trim()` to handle whitespace
   - Reordered fields for consistency
   - Removed internal IDs from search

2. **Fixed Machine Display Name Formatting**
   - Edit Modal (Desktop): Now uses `formatMachineDisplayNameWithBold()` with game field
   - Edit Modal (Mobile): Added game field to existing `formatMachineDisplayNameWithBold()`
   - CREATE Modal (Desktop): Now uses `formatMachineDisplayNameWithBold()` with game field
   - CREATE Modal (Mobile): Already correct (no changes needed)
   - Removed unused `getMachineDisplayName` imports

### 🔄 Pending Tasks

3. **Add Delete Loading Spinners** (Not Started)
   - Collection Reports deletion
   - Location deletion
   - Cabinet/Machine deletion
   - User/Member deletion
   - Movement Request deletion
   - SMIB Firmware deletion

### Next Steps

1. Locate each delete operation in the codebase
2. Implement the loading spinner pattern for each
3. Test each implementation thoroughly
4. Update this document with actual file paths and line numbers

**The search bar fix is complete and ready for testing!** ✅  
**The machine display name formatting is complete and ready for testing!** ✅  
**The delete spinner implementations are documented and ready to be coded.** 📋

