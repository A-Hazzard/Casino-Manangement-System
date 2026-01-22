# Timezone Management

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 2025  
**Version:** 2.0.0

## Table of Contents

1. [Overview](#overview)
2. [Timezone Configuration](#timezone-configuration)
3. [Core Timezone Utilities](#core-timezone-utilities)
4. [Implementation Examples](#implementation-examples)
5. [Business Logic](#business-logic)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)

## Overview

The Evolution One CMS system implements comprehensive timezone management for Trinidad and Tobago (UTC-4). All date fields throughout the application are automatically converted from UTC (stored in the database) to Trinidad local time for display and user interaction, ensuring consistent and accurate time representation across all system components.

### Key Principles

- **Consistency**: All dates displayed in Trinidad local time (UTC-4)
- **Accuracy**: Automatic conversion between UTC storage and local display
- **Reliability**: No daylight saving time complications
- **Performance**: Efficient timezone conversion with minimal overhead

### System Integration

- **Database Storage**: All dates stored in UTC format for consistency
- **API Responses**: Automatic conversion to Trinidad time for frontend display
- **Date Queries**: Frontend inputs converted to UTC for database operations
- **User Interface**: All date/time displays show Trinidad local time

## Timezone Configuration

### Trinidad Timezone (UTC-4)

- **Offset:** UTC-4 (4 hours behind UTC)
- **No Daylight Saving Time:** Trinidad and Tobago does not observe DST
- **Year-round consistency:** The offset remains constant throughout the year

### Current Implementation

- **Database Storage:** All dates stored in UTC format
- **API Responses:** Dates automatically converted to Trinidad time before sending to frontend
- **Date Queries:** Frontend date inputs converted to UTC for database queries
- **Display:** All date/time displays show Trinidad local time

## Core Timezone Utilities

### Location: `app/api/lib/utils/timezone.ts`

#### Key Functions

**`utcToTrinidadTime(utcDate: Date): Date`**

- Converts UTC dates to Trinidad local time
- Adds 4 hours to UTC time
- Returns new Date object in Trinidad time

**`trinidadTimeToUtc(trinidadDate: Date): Date`**

- Converts Trinidad local time to UTC
- Subtracts 4 hours from Trinidad time
- Returns new Date object in UTC

**`getCurrentTrinidadTime(): Date`**

- Returns current Trinidad local time
- Useful for timestamping operations

**`formatTrinidadTime(utcDate: Date, options?: Intl.DateTimeFormatOptions): string`**

- Formats UTC dates as Trinidad time strings
- Uses `en-TT` locale for proper formatting
- Supports custom formatting options

**`convertObjectDatesToTrinidadTime<T>(obj: T, dateFields?: string[]): T`**

- Recursively converts all date fields in objects to Trinidad time
- Handles nested objects and arrays
- Automatically detects common date field names

**`convertResponseToTrinidadTime<T>(data: T, additionalDateFields?: string[]): T`**

- Main utility for converting API response data
- Handles both objects and arrays
- Converts all date fields to Trinidad time

**`createTrinidadDateRangeFilter(startDate: Date | string, endDate: Date | string): { $gte: Date; $lte: Date }`**

- Creates MongoDB date range queries in UTC
- Converts Trinidad time inputs to UTC for database queries
- Returns proper MongoDB query format

## Date Fields Automatically Converted

The system automatically detects and converts the following date fields:

### Common Date Fields

- `createdAt` - Record creation timestamp
- `updatedAt` - Record last update timestamp
- `deletedAt` - Soft delete timestamp
- `readAt` - Meter reading timestamp
- `timestamp` - Generic timestamp field
- `date` - Generic date field

### Time-based Fields

- `startTime` - Session/event start time
- `endTime` - Session/event end time
- `lastActivity` - Last activity timestamp
- `lastLogin` - User last login time
- `lastPwUpdatedAt` - Password last update time
- `lastfplAwardAt` - FPL award timestamp
- `smsCodeTime` - SMS code timestamp

### Business-specific Fields

- `startDate` - Contract/period start date
- `expiryDate` - Contract/period expiry date
- `prevStartDate` - Previous period start
- `prevExpiryDate` - Previous period expiry
- `previousCollectionTime` - Previous collection timestamp
- `collectionTime` - Collection timestamp
- `lastBillMeterAt` - Last bill meter reading
- `lastSasMeterAt` - Last SAS meter reading
- `lastMaintenanceDate` - Last maintenance date
- `nextMaintenanceDate` - Next maintenance date
- `lastAutoLogoutTime` - Last auto logout time
- `asOf` - As-of date for reports

## API Implementation

### Automatic Conversion in API Responses

All API endpoints automatically convert date fields to Trinidad time before sending responses:

```typescript
// Example API route implementation
import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';

export async function GET() {
  try {
    const users = await User.find();

    // Automatically converts all date fields to Trinidad time
    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(users),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
```

### Date Range Queries

When querying by date ranges, convert Trinidad time to UTC:

```typescript
import { createTrinidadDateRangeFilter } from '@/app/api/lib/utils/timezone';

// Frontend sends Trinidad time, convert to UTC for database query
const dateRange = createTrinidadDateRangeFilter(startDate, endDate);

const results = await Meters.find({
  readAt: dateRange,
});
```

### Timezone Middleware

Use the timezone middleware for consistent API responses:

```typescript
import {
  successResponse,
  paginatedResponse,
} from '@/app/api/lib/utils/timezoneMiddleware';

// Automatically converts dates to Trinidad time
return successResponse(users, 'Users fetched successfully');

// For paginated responses
return paginatedResponse(activities, pagination);
```

## Frontend Implementation

### Date Input Handling

When users input dates in the frontend (Trinidad time), convert to UTC for API calls:

```typescript
import { trinidadTimeToUtc } from '@/app/api/lib/utils/timezone';

// User selects date in Trinidad time
const userSelectedDate = new Date('2024-01-15T10:00:00');

// Convert to UTC for API call
const utcDate = trinidadTimeToUtc(userSelectedDate);

// Send UTC date to API
const response = await axios.get('/api/data', {
  params: { startDate: utcDate.toISOString() },
});
```

### Date Display

API responses automatically contain Trinidad time, so display directly:

```typescript
// API response already contains Trinidad time
const { createdAt } = userData;

// Display directly - no conversion needed
const formattedDate = new Date(createdAt).toLocaleString('en-TT');
```

## Database Considerations

### Storage Format

- **All dates stored in UTC** in MongoDB
- **No timezone information** stored with dates
- **Consistent UTC storage** across all collections

### Query Optimization

- **Index on date fields** for efficient time-based queries
- **UTC-based queries** for consistent performance
- **Date range queries** use UTC boundaries

### Migration Considerations

- **Existing data** remains in UTC format
- **New data** continues to be stored in UTC
- **No data migration** required for timezone implementation

## Testing and Validation

### Timezone Conversion Testing

```typescript
// Test timezone conversion accuracy
const testUtc = new Date('2024-01-15T04:59:00.000Z'); // 4:59 UTC
const trinidadTime = utcToTrinidadTime(testUtc);
console.log(trinidadTime.toISOString()); // Should be 12:59 Trinidad time

// Test reverse conversion
const testTrinidad = new Date('2024-01-15T12:59:00.000Z'); // 12:59 Trinidad
const utcTime = trinidadTimeToUtc(testTrinidad);
console.log(utcTime.toISOString()); // Should be 4:59 UTC
```

### Debug Utilities

```typescript
import { debugTimezones } from '@/app/api/lib/utils/timezone';

// Debug current timezone conversion
debugTimezones();
// Outputs current UTC and Trinidad times for verification
```

## Common Patterns

### Date Range Filtering

```typescript
// Frontend sends Trinidad time range
const frontendRange = {
  startDate: '2024-01-15T00:00:00',
  endDate: '2024-01-15T23:59:59',
};

// Convert to UTC for database query
const utcRange = createTrinidadDateRangeFilter(
  frontendRange.startDate,
  frontendRange.endDate
);

// Query database with UTC range
const results = await Collection.find({
  createdAt: utcRange,
});

// Convert results back to Trinidad time
return convertResponseToTrinidadTime(results);
```

### Real-time Timestamps

```typescript
// For real-time operations, use current Trinidad time
const currentTrinidadTime = getCurrentTrinidadTime();

// Store in database as UTC
const utcTimestamp = trinidadTimeToUtc(currentTrinidadTime);

await Record.create({
  timestamp: utcTimestamp,
  // ... other fields
});
```

## Error Handling

### Invalid Date Handling

```typescript
// Always validate dates before conversion
function safeTimezoneConversion(date: any): Date | null {
  try {
    if (!date || !(date instanceof Date)) {
      return null;
    }
    return utcToTrinidadTime(date);
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return null;
  }
}
```

### Fallback Behavior

```typescript
// Provide fallback for timezone conversion failures
const convertedDate = safeTimezoneConversion(rawDate) || new Date();
```

## Performance Considerations

### Caching Strategy

- **Timezone conversions** are lightweight operations
- **No caching** required for conversion functions
- **Database queries** remain efficient with UTC storage

### Memory Usage

- **Minimal overhead** for timezone conversion
- **No additional storage** requirements
- **Efficient object traversal** for date field conversion

## Compliance and Audit

### Regulatory Requirements

- **Consistent timezone handling** across all financial transactions
- **Audit trail** maintains UTC timestamps for compliance
- **User-facing displays** show local Trinidad time for clarity

### Audit Trail

- **Database logs** maintain UTC timestamps
- **API logs** include both UTC and Trinidad time for debugging
- **Financial reports** clearly indicate timezone used

## Troubleshooting

### Common Issues

**Issue:** Dates showing incorrect times

- **Solution:** Verify timezone conversion is applied to API responses
- **Check:** Ensure `convertResponseToTrinidadTime` is called on all API responses

**Issue:** Date range queries returning wrong results

- **Solution:** Use `createTrinidadDateRangeFilter` for date range queries
- **Check:** Verify frontend dates are converted to UTC before database queries

**Issue:** Inconsistent date displays

- **Solution:** Ensure all date fields are included in conversion
- **Check:** Add missing date fields to `additionalDateFields` parameter

### Debug Commands

```typescript
// Debug timezone conversion
import { debugTimezones } from '@/app/api/lib/utils/timezone';
debugTimezones();

// Test specific date conversion
const testDate = new Date();
console.log('UTC:', testDate.toISOString());
console.log('Trinidad:', utcToTrinidadTime(testDate).toISOString());
```

## Related Documentation

- [Financial Metrics Guide](financial-metrics-guide.md) - Date field usage in financial calculations
- [API Overview](backend/api-overview.md) - API implementation patterns
- [Engineering Guidelines](PROJECT_GUIDE.md) - Development standards

## Support

For timezone-related issues:

1. Check that timezone utilities are properly imported
2. Verify date fields are included in conversion lists
3. Test timezone conversion with known UTC/Trinidad time pairs
4. Review API response data for proper timezone conversion

---

**Last Updated**: November 22, 2025  
**Version**: 1.0  
**Maintained By**: Evolution One CMS Development Team
