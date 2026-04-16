# Timezone Logic for Cabinet Details Queries

This document explains the timezone handling in the cabinet details page and why queries from different timezone regions may return different or unexpected results.

---

## 1. The Core Problem: Trinidad Timezone is Hardcoded

**The system is designed to work in Trinidad time (UTC-4).** All gaming day calculations, meter readings, and business logic assume the user is in Trinidad time.

**The issue:** When a user from a different timezone (e.g., Japan UTC+9) queries 8 AM, they get different results than a Trinidad user querying 8 AM.

---

## 2. How `formatLocalDateTimeString` Works

**File**: `shared/utils/dateFormat.ts`

```typescript
export function formatLocalDateTimeString(
  date: DateInput,
  timezoneOffset: number = -new Date().getTimezoneOffset() / 60
): string {
  // Extract LOCAL time components (browser's local time)
  const year = dateObj.getFullYear(); // e.g., 2026
  const month = dateObj.getMonth() + 1; // e.g., 3 (March)
  const day = dateObj.getDate(); // e.g., 23
  const hours = dateObj.getHours(); // e.g., 8 (8 AM)
  const minutes = dateObj.getMinutes(); // e.g., 0

  // Append the timezone offset
  const offsetSign = timezoneOffset >= 0 ? '+' : '-';
  const offsetHours = Math.abs(timezoneOffset);

  return `${year}-${month}-${day}T${hours}:${minutes}:00${offsetSign}${offsetHours}:00`;
}
```

---

## 3. Why Different Timezones Return Different Data

### Scenario: User in Trinidad (UTC-4) selects 8 AM

1. Browser creates `new Date()` at 8 AM Trinidad time
2. `getHours()` returns `8`
3. `getTimezoneOffset()` returns `240` (Trinidad is UTC-4)
4. Default calculation: `-new Date().getTimezoneOffset() / 60 = -240/60 = -4`
5. API receives: `startDate=2026-03-23T08:00:00-04:00`
6. Backend parses to UTC: `new Date("2026-03-23T08:00:00-04:00")` = **March 23, 12:00 UTC**
7. Gaming day range: 8 AM Trinidad = 12:00 UTC to 11:59:59 UTC next day

### Scenario: User in Japan (UTC+9) selects 8 AM

1. Browser creates `new Date()` at 8 AM Japan time
2. `getHours()` returns `8` ✓ (correct local time)
3. `getTimezoneOffset()` returns `-540` (Japan is UTC+9)
4. Default calculation: `-(-540) / 60 = 9`
5. API receives: `startDate=2026-03-23T08:00:00+09:00`
6. Backend parses to UTC: `new Date("2026-03-23T08:00:00+09:00")` = **March 22, 23:00 UTC**
7. Gaming day range: 8 AM Japan = 23:00 UTC previous day

### The Result

| User Location    | Selected Time | API Receives         | UTC Equivalent       | Gaming Day |
| ---------------- | ------------- | -------------------- | -------------------- | ---------- |
| Trinidad (UTC-4) | 8:00 AM       | `...T08:00:00-04:00` | 12:00 UTC            | March 23   |
| Japan (UTC+9)    | 8:00 AM       | `...T08:00:00+09:00` | 23:00 UTC (prev day) | March 22   |

**The Japan user got data from the WRONG gaming day!**

---

## 4. Why 12 PM in Japan = 8 AM in Trinidad

You noticed that querying 12 PM in Japan returns the same data as 8 AM in Trinidad. Here's why:

| User Location | Selected Time | API Receives         | UTC Equivalent       |
| ------------- | ------------- | -------------------- | -------------------- |
| Japan         | 12:00 PM      | `...T12:00:00+09:00` | 03:00 UTC (March 23) |
| Trinidad      | 8:00 AM       | `...T08:00:00-04:00` | 12:00 UTC (March 23) |

Wait, that's still different. Let me recalculate...

Actually, the correct comparison:

**Japan 8 AM → UTC = 23:00 previous day**
**Trinidad 8 AM → UTC = 12:00 same day**

The difference is 13 hours. So:

- Japan 8 AM = Trinidad previous day 7 PM
- Japan 12 PM = Trinidad previous day 11 PM
- Japan 8 PM = Trinidad 7 AM (same day)

The system interprets ALL times as the user's LOCAL time, not Trinidad time. So a Japan user selecting "8 AM" gets "8 AM Japan" in the database, not "8 AM Trinidad".

---

## 5. The Component Hierarchy

```
app/cabinets/[slug]/page.tsx
└── CabinetsDetailsPageContent.tsx
    └── useCabinetPageData.ts
        └── useCabinetDetailsData.ts
            └── fetchCabinetById() → /api/machines/[machineId]
```

### File Locations

| File                                                                   | Purpose                       |
| ---------------------------------------------------------------------- | ----------------------------- |
| `components/CMS/cabinets/details/CabinetsDetailsAccountingDetails.tsx` | Accounting tab UI             |
| `lib/hooks/cabinets/useCabinetAccountingData.ts`                       | Hook for accounting data      |
| `lib/hooks/data/useCabinetDetailsData.ts`                              | Hook for cabinet details      |
| `lib/helpers/cabinets/helpers.ts`                                      | Contains `fetchCabinetById()` |
| `app/api/machines/[machineId]/route.ts`                                | Backend API endpoint          |

---

## 6. Backend Processing

**File**: `app/api/machines/[machineId]/route.ts`

```typescript
if (timePeriod === 'Custom') {
  const customStart = new Date(startDateParam); // e.g., "2026-03-23T08:00:00-04:00"
  const customEnd = new Date(endDateParam);

  // Check if dates have specific time
  const hasSpecificTime =
    customStart.getUTCHours() !== 0 || customStart.getUTCMinutes() !== 0;

  if (hasSpecificTime) {
    // Use EXACT time - no gaming day expansion
    return { rangeStart: customStart, rangeEnd: customEnd };
  }

  // Date-only: Apply gaming day expansion
  // ...
}
```

**Key Point:** If the date has a specific time (not midnight), the backend uses it EXACTLY as provided. No gaming day offset is applied.

---

## 7. Why the Data Looks "Offset"

When you query from Japan:

1. You select 8 AM Japan time
2. System stores/fetches data for 8 AM Japan = 23:00 UTC previous day
3. But meters were collected based on **Trinidad** gaming days (8 AM to 7:59 AM)
4. So you get NO DATA because no meters were collected at 23:00 UTC in the Trinidad gaming day

When you query 12 PM Japan:

1. 12 PM Japan = 03:00 UTC same day
2. This is still not in the Trinidad gaming day range (12:00 to 11:59 UTC)
3. But if you query enough days, eventually you'll hit the Trinidad 8 AM data

---

## 8. Potential Fixes

### Fix A: Hardcode Trinidad Offset Everywhere

Change `formatLocalDateTimeString` to always use `-4`:

```typescript
export function formatLocalDateTimeString(
  date: DateInput,
  timezoneOffset: number = -4  // Always Trinidad time
): string { ... }
```

**Pros:** All users get Trinidad time regardless of location
**Cons:** Users in other countries will see "wrong" times (e.g., "8 AM" displayed even though it's midnight locally)

### Fix B: Add User Timezone Setting

Allow users to configure their timezone preference:

```typescript
const userTimezone = user.preferences?.timezone ?? 'America/Port_of_Spain';
const offset = getOffsetFromTimezone(userTimezone);
formatLocalDateTimeString(date, offset);
```

### Fix C: Clear Warning/Labeling

If the system MUST work in Trinidad time, clearly label it:

```
Selected Time: 8:00 AM Trinidad Time (AST)
Current Local Time: 11:00 PM (JST)
```

---

## 9. Summary

| Issue                            | Cause                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| Japan 8 AM ≠ Trinidad 8 AM       | System uses browser's local offset, not Trinidad offset     |
| Japan 12 PM = Trinidad 8 AM data | Timezone offset difference causes data overlap              |
| No data when querying from Japan | Japan times don't align with Trinidad gaming day boundaries |

**Root Cause:** The `formatLocalDateTimeString` function uses the browser's detected timezone offset, but the system expects Trinidad time (UTC-4). Users in other timezones get incorrect results because their local times don't align with Trinidad gaming days.
