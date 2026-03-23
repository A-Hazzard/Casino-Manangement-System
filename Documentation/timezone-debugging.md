# Timezone Logic for Cabinet Details Queries

This document explains how timezone handling works for cabinet details, focusing on the ACTUAL component relationships and data flow from the UI to the API.

---

## 1. Component Hierarchy for Cabinet Metrics

The cabinet details page follows this specific structure for fetching financial and status data:

```
app/cabinets/[slug]/page.tsx
└── CabinetsDetailsPageContent.tsx
    └── useCabinetPageData.ts (Custom Hook)
        └── useCabinetDetailsData.ts (Data Hook)
            └── fetchCabinetById() (Helper Function)
                → GET /api/machines/[machineId]
```

### File Responsibilities

| Component/File | Role |
| :--- | :--- |
| `app/cabinets/[slug]/page.tsx` | Route wrapper that provides the `slug` (machine ID) to the content. |
| `CabinetsDetailsPageContent.tsx` | The main UI container. Uses the `useCabinetPageData` hook and manages high-level layout. |
| `useCabinetPageData.ts` | Orchestrates page state (tabs, refreshing, charts). It utilizes `useCabinetDetailsData` for core machine metrics. |
| `useCabinetDetailsData.ts` | Manages the lifecycle of machine data fetching. Triggers updates when global filters change. |
| `lib/helpers/cabinets/helpers.ts` | Contains `fetchCabinetById()`, which constructs the API request with appropriate date parameters. |
| `app/api/machines/route.ts` | Backend handler that parses parameters and returns pure UTC data (no timezone shifting). |

---

## 2. Data Flow: From UI to API

### Step 1: User Interaction (UI)
User interacts with the filter system (usually in the header or a filter bar).
- **Actions**: Clicking "Today", "Yesterday", "30d", or selecting a date/time in the **Custom Date Range picker**.
- **State**: These actions update the `useDashBoardStore` (Zustand) with:
    - `activeMetricsFilter`: The selected period name (e.g., "Today", "Custom").
    - `customDateRange`: An object containing `startDate` and `endDate` (or `from`/`to`).

### Step 2: Hook Trigger (`useCabinetDetailsData.ts`)
The `useCabinetDetailsData` hook monitors changes to these store values.
```typescript
// useCabinetDetailsData.ts
useEffect(() => {
  if (activeMetricsFilter && dateFilterInitialized) {
    fetchCabinetDetailsData();
  }
}, [activeMetricsFilter, customDateRange, ...]);
```
It calls `fetchCabinetById` inside the `fetchCabinetDetailsData` callback.

### Step 3: API Request Construction (`helpers.ts`)
In `fetchCabinetById`, the frontend decides how to format the dates based on whether the user selected a specific time.

- **Predefined Periods** (Today, Yesterday, 7d, 30d):
    - Only `timePeriod` is sent: `?timePeriod=Today`
- **Custom Selection**:
    - **Has Specific Time** (e.g., 11:45 AM): Uses `formatLocalDateTimeString(date)`.
        - Result: `startDate=2025-03-23T11:45:00-04:00` (assuming user is in UTC-4)
        - *Key*: This preserves the local "wall clock" time by including the **actual browser offset** in the ISO string.
    - **Date-Only/Midnight**: Appends `T00:00:00.000Z`.
        - Result: `startDate=2025-03-23T00:00:00.000Z`
        - *Key*: This treats the selection as a pure UTC date.

### Step 4: Backend Processing (`/api/machines/[machineId]/route.ts`)
The API route receives the parameters and calculates the final DB query range.

1.  **Get Machine's Location**: It finds the `gamingLocation` for the machine.
2.  **Get Gaming Day Offset**: It retrieves `gameDayOffset` from the location (e.g., `8` for 8 AM).
3.  **Apply Logic (`getGamingDayRangeForPeriod`)**:
    - If `timePeriod === 'Custom'`:
        - Checks if input has explicit time (not midnight).
        - **Has Time**: Uses the EXACT UTC time provided. No gaming day expansion.
        - **No Time (Midnight)**: Expands the range to full gaming days (e.g., 8:00 AM on Start Date to 7:59:59 AM after End Date).
    - If **Predefined Period**: Calculates the range relative to "now" using the `gameDayOffset`.

### Step 5: Database Query
The calculated `rangeStart` and `rangeEnd` are used to filter the `Meters` collection.
```javascript
{ readAt: { $gte: rangeStart, $lte: rangeEnd } }
```

### Step 6: Response and Display
The API returns raw UTC dates (e.g., `updatedAt: "2025-03-23T15:45:00.000Z"`).
- **Client-Side Rendering**: UI components receive the UTC string.
- **Local Formatting**: JavaScript's native `Date` object and `Intl.DateTimeFormat` (used in `shared/utils/dateFormat.ts`) automatically convert this UTC time to the **user's current local timezone** for display.
    - *Example*: A user in Trinidad sees 11:45 AM, while a user in Japan sees 12:45 AM the next day for the same event.

---

## 3. Formatting Utilities

### `formatLocalDateTimeString`
Located in `shared/utils/dateFormat.ts`.
It extracts the local components (Year, Month, Day, Hour, Minute) from a JS `Date` object and appends the **actual browser timezone offset**.
- **Offset**: Calculated dynamically via `-new Date().getTimezoneOffset() / 60`.
- **Why?**: This ensures that when a user selects "11:45 AM" in their local time, the API receives that exact moment correctly regardless of where the server is located.

### Removal of `convertResponseToTrinidadTime`
The previously used `app/api/lib/utils/timezone.ts` utility has been **deleted**.
- **Reason**: It was manually shifting UTC hours by -4 before sending to the client, which "lied" to the browser about the actual time and caused double-offsetting or incorrect displays for users outside of Trinidad.
- **New Standard**: All API responses are pure UTC.

---

## 4. Key Implementation Details

### Gaming Day Expansion Logic
Located in `lib/utils/gamingDayRange.ts`.

- **Formulas**:
    - `UTC_Start = Local_Date + (gameDayOffset - timezoneOffset)`
    - Example: March 23 + (8 AM - (-4)) = March 23, 12:00 UTC.

### Custom Date vs Predefined
- **Predefined**: Always affected by `gameDayOffset`. If it's 7 AM and you click "Today", you get *Yesterday's* calendar date because the gaming day hasn't started yet.
- **Custom (with time)**: Ignores `gameDayOffset`. If you pick 11:45 AM, you get exactly 11:45 AM.

---

## 5. Troubleshooting & Inaccuracies to Watch For

1.  **"fetchCabinetById is in useCabinetPageData"**: **FALSE**. It is a helper function called by `useCabinetDetailsData`.
2.  **"ModernCalendar is used"**: **FALSE** for Cabinet Details. It uses a combination of page-level filters and tab-specific pickers like `ModernDateRangePicker`.
3.  **Missing `useCabinetDetailsData`**: Previous docs skipped this intermediate hook which is actually responsible for the data fetching lifecycle.
4.  **Hardcoded -4 Offset**: This has been removed. The system now detects the user's browser timezone offset dynamically.

---

## 6. Summary Table

| Step | Location | Status | Output Example |
| :--- | :--- | :--- | :--- |
| 1. Select Filter | `CabinetsDetailsPageContent` | UI | `activeMetricsFilter = 'Custom'` |
| 2. Fetch Data | `useCabinetDetailsData` | Hook | Calls helper |
| 3. Format URL | `lib/helpers/cabinets/helpers.ts` | Helper | `/api/machines/ID?startDate=...[LocalOffset]` |
| 4. Parse Dates | `app/api/machines/route.ts` | API | `new Date("...[LocalOffset]")` |
| 5. Calculate Range | `lib/utils/gamingDayRange.ts` | Utils | `rangeStart = ISODate("...")` |
| 6. Return Data | `app/api/machines/route.ts` | API | Returns raw UTC JSON |
| 7. Display Data | `shared/utils/dateFormat.ts` | UI | Browser converts UTC -> Local |
