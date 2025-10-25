# Gaming Day Offset & Date Filtering Rules

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 10th, 2025  
**Version:** 1.0.0

---

## 🎯 **Overview**

The Gaming Day Offset system is a critical feature of the Evolution One CMS that allows gaming locations to define their business day boundaries. Instead of using standard midnight-to-midnight calendar days, the system uses a configurable offset (typically 8 AM Trinidad time) to align with actual business operations.

---

## ⏰ **CRITICAL: Local Time vs UTC Storage**

### **The Fundamental Rule:**

- **Users interact in LOCAL TIME** (Trinidad time: UTC-4)
- **Database stores in UTC** (Coordinated Universal Time)
- **ALL conversions happen on the backend** before querying the database

### **How This Works:**

```typescript
// ❌ WRONG - User thinks "October 10th" but we query UTC October 10th
const startDate = new Date('2025-10-10T00:00:00Z'); // This is UTC!

// ✅ CORRECT - User thinks "October 10th Trinidad time"
const userDate = new Date('2025-10-10T00:00:00'); // Local time
const trinidadStartUTC = new Date(userDate.getTime() + 4 * 60 * 60 * 1000);
// Converts: Oct 10, 12:00 AM Trinidad → Oct 10, 4:00 AM UTC
```

### **Time Conversion Examples:**

| User Local Time (Trinidad UTC-4)  | Stored in Database (UTC)   |
| --------------------------------- | -------------------------- |
| Oct 10, 2025, 12:00 AM (midnight) | Oct 10, 2025, 4:00 AM UTC  |
| Oct 10, 2025, 8:00 AM             | Oct 10, 2025, 12:00 PM UTC |
| Oct 10, 2025, 11:59 PM            | Oct 11, 2025, 3:59 AM UTC  |

### **Why This Matters:**

When a user selects "October 10th", they expect:

- **Start**: October 10th at midnight **Trinidad time**
- **End**: October 10th at 11:59:59 PM **Trinidad time**

But the database query needs:

- **Start**: October 10th at 4:00 AM **UTC**
- **End**: October 11th at 3:59:59 AM **UTC**

**Every API must convert local time to UTC before querying MongoDB.**

### **Visual Flow Diagram:**

```
USER INTERFACE (Trinidad Time UTC-4)
         ↓
    "October 10th"
         ↓
    Oct 10, 12:00 AM Trinidad
         ↓
    [BACKEND CONVERSION]
         ↓
    Add 4 hours for UTC
         ↓
    Oct 10, 4:00 AM UTC
         ↓
    DATABASE QUERY
         ↓
    MongoDB filters: readAt >= Oct 10, 4:00 AM UTC
         ↓
    RESULTS (stored in UTC)
         ↓
    [DISPLAY CONVERSION]
         ↓
    Subtract 4 hours for display
         ↓
    Show to user in Trinidad time
```

### **Common Pitfall to Avoid:**

```typescript
// ❌ WRONG - This queries UTC October 10th, not Trinidad October 10th
const userSelectsOctober10 = '2025-10-10';
const query = {
  readAt: {
    $gte: new Date('2025-10-10T00:00:00Z'), // UTC midnight
    $lte: new Date('2025-10-10T23:59:59Z'), // UTC 11:59 PM
  },
};
// This returns data from Oct 9, 8:00 PM to Oct 10, 7:59 PM Trinidad time! ❌

// ✅ CORRECT - Convert user's Trinidad date to UTC range
const userSelectsOctober10 = '2025-10-10';
const trinidadStart = new Date('2025-10-10T00:00:00'); // Trinidad midnight
const trinidadEnd = new Date('2025-10-10T23:59:59'); // Trinidad 11:59 PM

// Convert to UTC (add 4 hours because Trinidad is UTC-4)
const utcStart = new Date(trinidadStart.getTime() + 4 * 60 * 60 * 1000);
const utcEnd = new Date(trinidadEnd.getTime() + 4 * 60 * 60 * 1000);

const query = {
  readAt: {
    $gte: utcStart, // Oct 10, 4:00 AM UTC
    $lte: utcEnd, // Oct 11, 3:59 AM UTC
  },
};
// This correctly returns Oct 10 Trinidad time data! ✅
```

---

## 📋 **Core Concepts**

### **1. Gaming Day Offset**

- **Definition**: The hour (0-23) when a new gaming day begins for a location
- **Default Value**: `8` (8 AM Trinidad time)
- **Purpose**: Align financial reporting with actual business operations
- **Storage**: `gamingLocations.gameDayOffset` field in MongoDB

### **2. When Gaming Day Offset Applies**

Gaming day offset is used for:

- ✅ **Meter data queries** - All financial metrics from meters collection
- ✅ **Machine financial reports** - Money in/out/gross calculations
- ✅ **Location financial reports** - Aggregated location metrics
- ✅ **Dashboard totals** - System-wide financial summaries
- ✅ **Bill validator data** - Gaming session financial tracking
- ✅ **Predefined time periods** - Today, Yesterday, 7d, 30d

### **3. When Gaming Day Offset Does NOT Apply**

Standard calendar time filtering is used for:

- ❌ **Collection reports** - Filter by collection timestamp in local time
- ❌ **Activity logs** - Filter by action timestamp in local time
- ❌ **User sessions** - Filter by session timestamp in local time
- ❌ **Custom date ranges with time inputs** - User specifies exact times

---

## 🔧 **Implementation Standards**

### **Gaming Day Range Calculation**

#### **Helper Function Location**

```typescript
// File: lib/helpers/dateUtils.ts
export function getGamingDayRangeForPeriod(
  period: string,
  gameDayOffset: number,
  timezone: string = 'America/Port_of_Spain'
): { startDate: Date; endDate: Date };
```

#### **Standard Implementation Pattern**

```typescript
// 1. Get gaming day offset from location
const location = await GamingLocation.findById(locationId);
const gameDayOffset = location?.gameDayOffset || 8; // Default to 8 AM

// 2. Calculate gaming day range (returns UTC dates for DB query)
const { startDate, endDate } = getGamingDayRangeForPeriod(
  timePeriod,
  gameDayOffset,
  'America/Port_of_Spain'
);
// Note: startDate and endDate are ALREADY in UTC for database queries

// 3. Use in MongoDB query (dates are in UTC)
const meters = await Meters.find({
  machine: machineId,
  readAt: { $gte: startDate, $lte: endDate },
});
```

#### **What getGamingDayRangeForPeriod Does Internally:**

```typescript
// Example for "Today" with gameDayOffset = 8
// 1. Get current time in Trinidad (UTC-4)
const now = new Date();
const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);

// 2. Calculate gaming day boundaries in Trinidad time
const gamingDayStart = new Date(trinidadNow);
gamingDayStart.setHours(8, 0, 0, 0); // 8 AM Trinidad today
if (gamingDayStart > trinidadNow) {
  gamingDayStart.setDate(gamingDayStart.getDate() - 1); // If before 8 AM, use yesterday
}

const gamingDayEnd = new Date(gamingDayStart);
gamingDayEnd.setDate(gamingDayEnd.getDate() + 1); // Next day at 8 AM
gamingDayEnd.setMilliseconds(gamingDayEnd.getMilliseconds() - 1); // 7:59:59.999 AM

// 3. Convert to UTC for database query (add 4 hours)
const startDate = new Date(gamingDayStart.getTime() + 4 * 60 * 60 * 1000);
const endDate = new Date(gamingDayEnd.getTime() + 4 * 60 * 60 * 1000);

// Result:
// User perspective: Oct 10, 8:00 AM Trinidad → Oct 11, 7:59:59 AM Trinidad
// DB query: Oct 10, 12:00 PM UTC → Oct 11, 11:59:59 AM UTC
```

---

## 📊 **API-Specific Implementation**

### **Category 1: Meter-Based Financial APIs (Use Gaming Day Offset)**

#### **`/api/machines/[id]` - Machine Details**

- **Purpose**: Fetch financial metrics for a specific machine
- **Date Filtering**: Uses gaming day offset for all time periods
- **Implementation**:

  ```typescript
  // Get location and gaming day offset
  const machine = await Machine.findById(machineId);
  const location = await GamingLocation.findById(machine.gamingLocation);
  const gameDayOffset = location?.gameDayOffset || 8;

  // Calculate date range with gaming day offset
  if (timePeriod !== 'Custom' && timePeriod !== 'All Time') {
    const { startDate, endDate } = getGamingDayRangeForPeriod(
      timePeriod,
      gameDayOffset
    );
    // Use startDate/endDate in meter query
  }
  ```

- **Supported Periods**: Today, Yesterday, 7d, 30d, All Time, Custom
- **Custom Dates**: Uses exact user-specified times (no gaming day adjustment)

#### **`/api/locations/[locationId]` - Location Details**

- **Purpose**: Fetch aggregated financial metrics for a location
- **Date Filtering**: Uses gaming day offset
- **Implementation**:

  ```typescript
  const location = await GamingLocation.findById(locationId);
  const gameDayOffset = location?.gameDayOffset || 8;

  const { startDate, endDate } = getGamingDayRangeForPeriod(
    timePeriod,
    gameDayOffset
  );
  ```

- **Aggregation**: Sums all machines at the location for the gaming day period

#### **`/api/machines/aggregation` - Cabinets Page**

- **Purpose**: Aggregate all machines with financial metrics
- **Date Filtering**: Uses gaming day offset per location
- **Implementation**:

  ```typescript
  // Get distinct locations
  const locations = await Machine.distinct('gamingLocation');

  // Process each location with its gaming day offset
  for (const locationId of locations) {
    const location = await GamingLocation.findById(locationId);
    const gameDayOffset = location?.gameDayOffset || 8;

    const { startDate, endDate } = getGamingDayRangeForPeriod(
      timePeriod,
      gameDayOffset
    );
    // Query meters for this location's machines
  }
  ```

#### **`/api/dashboard/totals` - Dashboard Totals**

- **Purpose**: System-wide financial totals
- **Date Filtering**: Uses gaming day offset per location
- **Implementation**:

  ```typescript
  // Aggregate by location, each with its own gaming day offset
  const locations = await GamingLocation.find({ licencee });

  for (const location of locations) {
    const gameDayOffset = location.gameDayOffset || 8;
    const { startDate, endDate } = getGamingDayRangeForPeriod(
      timePeriod,
      gameDayOffset
    );
    // Query and aggregate
  }
  ```

#### **`/api/bill-validator/[machineId]` - Bill Validator Data**

- **Purpose**: Fetch bill validator transactions for a machine
- **Date Filtering**: Uses gaming day offset
- **Implementation**:

  ```typescript
  const machine = await Machine.findById(machineId);
  const location = await GamingLocation.findById(machine.gamingLocation);
  const gameDayOffset = location?.gameDayOffset || 8;

  // For predefined periods
  if (timePeriod !== 'Custom') {
    const { startDate, endDate } = getGamingDayRangeForPeriod(
      timePeriod,
      gameDayOffset
    );
  } else {
    // Custom: Use local time boundaries (midnight to midnight Trinidad time)
    // No gaming day offset for custom ranges
  }
  ```

---

### **Category 2: Timestamp-Based APIs (Use Local Time)**

#### **`/api/collectionReport` - Collection Reports**

- **Purpose**: Fetch collection reports
- **Date Filtering**: Uses local Trinidad time (UTC-4)
- **NO Gaming Day Offset**: Collection reports use actual collection timestamp
- **Implementation**:

  ```typescript
  // USER PERSPECTIVE: "Show me collections from October 10th"
  // User means: Oct 10, 12:00 AM to Oct 10, 11:59:59 PM Trinidad time

  // Step 1: Convert current time to Trinidad time
  const now = new Date();
  const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  // Step 2: Calculate "Today" boundaries in Trinidad time
  const todayStart = new Date(trinidadNow);
  todayStart.setHours(0, 0, 0, 0); // Midnight Trinidad time

  const todayEnd = new Date(trinidadNow);
  todayEnd.setHours(23, 59, 59, 999); // 11:59:59 PM Trinidad time

  // Step 3: Convert back to UTC for DB query (add 4 hours)
  const startDate = new Date(todayStart.getTime() + 4 * 60 * 60 * 1000);
  const endDate = new Date(todayEnd.getTime() + 4 * 60 * 60 * 1000);

  // DATABASE QUERY: Oct 10, 4:00 AM UTC to Oct 11, 3:59:59 AM UTC
  // This matches: Oct 10, 12:00 AM to Oct 10, 11:59:59 PM Trinidad time
  ```

- **Reason**: Collection reports represent actual physical collection events, not gaming day periods
- **Critical Note**: The conversion formula is OPPOSITE for querying vs storing:
  - **Storing**: Trinidad time → UTC = subtract 4 hours
  - **Querying**: Trinidad time → UTC = add 4 hours (to get the UTC timestamp that represents that Trinidad time)

#### **`/api/activity-logs` - Activity Logs**

- **Purpose**: Fetch user activity logs
- **Date Filtering**: Uses local time with precise timestamp filtering
- **NO Gaming Day Offset**: Activity logs use exact action timestamps
- **Implementation**: Direct timestamp comparison without gaming day adjustment

---

## 🎯 **Gaming Day Offset Configuration**

### **Database Field**

```typescript
// MongoDB Schema: gaminglocations collection
{
  _id: ObjectId,
  name: string,
  gameDayOffset: number, // 0-23, default 8
  // ... other fields
}
```

### **Setting Gaming Day Offset**

```typescript
// Update location gaming day offset
await GamingLocation.updateOne(
  { _id: locationId },
  { $set: { gameDayOffset: 8 } }
);
```

### **Handling Missing Gaming Day Offset**

```typescript
// Always provide a default value
const gameDayOffset = location?.gameDayOffset || 8;

// If location has gameDayOffset: 0, it means midnight (valid)
// If location has no gameDayOffset field, default to 8
```

---

## 🔄 **Time Period Handling**

### **Predefined Periods with Gaming Day Offset**

#### **Today**

```typescript
// Gaming day "Today" starts at gameDayOffset hour this morning
// and ends at (gameDayOffset - 1 second) tomorrow morning
const { startDate, endDate } = getGamingDayRangeForPeriod('Today', 8);
// Example: Oct 10, 2025 8:00 AM → Oct 11, 2025 7:59:59 AM
```

#### **Yesterday**

```typescript
// Gaming day "Yesterday" starts at gameDayOffset hour yesterday morning
// and ends at (gameDayOffset - 1 second) this morning
const { startDate, endDate } = getGamingDayRangeForPeriod('Yesterday', 8);
// Example: Oct 9, 2025 8:00 AM → Oct 10, 2025 7:59:59 AM
```

#### **Last 7 Days**

```typescript
// Last 7 gaming days, starting from 7 days ago at gameDayOffset
// and ending at current moment
const { startDate, endDate } = getGamingDayRangeForPeriod('7d', 8);
// Example: Oct 3, 2025 8:00 AM → Oct 10, 2025 3:45 PM (now)
```

#### **Last 30 Days**

```typescript
// Last 30 gaming days, starting from 30 days ago at gameDayOffset
// and ending at current moment
const { startDate, endDate } = getGamingDayRangeForPeriod('30d', 8);
// Example: Sep 10, 2025 8:00 AM → Oct 10, 2025 3:45 PM (now)
```

#### **All Time**

```typescript
// No date filtering - fetch all historical data
// startDate and endDate are undefined
const startDate = undefined;
const endDate = undefined;
```

#### **Custom**

```typescript
// User specifies exact dates and times
// NO gaming day offset adjustment
// Use exact user-specified boundaries
const startDate = new Date(userStartDate);
const endDate = new Date(userEndDate);
```

---

## 🚨 **Critical Rules**

### **Rule 1: Default to Gaming Day Offset for Meter Data**

**All APIs that query meter data MUST use gaming day offset by default.**

```typescript
// ✅ CORRECT
const gameDayOffset = location?.gameDayOffset || 8;
const { startDate, endDate } = getGamingDayRangeForPeriod(
  timePeriod,
  gameDayOffset
);

// ❌ WRONG - Don't use midnight-to-midnight for meter data
const startDate = new Date();
startDate.setHours(0, 0, 0, 0);
```

### **Rule 2: Use Local Time for Event Timestamps**

**Collection reports, activity logs, and other timestamped events use local time filtering.**

```typescript
// ✅ CORRECT for collection reports
const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);
todayStart.setHours(0, 0, 0, 0);

// ❌ WRONG - Don't use gaming day offset for collection timestamps
const { startDate, endDate } = getGamingDayRangeForPeriod('Today', 8); // NO!
```

### **Rule 3: Custom Dates Use Exact User Times**

**When users specify custom dates with times, use their exact specifications.**

```typescript
// ✅ CORRECT - Respect user's time selection
if (timePeriod === 'Custom') {
  const startDate = new Date(userStartDate); // Use exact time
  const endDate = new Date(userEndDate); // Use exact time
}

// ❌ WRONG - Don't adjust custom times to gaming day
const { startDate, endDate } = getGamingDayRangeForPeriod('Custom', 8); // NO!
```

### **Rule 4: Always Provide Default Gaming Day Offset**

**Never query without a gaming day offset value.**

```typescript
// ✅ CORRECT
const gameDayOffset = location?.gameDayOffset ?? 8;

// ❌ WRONG - Undefined gaming day offset
const gameDayOffset = location?.gameDayOffset; // Could be undefined!
```

### **Rule 5: Handle Gaming Day Offset = 0**

**Zero is a valid gaming day offset (midnight start).**

```typescript
// ✅ CORRECT - Properly handles 0
const gameDayOffset = location?.gameDayOffset ?? 8;

// ❌ WRONG - Treats 0 as falsy
const gameDayOffset = location?.gameDayOffset || 8; // If offset is 0, becomes 8!
```

---

## 📝 **Implementation Checklist**

### **For New Financial APIs:**

- [ ] Determine if API queries meter data or timestamp events
- [ ] If meter data: Implement gaming day offset logic
- [ ] If timestamp events: Use local time filtering
- [ ] Fetch location's `gameDayOffset` from database
- [ ] Use `getGamingDayRangeForPeriod` helper function
- [ ] Provide default value (`?? 8`) for missing offset
- [ ] Handle "Custom" dates without gaming day adjustment
- [ ] Handle "All Time" with undefined date range
- [ ] Test with different gaming day offset values (0, 8, 12, etc.)

### **For Existing API Updates:**

- [ ] Verify current date filtering logic
- [ ] Check if gaming day offset is being used correctly
- [ ] Ensure custom dates are not being adjusted
- [ ] Confirm All Time works without date filtering
- [ ] Test timezone conversions (Trinidad UTC-4)

---

## 🧪 **Testing Requirements**

### **Test Cases for Gaming Day Offset**

1. **Test with offset = 8** (standard case)
2. **Test with offset = 0** (midnight start)
3. **Test with offset = 12** (noon start)
4. **Test with missing offset** (should default to 8)
5. **Test "Today" period** across gaming day boundary
6. **Test "Yesterday" period** across gaming day boundary
7. **Test "Last 7 Days"** spanning multiple gaming days
8. **Test "Custom" dates** with specific times
9. **Test "All Time"** returns all data

### **Verification Steps**

```javascript
// MongoDB verification query for "Today" with offset 8
db.meters.find({
  machine: 'machineId',
  readAt: {
    $gte: ISODate('2025-10-10T12:00:00Z'), // 8 AM Trinidad (UTC-4)
    $lte: ISODate('2025-10-11T11:59:59Z'), // 7:59:59 AM next day
  },
});
```

---

## 🎯 **Summary**

### **When to Use Gaming Day Offset:**

- ✅ Machine financial metrics (`/api/machines/[id]`)
- ✅ Location financial metrics (`/api/locations/[locationId]`)
- ✅ Aggregated machine data (`/api/machines/aggregation`)
- ✅ Dashboard totals (`/api/dashboard/totals`)
- ✅ Bill validator data (`/api/bill-validator/[machineId]`)
- ✅ Any meter-based financial calculations

### **When NOT to Use Gaming Day Offset:**

- ❌ Collection reports (`/api/collectionReport`)
- ❌ Activity logs (`/api/activity-logs`)
- ❌ User sessions (timestamp-based)
- ❌ Custom date ranges with user-specified times
- ❌ Any event-based timestamp filtering

### **Key Principles:**

1. **Financial data from meters** = Gaming day offset
2. **Event timestamps** = Local time
3. **Custom dates** = User's exact times
4. **Always default** to 8 for missing offsets
5. **Test thoroughly** with different offset values

---

This system ensures accurate financial reporting aligned with actual business operations while maintaining precise timestamp tracking for events and collections.
