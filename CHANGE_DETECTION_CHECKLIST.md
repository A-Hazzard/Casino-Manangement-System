# Change Detection Implementation Checklist

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 26th, 2025

## Overview
Implement proper change detection for all CRUD operations to only log actual changes instead of treating all form fields as "updated".

## Current Issues
- Activity logs show "18 changes" when only firstName was updated
- All form fields are being treated as "updated" regardless of actual changes
- Need to compare before/after values to detect real changes
- Need to show specific field changes instead of generic "X items"

## Implementation Tasks

### 1. User Updates
- [ ] **Fix UserModal change detection**
  - Compare `selectedUser` (before) with `updatedUser` (after)
  - Only log fields that actually changed
  - Show specific field names and values (e.g., "firstName: 'John' → 'Jane'")
  - File: `components/administration/UserModal.tsx`

- [ ] **Fix ProfileModal change detection**
  - Compare original user data with updated data
  - Only log actual changes
  - File: `components/layout/ProfileModal.tsx`

### 2. Licensee Updates
- [ ] **Fix AddLicenseeModal change detection**
  - Compare empty state with new licensee data
  - Only log fields that were actually filled
  - File: `components/administration/AddLicenseeModal.tsx`

- [ ] **Fix EditLicenseeModal change detection**
  - Compare original licensee with updated licensee
  - Only log fields that actually changed
  - File: `components/administration/EditLicenseeModal.tsx`

### 3. Machine/Cabinet Updates
- [ ] **Fix NewCabinetModal change detection**
  - Compare empty state with new cabinet data
  - Only log fields that were actually filled
  - File: `components/ui/cabinets/NewCabinetModal.tsx`

- [ ] **Fix EditCabinetModal change detection**
  - Compare original cabinet with updated cabinet
  - Only log fields that actually changed
  - File: `components/ui/cabinets/EditCabinetModal.tsx`

### 4. Location Updates
- [ ] **Fix NewLocationModal change detection**
  - Compare empty state with new location data
  - Only log fields that were actually filled
  - File: `components/ui/locations/NewLocationModal.tsx`

- [ ] **Fix EditLocationModal change detection**
  - Compare original location with updated location
  - Only log fields that actually changed
  - File: `components/ui/locations/EditLocationModal.tsx`

### 5. Collection Updates
- [ ] **Fix NewCollectionModal change detection**
  - Compare empty state with new collection data
  - Only log fields that were actually filled
  - File: `components/collectionReport/NewCollectionModal.tsx`

### 6. Collection Report Updates
- [ ] **Fix collection report change detection**
  - Compare original report with updated report
  - Only log fields that actually changed
  - File: `components/collectionReport/` (if exists)

### 7. Member Updates
- [ ] **Fix NewMemberModal change detection**
  - Compare empty state with new member data
  - Only log fields that were actually filled
  - File: `components/ui/members/NewMemberModal.tsx`

- [ ] **Fix EditMemberModal change detection**
  - Compare original member with updated member
  - Only log fields that actually changed
  - File: `components/ui/members/EditMemberModal.tsx`

### 8. Backend API Changes
- [ ] **Update activity-logs API route**
  - Improve change calculation logic
  - Better comparison of before/after values
  - File: `app/api/activity-logs/route.ts`

- [ ] **Update formatValue function**
  - Show specific field changes instead of generic descriptions
  - Better handling of nested objects
  - File: `lib/utils/dateFormatting.ts`

### 9. Testing & Validation
- [ ] **Test user updates**
  - Verify only changed fields are logged
  - Verify specific field names and values are shown

- [ ] **Test licensee updates**
  - Verify only changed fields are logged
  - Verify specific field names and values are shown

- [ ] **Test machine updates**
  - Verify only changed fields are logged
  - Verify specific field names and values are shown

- [ ] **Test location updates**
  - Verify only changed fields are logged
  - Verify specific field names and values are shown

- [ ] **Test collection updates**
  - Verify only changed fields are logged
  - Verify specific field names and values are shown

## Implementation Strategy

### Phase 1: Core Change Detection
1. Create utility function for deep object comparison
2. Update UserModal to use proper change detection
3. Update ProfileModal to use proper change detection
4. Test user update scenarios

### Phase 2: Licensee & Machine Updates
1. Update licensee modals with change detection
2. Update machine/cabinet modals with change detection
3. Test licensee and machine update scenarios

### Phase 3: Location & Collection Updates
1. Update location modals with change detection
2. Update collection modals with change detection
3. Test location and collection update scenarios

### Phase 4: Backend Improvements
1. Improve activity-logs API change calculation
2. Enhance formatValue function for better display
3. Test all scenarios end-to-end

## Success Criteria
- ✅ Only actual changes are logged in activity
- ✅ Specific field names and values are shown (e.g., "firstName: 'John' → 'Jane'")
- ✅ No more generic "X items" or "18 changes" for single field updates
- ✅ Proper before/after comparison for all CRUD operations
- ✅ Clean, readable activity logs showing exactly what changed

## Notes
- Focus on deep object comparison for nested structures
- Handle edge cases like null/undefined values
- Ensure performance with large objects
- Maintain backward compatibility with existing logs
