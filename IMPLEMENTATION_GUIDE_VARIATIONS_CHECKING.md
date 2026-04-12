# Collection Report Variations Checking - Implementation Guide

## Overview

This guide explains how to complete the variations checking feature for the remaining collection report modals (edit and mobile).

## Completed Components

✅ **Backend API**: `POST /api/collection-report/check-variations`
- Checks for variations in unsaved collection data
- Returns variation details for each machine

✅ **React Hooks**:
- `useCollectionReportVariationCheck` - Manages variation check state
- `useCollectionReportVariationCheckFlow` - Orchestrates the full flow (optional)

✅ **UI Components**:
- `VariationCheckPopover` - Shows loading/result states
- `VariationsListDisplay` - Table/card view of machines with variations
- `VariationsCollapsibleSection` - Collapsible section for desktop middle panel
- `MachineWithVariationBadge` - Badge to highlight machines with variations
- `VariationsConfirmationDialog` - Confirmation before submitting with variations

✅ **Desktop New Collection Modal**: Fully integrated example

## Implementation Pattern for Edit Modal

The edit modal has a similar 3-panel layout but the update button is in the `CollectionReportEditCollectedMachines` component (right panel).

### Changes Needed:

1. **Add Imports** (already done):
   - Variation components
   - Hooks
   - framer-motion

2. **Add Variation State** (already done):
   ```typescript
   const {
     isChecking, checkComplete, hasVariations, variationsData,
     error: variationError, isMinimized,
     checkVariations, toggleMinimize, reset: resetVariationCheck,
   } = useCollectionReportVariationCheck();

   const [showVariationCheckPopover, setShowVariationCheckPopover] = useState(false);
   const [variationsCollapsibleExpanded, setVariationsCollapsibleExpanded] = useState(true);
   const [showVariationsConfirmation, setShowVariationsConfirmation] = useState(false);
   ```

3. **Modify Middle Panel** (similar to new collection modal):
   Add before form fields:
   ```tsx
   {isMinimized && variationsData && checkComplete && (
     <VariationsCollapsibleSection
       machines={variationsData.machines}
       isExpanded={variationsCollapsibleExpanded}
       onExpandChange={setVariationsCollapsibleExpanded}
     />
   )}
   ```

4. **Pass Callback to EditCollectedMachines Component**:
   Add new prop to `CollectionReportEditCollectedMachines`:
   ```tsx
   onUpdateReport={handleUpdateReport}
   // Add this:
   onBeforeUpdate={() => {
     // Trigger variation check before update
     setShowVariationCheckPopover(true);
     // Call checkVariations with collected machines data
   }}
   ```

5. **Add Popover & Dialogs**: Same as new collection modal (copy the JSX section at the end)

## Mobile Implementation Pattern

Mobile modals have a navigation stack instead of 3-panel layout. Two approaches:

### Approach 1: Stack-Based (Recommended)

1. Add variation check state (same as desktop)
2. When user clicks "Submit Final Report":
   - Show variation check popover
   - Call `checkVariations` API
3. On completion:
   - **No variations**: Show green checkmark → "Submit" button → close popover and proceed
   - **Variations found**: Show error icon → "View Variations" button
4. When "View Variations" clicked:
   - Push new navigation screen showing variations list
   - Back button returns to collected list
5. From variations screen:
   - User can edit machines or click "Submit Anyway"
   - Before final submission, show confirmation dialog

### Approach 2: Modal-Based

Use a floating popover instead of navigation stack (simpler but less mobile-native):
- Popover stays open with minimize functionality
- Variations section appears in main content area
- Less navigation switching, more similar to desktop UX

## Code Templates

### Mobile New Collection Modal Template

```typescript
// In CollectionReportMobileNewCollectionModal.tsx

// Add to component:
const { isChecking, hasVariations, variationsData, checkComplete, isMinimized, checkVariations } =
  useCollectionReportVariationCheck();
const [showVariationCheckPopover, setShowVariationCheckPopover] = useState(false);
const [currentNavigationStack, setCurrentNavigationStack] = useState<'home' | 'variations'>('home');

// In submit handler:
onClick={async () => {
  if (!checkComplete) {
    setShowVariationCheckPopover(true);
    const machinesForCheck = collectedMachines.map(m => ({
      machineId: m.machineId,
      metersIn: m.metersIn,
      metersOut: m.metersOut,
      sasStartTime: m.sasStartTime,
      sasEndTime: m.sasEndTime,
      prevMetersIn: m.prevMetersIn,
      prevMetersOut: m.prevMetersOut,
    }));
    await checkVariations(locationId, machinesForCheck);
  } else if (hasVariations && !isMinimized) {
    // Show variations screen
    setCurrentNavigationStack('variations');
  } else if (hasVariations && isMinimized) {
    // Show confirmation dialog
    setShowVariationsConfirmation(true);
  } else {
    // No variations, proceed
    await createCollectionReport();
  }
}}

// Navigation stack:
{currentNavigationStack === 'home' && (
  <YourMobileCollectionContent />
)}
{currentNavigationStack === 'variations' && (
  <VariationsListDisplay machines={variationsData?.machines} isCompact={true} />
)}
```

## Integration Checklist

- [ ] Desktop New Collection Modal - Fully working
- [ ] Desktop Edit Collection Modal - Add variation check before update
- [ ] Mobile New Collection Modal - Add variation check in submission flow
- [ ] Mobile Edit Collection Modal - Add variation check in update flow
- [ ] Test desktop flows (no variations, with variations, minimize)
- [ ] Test mobile flows (no variations, with variations, navigate to variations screen)
- [ ] Test confirmation dialogs appear when submitting with variations
- [ ] Test error handling (network errors, API failures)
- [ ] Test SAS data unavailable scenarios

## Key Points

1. **Reuse the Hook**: The same `useCollectionReportVariationCheck` hook works for all modals
2. **Same Components**: All UI components work for both desktop and mobile (with `isCompact` prop for mobile)
3. **State Management**: Variation check state is independent of collection report creation
4. **Flow Control**: The key is determining when to show the popover vs confirmation dialog vs proceed directly
5. **Data Format**: Pass collected machines in the same format to `checkVariations()` for consistency

## Testing the Feature

1. Create a collection report with machines that have variations
2. Verify the popover shows "Checking for variations..."
3. Verify results show correctly (variations found or no variations)
4. Verify minimize functionality works (desktop only)
5. Verify confirmation dialog appears before final submission
6. Verify the report is created successfully even with variations

## Notes

- Variation calculation uses the same logic as the detail/reportId page
- Re-checking happens automatically when machines are edited (with debounce)
- Users can always skip the check or submit with variations
- Mobile layout can vary based on UX preferences - use either stack navigation or floating modal
