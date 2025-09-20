# Cursor Prompt: Re-implementing Edit Collections Functionality

## Overview
This prompt provides exact instructions for re-implementing the edit collections functionality that was previously removed from the collection report modals. The edit functionality allows users to modify existing collection entries in the collected machines list.

## Files to Modify
- `components/collectionReport/NewCollectionModal.tsx`
- `components/collectionReport/EditCollectionModalV2.tsx`

## 1. State Variables to Add

### In NewCollectionModal.tsx and EditCollectionModalV2.tsx
Add these state variables after the existing state declarations:

```typescript
// Edit functionality state
const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
```

## 2. Edit Icon in Collected Machines Card

### Location: NewCollectionModal.tsx (around line 2123)
In the collected machines list, add the edit button next to the delete button:

```typescript
// In the collectedMachineEntries.map() section, around line 2123
<div className="absolute top-2 right-2 flex gap-1">
  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6 p-0 hover:bg-gray-200"
    onClick={() => handleEditCollectedEntry(entry._id)}
    disabled={isProcessing}
  >
    <Edit3 className="h-3.5 w-3.5 text-blue-600" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6 p-0 hover:bg-gray-200"
    onClick={() => handleDeleteCollectedEntry(entry._id)}
    disabled={isProcessing}
  >
    <Trash2 className="h-3.5 w-3.5 text-red-600" />
  </Button>
</div>
```

### Location: EditCollectionModalV2.tsx (around line 1403)
Add the same edit button structure in the EditCollectionModalV2.tsx file.

## 3. Cancel and Update Buttons

### Location: NewCollectionModal.tsx (around line 1776)
Replace the single "Add Machine to List" button with conditional rendering:

```typescript
// Replace the existing button section around line 1776
<div className="flex gap-2 mt-3">
  {editingEntryId ? (
    <>
      <Button
        onClick={handleCancelEdit}
        variant="outline"
        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
        disabled={isProcessing}
      >
        Cancel
      </Button>
      <Button
        onClick={() => {
          if (machineForDataEntry) {
            handleAddOrUpdateEntry();
          } else {
            handleDisabledFieldClick();
          }
        }}
        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        disabled={!inputsEnabled || isProcessing}
      >
        {isProcessing
          ? "Processing..."
          : "Update Entry in List"}
      </Button>
    </>
  ) : (
    <Button
      onClick={() => {
        if (machineForDataEntry) {
          handleAddEntry();
        } else {
          handleDisabledFieldClick();
        }
      }}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      disabled={!inputsEnabled || isProcessing}
    >
      {isProcessing
        ? "Processing..."
        : "Add Machine to List"}
    </Button>
  )}
</div>
```

### Location: EditCollectionModalV2.tsx (around line 1070)
Apply the same conditional button logic in EditCollectionModalV2.tsx.

## 4. Required Functions to Implement

### handleEditCollectedEntry Function
Add this function to both modal files:

```typescript
const handleEditCollectedEntry = useCallback(
  async (entryId: string) => {
    if (isProcessing) return;

    const entryToEdit = collectedMachineEntries.find((e) => e._id === entryId);
    if (entryToEdit) {
      // Set editing state
      setEditingEntryId(entryId);
      
      // Set the selected machine ID
      setSelectedMachineId(entryToEdit.machineId);
      
      // Populate form fields with existing data
      setCurrentMetersIn(entryToEdit.metersIn.toString());
      setCurrentMetersOut(entryToEdit.metersOut.toString());
      setCurrentMachineNotes(entryToEdit.notes || "");
      setCurrentRamClear(entryToEdit.ramClear || false);
      setCurrentRamClearMetersIn(entryToEdit.ramClearMetersIn?.toString() || "");
      setCurrentRamClearMetersOut(entryToEdit.ramClearMetersOut?.toString() || "");
      
      // Set the collection time
      if (entryToEdit.timestamp) {
        setCurrentCollectionTime(new Date(entryToEdit.timestamp));
      }
      
      // Set previous values for display
      setPrevIn(entryToEdit.prevIn || 0);
      setPrevOut(entryToEdit.prevOut || 0);
      
      toast.info("Edit mode activated. Make your changes and click 'Update Entry in List'.");
    }
  },
  [isProcessing, collectedMachineEntries]
);
```

### handleCancelEdit Function
Add this function to both modal files:

```typescript
const handleCancelEdit = useCallback(() => {
  // Reset editing state
  setEditingEntryId(null);

  // Clear all input fields
  setCurrentMetersIn("");
  setCurrentMetersOut("");
  setCurrentMachineNotes("");
  setCurrentRamClear(false);
  setCurrentRamClearMetersIn("");
  setCurrentRamClearMetersOut("");
  setCurrentCollectionTime(new Date());

  // Reset prev values
  setPrevIn(null);
  setPrevOut(null);

  toast.info("Edit cancelled");
}, []);
```

### handleAddOrUpdateEntry Function
Add this function to both modal files:

```typescript
const handleAddOrUpdateEntry = useCallback(async () => {
  if (isProcessing) return;

  // If updating an existing entry, show confirmation dialog
  if (editingEntryId) {
    setShowUpdateConfirmation(true);
    return;
  }

  // If adding a new entry, proceed directly
  if (machineForDataEntry) {
    handleAddEntry();
  }
}, [
  isProcessing,
  editingEntryId,
  machineForDataEntry,
  handleAddEntry
]);
```

### confirmAddOrUpdateEntry Function
Add this function to both modal files:

```typescript
const confirmAddOrUpdateEntry = useCallback(async () => {
  if (isProcessing) return;

  // Validation logic here (same as existing validation)
  const validation = validateMachineEntry(
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    userId,
    currentRamClear,
    machineForDataEntry?.collectionMeters?.metersIn,
    machineForDataEntry?.collectionMeters?.metersOut,
    currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
    currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
    !!editingEntryId
  );

  if (!validation.isValid) {
    toast.error(validation.error || "Validation failed");
    return;
  }

  setIsProcessing(true);

  try {
    if (editingEntryId) {
      // Update existing collection
      const result = await updateCollection(editingEntryId, {
        metersIn: Number(currentMetersIn),
        metersOut: Number(currentMetersOut),
        notes: currentMachineNotes,
        ramClear: currentRamClear,
        ramClearMetersIn: currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
        ramClearMetersOut: currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
        timestamp: currentCollectionTime,
        prevIn: prevIn || 0,
        prevOut: prevOut || 0,
      });

      // Update local state
      setCollectedMachineEntries((prev) =>
        prev.map((entry) =>
          entry._id === editingEntryId
            ? { ...entry, ...result }
            : entry
        )
      );

      toast.success("Machine updated!");
      setEditingEntryId(null);
    } else {
      // Add new collection (existing logic)
      await handleAddEntry();
    }
  } catch (error) {
    toast.error("Failed to update machine. Please try again.");
  } finally {
    setIsProcessing(false);
  }
}, [
  isProcessing,
  selectedMachineId,
  machineForDataEntry,
  currentMetersIn,
  currentMetersOut,
  currentMachineNotes,
  currentRamClear,
  currentRamClearMetersIn,
  currentRamClearMetersOut,
  currentCollectionTime,
  editingEntryId,
  prevIn,
  prevOut,
  handleAddEntry
]);
```

### confirmUpdateEntry Function
Add this function to both modal files:

```typescript
const confirmUpdateEntry = useCallback(() => {
  setShowUpdateConfirmation(false);
  confirmAddOrUpdateEntry();
}, [confirmAddOrUpdateEntry]);
```

## 5. Update Confirmation Dialog

### Location: After the Delete Confirmation Dialog
Add this dialog after the existing confirmation dialogs:

```typescript
{/* Update Confirmation Dialog */}
<ConfirmationDialog
  isOpen={showUpdateConfirmation}
  onClose={() => setShowUpdateConfirmation(false)}
  onConfirm={confirmUpdateEntry}
  title="Confirm Update"
  message="Are you sure you want to update this collection entry?"
  confirmText="Yes, Update"
  cancelText="Cancel"
  isLoading={isProcessing}
/>
```

## 6. Required Imports

### Add these imports to both modal files:
```typescript
import { Edit3 } from "lucide-react";
import { updateCollection } from "@/lib/helpers/collections";
```

## 7. Machine Selection Logic Updates

### Update the machine selection disabled logic
In the machine selection buttons, update the disabled condition:

```typescript
disabled={
  isProcessing ||
  (editingEntryId !== null &&
    collectedMachineEntries.find(
      (e) => e._id === editingEntryId
    )?.machineId !== machine._id) ||
  (collectedMachineEntries.find(
    (e) => e.machineId === machine._id
  ) &&
    !editingEntryId)
}
```

### Update the "Added" indicator logic
```typescript
{collectedMachineEntries.find(
  (e) => e.machineId === machine._id
) &&
  !editingEntryId && (
    <span className="ml-auto text-xs text-green-500">
      (Added)
    </span>
  )}
```

## 8. Reset Logic Updates

### Update the reset logic to clear editing state
In the reset functions, add:
```typescript
setEditingEntryId(null);
```

## 9. Validation Updates

### Update validation calls to include edit mode flag
```typescript
const validation = validateMachineEntry(
  selectedMachineId,
  machineForDataEntry,
  currentMetersIn,
  currentMetersOut,
  userId,
  currentRamClear,
  machineForDataEntry?.collectionMeters?.metersIn,
  machineForDataEntry?.collectionMeters?.metersOut,
  currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
  currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
  !!editingEntryId // Pass edit mode flag
);
```

## 10. Testing Checklist

After implementing the changes:

1. ✅ Edit icon appears in collected machines cards
2. ✅ Clicking edit icon populates form with existing data
3. ✅ Cancel button appears and works correctly
4. ✅ Update button appears and works correctly
5. ✅ Update confirmation dialog appears
6. ✅ Form validation works in edit mode
7. ✅ Machine selection is properly disabled during edit
8. ✅ Edit state is properly cleared on cancel/complete
9. ✅ Local state updates correctly after edit
10. ✅ No linting errors

## Notes

- The edit functionality should work identically in both NewCollectionModal and EditCollectionModalV2
- All existing functionality (add, delete, create reports) should remain unchanged
- The edit mode should be visually distinct (different button text, cancel option)
- Form fields should be pre-populated with existing entry data when editing
- The edit state should be properly managed and cleared when appropriate
