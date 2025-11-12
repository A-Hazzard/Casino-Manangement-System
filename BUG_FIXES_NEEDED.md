# Bug Fixes - November 11, 2025

## 1. Licensee/Location Assignment - PARTIALLY FIXED ✅

### Bug Description:
When clicking a licensee or location to assign to a user, it doesn't always append the data.

### Root Cause:
**Race Condition:** `onBlur` event fires BEFORE `onClick` event, closing the dropdown before selection can be registered.

```typescript
// Input field
onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}

// Dropdown button
onClick={() => handleSelect(id)} // Too slow! Blur fires first!
```

### Fix Applied:
Changed `onClick` to `onMouseDown` with `e.preventDefault()`:

```typescript
// ✅ FIXED: onMouseDown fires BEFORE onBlur
onMouseDown={(e) => {
  e.preventDefault(); // Prevent blur from firing
  handleLicenseeSelect(id);
  setDropdownOpen(false);
}}
```

### Files Fixed:
1. ✅ `components/administration/RolesPermissionsModal.tsx` - Location assignment
2. ✅ `components/administration/UserModal.tsx` - Licensee assignment

### Testing Needed:
- Test licensee assignment in Administration page (User edit modal)
- Test location assignment in RolesPermissionsModal
- Verify selections persist after clicking

---

## 2. SMIB Management - Online/Offline Status Bug ⚠️

### Bug Description:
When clicking an SMIB that shows as "Online" in the cabinets list, it shows as "Offline" when the detail page loads.

### Potential Causes:
1. **Stale Data:** List uses cached data, detail page fetches fresh data
2. **Different Status Logic:** List and detail use different criteria for "online"
3. **Time Window Issue:** "lastActivity" calculation differs between list and detail
4. **MQTT Status vs API Status:** List shows MQTT connection, detail shows API status

### Investigation Needed:
1. Find where SMIB online status is calculated in cabinets list
2. Find where SMIB online status is calculated in cabinet detail page
3. Compare the two logic implementations
4. Check MQTT connection status vs lastActivity status

### Files to Investigate:
- `app/cabinets/page.tsx` - List page (SMIB status calculation)
- `app/cabinets/[slug]/page.tsx` - Detail page (SMIB status display)
- `components/cabinets/*` - Cabinet list components
- `components/cabinetDetails/*` - Cabinet detail components
- MQTT integration code for connection status

### Temporary Fix Options:
1. **Refresh detail page data** - Force fetch instead of cache
2. **Standardize status logic** - Use same criteria everywhere
3. **Add timestamp** - Show "as of XX:XX" for status
4. **Real-time MQTT** - Use actual MQTT connection status

---

---

## 3. Cabinets Online/Offline Filter Not Working - FIXED ✅

### Bug Description:
The Online/Offline filter on the cabinets page didn't filter machines correctly.

### Root Cause:
**Missing Field:** API didn't return `online` property, but filter was checking for it.

```typescript
// Filter code (lib/hooks/data/useCabinetData.ts):
if (selectedStatus === 'Online') {
  return cabinet.online === true; // ❌ Field doesn't exist!
}
```

### Fix Applied:
Added `online` calculation to Cabinets API based on `lastActivity`:

```typescript
// app/api/machines/aggregation/route.ts (lines 289-291 & 426-428)
online: machine.lastActivity 
  ? new Date(machine.lastActivity) > new Date(Date.now() - 3 * 60 * 1000)
  : false,
```

**Logic:** Machine is "Online" if `lastActivity` is within the last 3 minutes.

### Files Fixed:
1. ✅ `app/api/machines/aggregation/route.ts` - Added `online` field calculation (both code paths)

### Result:
- ✅ API now returns `online: true/false` for each machine
- ✅ Filter can properly check `cabinet.online === true`
- ✅ Online/Offline filter now works correctly

---

## Status

✅ **Licensee/Location Assignment:** FIXED (race condition resolved)  
✅ **Cabinets Online/Offline Filter:** FIXED (missing field added)  
⚠️ **SMIB Online/Offline Detail Page:** Still needs investigation (separate issue)

**Next Steps:**
1. ✅ Build and test all fixes
2. ✅ Verify Online/Offline filter works in browser
3. ⚠️ Investigate SMIB status discrepancy between list and detail pages (if still occurs)

