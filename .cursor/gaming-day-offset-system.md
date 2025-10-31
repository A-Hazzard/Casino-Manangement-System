# Gaming Day Offset System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 31, 2025  
**Version:** 2.0.0

---

## 🎯 Overview

The Gaming Day Offset system allows gaming locations to define their business day boundaries instead of using standard midnight-to-midnight calendar days. This ensures financial reporting aligns with actual business operations.

**Key Principle:**  
Instead of "12:00 AM to 11:59 PM", a gaming day runs from a configurable hour (e.g., 8 AM today to 8 AM tomorrow).

---

## ⏰ Core Concepts

### 1. Gaming Day Offset

**Definition**: The hour (0-23) when a new gaming day begins for a location  
**Default Value**: 8 (8 AM Trinidad time)  
**Storage**: `gamingLocations.gameDayOffset` field in MongoDB

### 2. Trinidad Time = UTC-4

**Critical Rule**: All dates are stored in UTC in the database, but users interact in Trinidad time (UTC-4).

**Conversion Formula**:

- Trinidad midnight (12:00 AM) = 4:00 AM UTC
- Trinidad 8 AM = 12:00 PM UTC
- Trinidad 11:59 PM = 3:59 AM UTC (next day)

---

## 📋 When Gaming Day Offset Applies

Gaming day offset is used for **ALL financial metrics** from meter data:

✅ **Dashboard totals** - System-wide financial summaries  
✅ **Location reports** - Aggregated location metrics  
✅ **Machine reports** - Individual machine financials  
✅ **Cabinet aggregation** - All machines list  
✅ **Bill validator data** - Gaming session tracking  
✅ **ALL time periods** - Today, Yesterday, 7d, 30d, **AND Custom**

---

## ❌ When Gaming Day Offset Does NOT Apply

Standard calendar time filtering (midnight-to-midnight) is used for:

❌ **Collection reports** - Filter by collection timestamp  
❌ **Activity logs** - Filter by action timestamp  
❌ **User sessions** - Filter by session timestamp

These use **event timestamps**, not gaming day boundaries.

---

## 🔧 How Time Periods Work

### Predefined Periods

| Period           | Example (8 AM offset)       |
| ---------------- | --------------------------- |
| **Today**        | Oct 31, 8 AM → Nov 1, 8 AM  |
| **Yesterday**    | Oct 30, 8 AM → Oct 31, 8 AM |
| **Last 7 Days**  | Oct 24, 8 AM → Nov 1, 8 AM  |
| **Last 30 Days** | Oct 1, 8 AM → Nov 1, 8 AM   |
| **All Time**     | No date filtering           |

### Custom Dates

**IMPORTANT**: Custom dates **DO** use gaming day offset!

**Examples:**

- **User selects**: Oct 31 to Oct 31 → **Queries**: Oct 31, 8 AM to Nov 1, 8 AM (1 full gaming day)
- **User selects**: Sep 1 to Sep 30 → **Queries**: Sep 1, 8 AM to Oct 1, 8 AM (30 full gaming days)
- **User selects**: Oct 30 to Oct 31 → **Queries**: Oct 30, 8 AM to Nov 1, 8 AM (2 full gaming days)

**Key Point**: Selecting the same date for start and end (Oct 31 to Oct 31) includes the **full gaming day**, not just a moment in time.

---

## 🔄 Implementation Pattern

### Backend API Pattern

```typescript
// 1. Get location's gaming day offset
const location = await GamingLocation.findById(locationId);
const gameDayOffset = location?.gameDayOffset ?? 8; // Default to 8 AM

// 2. Parse custom dates (if applicable)
const customStart = new Date('2025-10-31T00:00:00.000Z');
const customEnd = new Date('2025-10-31T00:00:00.000Z');

// 3. Calculate gaming day range
const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
  'Custom',
  gameDayOffset,
  customStart,
  customEnd
);

// Result: Oct 31, 8 AM Trinidad to Nov 1, 8 AM Trinidad (24 hours)
```

### Frontend Helper Pattern

```typescript
// Send only the date part (YYYY-MM-DD)
const fromDate = customDateRange.from.toISOString().split('T')[0]; // "2025-10-31"
const toDate = customDateRange.to.toISOString().split('T')[0]; // "2025-10-31"

params.startDate = fromDate;
params.endDate = toDate;
```

---

## 🚨 Critical Rules

### Rule 1: Always Provide Default Gaming Day Offset

```typescript
// ✅ CORRECT - Handles missing offset
const gameDayOffset = location?.gameDayOffset ?? 8;

// ❌ WRONG - Could be undefined
const gameDayOffset = location?.gameDayOffset;
```

### Rule 2: Gaming Day Offset = 0 is Valid

Zero means midnight start (same as calendar day).

```typescript
// ✅ CORRECT - Properly handles 0
const gameDayOffset = location?.gameDayOffset ?? 8;

// ❌ WRONG - Treats 0 as falsy, becomes 8
const gameDayOffset = location?.gameDayOffset || 8;
```

### Rule 3: Custom Dates Use Gaming Day Offset

Custom dates are NOT midnight-to-midnight. They use gaming day boundaries.

```typescript
// User selects: Oct 31 to Oct 31
// Backend queries: Oct 31, 8 AM to Nov 1, 8 AM ✅
```

### Rule 4: Send Only Date Part from Frontend

Frontend helpers must extract only `YYYY-MM-DD` format:

```typescript
// ✅ CORRECT
const date = customDateRange.from.toISOString().split('T')[0];

// ❌ WRONG - Sends full timestamp
const date = customDateRange.from.toISOString();
```

---

## 📁 Key Files

### Core Utility

- `lib/utils/gamingDayRange.ts` - Gaming day calculation logic

### Backend APIs

- `app/api/dashboard/totals/route.ts` - Dashboard totals
- `app/api/locationAggregation/route.ts` - Locations aggregation
- `app/api/locations/[locationId]/route.ts` - Location details
- `app/api/machines/aggregation/route.ts` - Machines aggregation
- `app/api/machines/[machineId]/route.ts` - Machine details

### Frontend Helpers

- `lib/helpers/dashboard.ts` - Dashboard data fetching
- `lib/helpers/locations.ts` - Locations data fetching
- `lib/helpers/cabinets.ts` - Cabinets data fetching

---

## 🧪 Testing

### Expected Behavior

**Given**: Location with `gameDayOffset = 8`  
**When**: User selects custom date "Oct 31 to Oct 31"  
**Then**: Backend queries Oct 31, 12:00 PM UTC to Nov 1, 12:00 PM UTC  
**Result**: Returns all meter data from Oct 31, 8 AM Trinidad to Nov 1, 8 AM Trinidad

### Verification

1. Select "Today" → Note the value (e.g., $20)
2. Select "Custom" → Set both dates to today (Oct 31 to Oct 31)
3. Custom should return **same value** as Today ($20) ✅

---

## 🎉 Summary

The gaming day offset system now works correctly:

✅ **All time periods** (Today, Yesterday, 7d, 30d, Custom) use gaming day offset  
✅ **Custom dates** properly span from gaming day start to gaming day start  
✅ **Frontend sends date-only** format (YYYY-MM-DD)  
✅ **Backend applies gaming day offset** consistently  
✅ **Documentation updated** to reflect correct behavior

**Last Updated:** October 31, 2025  
**Maintained By:** Evolution One CMS Development Team
