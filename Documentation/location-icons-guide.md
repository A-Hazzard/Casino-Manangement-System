# Location Icons Guide

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2026  
**Version:** 1.0.0

## Overview

Locations can display up to 5 different icons next to their name:
1. **SMIB Icon** (Blue Server icon) - Indicates the location has SMIB machines
2. **Local Server Icon** (Purple Home icon) - Indicates the location is a local server
3. **Membership Icon** (Green BadgeCheck icon) - Indicates membership is enabled
4. **Missing Coordinates Icon** (Red MapPinOff icon) - Indicates geographic coordinates are missing
5. **Unknown Type Icon** (Gray HelpCircle icon) - Indicates the location type is unknown (doesn't match any known type)

## How Icons Are Determined

### 1. SMIB Icon (Blue Server Icon)

**Display Condition:**
```typescript
Boolean(
  location.hasSmib || 
  !location.noSMIBLocation
)
```

**How It's Calculated:**
- `hasSmib` is calculated as: `sasMachines > 0` (where `sasMachines` = count of machines with `isSasMachine === true`)
- `noSMIBLocation` is calculated as: `sasMachines === 0`

**Database Fields:**
- `location.noSMIBLocation` (raw field in GamingLocations collection) - can be explicitly set
- `machine.isSasMachine` (in Machines collection) - determines if a machine is a SAS/SMIB machine

**Logic:**
- If a location has **any** machines with `isSasMachine === true`, then `hasSmib = true` and `noSMIBLocation = false` → **SMIB icon shows**
- If a location has **no** machines with `isSasMachine === true`, then `hasSmib = false` and `noSMIBLocation = true` → **SMIB icon hides**

**Example:**
```javascript
// Location with 3 machines, 2 are SAS machines
sasMachines = 2
hasSmib = true  // 2 > 0
noSMIBLocation = false  // 2 !== 0
// Result: ✅ SMIB icon shows

// Location with 5 machines, 0 are SAS machines
sasMachines = 0
hasSmib = false  // 0 > 0 is false
noSMIBLocation = true  // 0 === 0
// Result: ❌ SMIB icon hides
```

---

### 2. Local Server Icon (Purple Home Icon)

**Display Condition:**
```typescript
Boolean(location.isLocalServer)
```

**How It's Determined:**
- Directly from the `isLocalServer` field in the GamingLocations collection
- Defaults to `false` if not set

**Database Field:**
- `location.isLocalServer` (boolean in GamingLocations collection)

**Logic:**
- If `isLocalServer === true` → **Local Server icon shows**
- If `isLocalServer === false` or `undefined` → **Local Server icon hides**

**Example:**
```javascript
// Location document
{ _id: "...", name: "Location A", isLocalServer: true }
// Result: ✅ Local Server icon shows

{ _id: "...", name: "Location B", isLocalServer: false }
// Result: ❌ Local Server icon hides
```

---

### 3. Membership Icon (Green BadgeCheck Icon)

**Display Condition:**
```typescript
Boolean(
  location.membershipEnabled || 
  location.enableMembership
)
```

**How It's Determined:**
- Checks both `membershipEnabled` and `enableMembership` fields (for compatibility)
- Either field can be `true` to show the icon

**Database Fields:**
- `location.membershipEnabled` (boolean in GamingLocations collection)
- `location.enableMembership` (boolean in GamingLocations collection) - alternative field name

**Logic:**
- If `membershipEnabled === true` OR `enableMembership === true` → **Membership icon shows**
- If both are `false` or `undefined` → **Membership icon hides**

**Example:**
```javascript
// Location with membership enabled
{ _id: "...", name: "Location A", membershipEnabled: true }
// Result: ✅ Membership icon shows

// Location with membership enabled (alternative field)
{ _id: "...", name: "Location B", enableMembership: true }
// Result: ✅ Membership icon shows

// Location without membership
{ _id: "...", name: "Location C", membershipEnabled: false }
// Result: ❌ Membership icon hides
```

---

### 4. Missing Coordinates Icon (Red MapPinOff Icon)

**Display Condition:**
```typescript
hasMissingCoordinates(location)
```

**How It's Determined:**
The `hasMissingCoordinates()` function checks:
1. `geoCoords` doesn't exist OR is `null`
2. `geoCoords.latitude` is missing or `null`
3. Both `geoCoords.longitude` and `geoCoords.longtitude` (typo variant) are missing or `null`

**Database Field:**
- `location.geoCoords` (object in GamingLocations collection)
  - `geoCoords.latitude` (number)
  - `geoCoords.longitude` (number) OR `geoCoords.longtitude` (number - typo variant)

**Logic:**
- If coordinates are missing or invalid → **Missing Coordinates icon shows**
- If coordinates are present and valid → **Missing Coordinates icon hides**

**Example:**
```javascript
// Location without coordinates
{ _id: "...", name: "Location A", geoCoords: null }
// Result: ✅ Missing Coordinates icon shows

// Location with incomplete coordinates
{ _id: "...", name: "Location B", geoCoords: { latitude: 10.5 } }
// Result: ✅ Missing Coordinates icon shows (no longitude)

// Location with valid coordinates
{ _id: "...", name: "Location C", geoCoords: { latitude: 10.5, longitude: -61.3 } }
// Result: ❌ Missing Coordinates icon hides
```

---

## Why Some Locations Have No Icons

A location will have **no icons** if all of the following are true:

1. **No SMIB machines**: `sasMachines === 0` (so `hasSmib = false` and `noSMIBLocation = true`)
2. **Not a local server**: `isLocalServer === false` or `undefined`
3. **Membership not enabled**: `membershipEnabled === false` and `enableMembership === false` (or both `undefined`)
4. **Coordinates are present**: `geoCoords` exists with valid `latitude` and `longitude`/`longtitude`

**Example Location with No Icons:**
```javascript
{
  _id: "f76cb3a66b440cfcadb08c2a",
  name: "Regular Location",
  isLocalServer: false,
  membershipEnabled: false,
  enableMembership: false,
  geoCoords: {
    latitude: 10.5,
    longitude: -61.3
  },
  // Machines: 5 machines, all with isSasMachine = false
  // Result: sasMachines = 0, hasSmib = false, noSMIBLocation = true
}
```

**Result:** ❌ No icons displayed (this is expected behavior for a regular location)

---

## Investigation Script

Use the investigation script to check why a specific location doesn't have icons:

```bash
node test/investigate-location-icons.js <locationId>
```

**Example:**
```bash
node test/investigate-location-icons.js f76cb3a66b440cfcadb08c2a
```

The script will:
1. Fetch the raw location document from the database
2. Check all machines associated with the location
3. Calculate aggregated fields (hasSmib, noSMIBLocation, etc.)
4. Analyze icon display logic for each icon type
5. Provide a summary and recommendations

---

## Code References

### Frontend Icon Display Logic

**LocationCard.tsx** (lines 60-121):
```typescript
{/* SMIB Icon */}
{Boolean(
  location.hasSmib || !location.noSMIBLocation
) && <Server className="h-4 w-4 text-blue-600" />}

{/* Local Server Icon */}
{Boolean(location.isLocalServer) && <Home className="h-4 w-4 text-purple-600" />}

{/* Membership Icon */}
{Boolean(location.membershipEnabled) && <BadgeCheck className="h-4 w-4 text-green-600" />}

{/* Missing Coordinates Icon */}
{hasMissingCoordinates(location) && <MapPinOff className="h-4 w-4 text-red-600" />}
```

**LocationTable.tsx** (lines 128-187):
- Same logic as LocationCard.tsx

### Backend Field Calculation

**locationAggregation.ts** (lines 364-371):
```typescript
isLocalServer: location.isLocalServer || false,
noSMIBLocation: sasMachines === 0,
hasSmib: sasMachines > 0,
membershipEnabled: location.membershipEnabled || false,
```

---

## Summary Table

| Icon | Condition | Database Field(s) | Calculated Field |
|------|-----------|-------------------|------------------|
| **SMIB** | `hasSmib \|\| !noSMIBLocation` | `machine.isSasMachine` | `hasSmib = sasMachines > 0` |
| **Local Server** | `isLocalServer === true` | `location.isLocalServer` | Direct from DB |
| **Membership** | `membershipEnabled \|\| enableMembership` | `location.membershipEnabled`<br>`location.enableMembership` | Direct from DB |
| **Missing Coords** | `hasMissingCoordinates()` | `location.geoCoords` | Checked via function |
| **Unknown** | `!hasSmib && !isLocalServer && !hasMembership && !hasMissingCoords` | All of the above | Fallback when none match |

---

## Troubleshooting

### Location Should Have SMIB Icon But Doesn't

1. Check if machines have `isSasMachine === true`
2. Verify machines are associated with the location (`machine.gamingLocation === location._id`)
3. Check if `location.noSMIBLocation` is explicitly set to `true` (this overrides machine count)

### Location Should Have Local Server Icon But Doesn't

1. Check `location.isLocalServer` field in database
2. Ensure field is `true`, not `"true"` (string) or `1` (number)

### Location Should Have Membership Icon But Doesn't

1. Check both `location.membershipEnabled` and `location.enableMembership` fields
2. Ensure at least one is set to `true`

### Location Should Have Missing Coordinates Icon But Doesn't

1. Check `location.geoCoords` exists
2. Verify `geoCoords.latitude` is present and not null
3. Verify either `geoCoords.longitude` or `geoCoords.longtitude` is present and not null
