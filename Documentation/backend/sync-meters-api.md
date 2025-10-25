# Sync Meters API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** October 15th, 2025  
**Version:** 2.0.0

## Quick Search Guide

- **Sync Meters**: `POST /api/collection-report/[reportId]/sync-meters` - Recalculate SAS metrics
- **Report ID**: URL parameter for collection report to sync
- **Movement Calculation**: First→Last meter comparison for SAS metrics
- **Time Period**: Uses SAS time periods from collection data
- **Data Sources**: Meters collection with movement calculations

## Overview

The Sync Meters functionality is a critical feature that recalculates SAS (Slot Accounting System) metrics for collection reports based on meter data within specific time periods. This ensures that collection reports have accurate financial data that matches the actual meter readings from slot machines.

### System Architecture

- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **Data Processing**: Movement calculation from meter data
- **Time Period Logic**: SAS time period alignment

## API Endpoint

### POST `/api/collection-report/[reportId]/sync-meters`

**Purpose**: Recalculates SAS metrics for collections based on meter data within SAS time periods

**URL Parameters:**

- `reportId` - The collection report ID to sync (passed as URL parameter)

**Request Body**: No body required (reportId comes from URL)

**Response Fields:**

## Purpose

The sync meters feature addresses the following business needs:

1. **Data Accuracy**: Ensures collection reports reflect actual meter readings from slot machines
2. **Financial Reconciliation**: Recalculates SAS metrics (drop, cancelled credits, gross) based on real meter data
3. **Time Period Alignment**: Processes meter data within the specific SAS time periods for each collection
4. **Data Consistency**: Updates collection records with the most current meter information
5. **Movement Calculation**: Calculates actual movement by comparing first and last meters in the period

## API Endpoint

### POST /api/collection-report/[reportId]/sync-meters

**Purpose**: Recalculates SAS metrics for collections based on meter data within SAS time periods

**URL Parameters**:

- `reportId`: The collection report ID to sync (passed as URL parameter)

**Request Body**: No body required (reportId comes from URL)

**Response**:

```json
{
  "success": true,
  "data": {

    "reportId": "string",              // Collection report ID
    "totalCollections": 25,            // Total collections in report
    "updatedCollections": 23,          // Collections successfully updated
    "reportTotals": {
      "totalDrop": 50000,              // Total drop across all collections
      "totalCancelled": 5000,          // Total cancelled credits
      "totalGross": 45000              // Total gross revenue
    },
    "results": [
      {
        "machineId": "string",         // Machine identifier
        "collectionId": "string",      // Collection identifier
        "metersProcessed": 15,         // Number of meter readings processed
        "calculatedValues": {
          "drop": 2000,                // Calculated drop amount
          "totalCancelledCredits": 200, // Calculated cancelled credits
          "gross": 1800                // Calculated gross amount
        },
        "movementCalculation": {
          "firstMeter": {
            "drop": 10000,             // First meter drop reading
            "cancelled": 1000,         // First meter cancelled reading
            "readAt": "2025-01-15T10:00:00Z" // First meter timestamp
          },
          "lastMeter": {
            "drop": 12000,             // Last meter drop reading
            "cancelled": 1200,         // Last meter cancelled reading
            "readAt": "2025-01-15T18:00:00Z" // Last meter timestamp
          },
          "movement": {
            "drop": 2000,              // Drop movement (last - first)
            "cancelled": 200           // Cancelled movement (last - first)
          }
        },
        "timePeriod": {
          "start": "2025-01-15T10:00:00Z", // SAS period start
          "end": "2025-01-15T18:00:00Z"    // SAS period end

    "reportId": "string",
    "totalCollections": number,
    "updatedCollections": number,
    "reportTotals": {
      "totalDrop": number,
      "totalCancelled": number,
      "totalGross": number
    },
    "results": [
      {
        "machineId": "string",
        "collectionId": "string",
        "metersProcessed": number,
        "calculatedValues": {
          "drop": number,
          "totalCancelledCredits": number,
          "gross": number
        },
        "movementCalculation": {
          "firstMeter": {
            "drop": number,
            "cancelled": number,
            "readAt": "string (ISO date)"
          },
          "lastMeter": {
            "drop": number,
            "cancelled": number,
            "readAt": "string (ISO date)"
          },
          "movement": {
            "drop": number,
            "cancelled": number
          }
        },
        "timePeriod": {
          "start": "string (ISO date)",
          "end": "string (ISO date)"
        }
      }
    ]
  }
}
```

## How It Works

### 1. Find Collection Report

- Takes a `reportId` parameter from URL to identify which collection report to sync
- Finds the collection report by `locationReportId` in the `collectionreports` collection

### 2. Find All Collections

- Finds all collections associated with that report using the `locationReportId` field
- Both `collectionreports` and `collections` have this field for linking

### 3. Process Each Collection

## How It Works (Updated Flow)

### 1. **Find Collection Report**

- Takes a `reportId` parameter from URL to identify which collection report to sync
- Finds the collection report by `locationReportId` in the `collectionreports` collection

### 2. **Find All Collections**

- Finds all collections associated with that report using the `locationReportId` field
- Both `collectionreports` and `collections` have this field for linking

### 3. **Process Each Collection**

For each collection in the report:

**a. Get Machine Data**: Extracts the `machineId` from the collection

**b. Determine SAS Time Period**:

- Uses `sasMeters.sasStartTime` and `sasMeters.sasEndTime` if available
- Falls back to default 24-hour period if not specified

**c. Fetch ALL Meters Within SAS Period**: Finds all meter readings for the machine within the time period using `readAt` field

**d. Calculate Movement (First→Last Meter)**:

- **Primary Method**: Calculate movement by comparing first and last meters in the period
- **Drop Movement**: `lastMeter.movement.drop - firstMeter.movement.drop`
- **Cancelled Movement**: `lastMeter.movement.totalCancelledCredits - firstMeter.movement.totalCancelledCredits`
- **SAS Gross**: `dropMovement - cancelledMovement`

**e. Aggregate SAS Totals**: Sum all calculated movements for the report

**f. Update Collection**: Updates the collection's `sasMeters` field with calculated values

**g. Update Machine Collection Meters**: Updates machine's collection meter history if needed

### 4. Update Collection Report Totals

### 4. **Update Collection Report Totals**

Updates the main collection report with aggregated totals:

- `totalDrop`: Sum of all collection drop movements
- `totalCancelled`: Sum of all collection cancelled movements
- `totalGross`: Sum of all collection gross values
- `totalSasGross`: Same as totalGross
- `lastSyncedAt`: Timestamp of the sync operation

### 5. Return Success with Statistics

### 5. **Return Success with Statistics**

Returns detailed information about the sync operation including:

- Number of collections processed and updated
- Report-level totals
- Individual collection results with movement calculations

## Database Relationships

### Collections → Meters

- **Collections** contain `machineId` field that references machines
- **Meters** contain `machine` field that references the same machines
- **Time Period**: Meters are filtered by `readAt` field within the SAS time period

### Data Flow

```
Collection Report
    ↓ (locationReportId)
Collections
    ↓ (machineId)
Machines
    ↓ (machine field)
Meters (filtered by readAt within SAS time period)
    ↓ (aggregation)
Updated sasMeters in Collections
```

## Financial Calculations

### Movement Calculation Formulas

```
Drop Movement = Last Meter Drop - First Meter Drop
Cancelled Movement = Last Meter Cancelled - First Meter Cancelled
SAS Gross = Drop Movement - Cancelled Movement
```

### Time Period Logic

```
SAS Period Start = sasMeters.sasStartTime (if available)
SAS Period End = sasMeters.sasEndTime (if available)
Fallback Period = 24 hours ending at current time
```

### Aggregation Formulas

```
Report Total Drop = Sum of all collection drop movements
Report Total Cancelled = Sum of all collection cancelled movements
Report Total Gross = Sum of all collection gross values
```

## Data Models

### Collection Report Model

```typescript
{
  _id: string; // Report identifier
  locationReportId: string; // Unique report identifier
  totalDrop: number; // Total drop amount
  totalCancelled: number; // Total cancelled credits
  totalGross: number; // Total gross revenue
  totalSasGross: number; // Total SAS gross
  lastSyncedAt: Date; // Last sync timestamp
}
```

### Collection Model

```typescript
{
  _id: string; // Collection identifier
  machineId: string; // Machine identifier
  locationReportId: string; // Parent report ID
  sasMeters: {
    drop: number; // SAS drop amount
    totalCancelledCredits: number; // SAS cancelled credits
    gross: number; // SAS gross amount
    sasStartTime: string; // SAS period start time
    sasEndTime: string; // SAS period end time
  }
}
```

### Meter Model

```typescript
{
  _id: string; // Meter identifier
  machine: string; // Machine identifier
  readAt: Date; // Meter reading timestamp
  movement: {
    drop: number; // Drop amount at reading
    totalCancelledCredits: number; // Cancelled credits at reading
  }
}
```

## Business Rules

### Time Period Logic

1. **Primary**: Use `sasMeters.sasStartTime` and `sasMeters.sasEndTime` if available
2. **Fallback**: Default to 24-hour period ending at current time
3. **Validation**: Ensure start time is before end time

### Calculation Rules

1. **Movement Calculation (Primary Method)**: Calculate actual movement by comparing first and last meters
   - **Drop Movement**: `lastMeter.movement.drop - firstMeter.movement.drop`
   - **Cancelled Movement**: `lastMeter.movement.totalCancelledCredits - firstMeter.movement.totalCancelledCredits`
   - **Gross Calculation**: `dropMovement - cancelledMovement`
2. **Aggregation Method (Verification)**: Sum all `movement.drop` and `movement.totalCancelledCredits` values within the time period
3. **Zero Handling**: Treat missing or null values as 0
4. **Primary vs Verification**: Use movement calculation as primary, aggregation for verification

### Data Integrity

1. **Machine Validation**: Skip collections without valid `machineId`
2. **Meter Validation**: Skip machines with no meter data in the time period
3. **Update Validation**: Only update collections where meter data was found

## Error Handling

### Common Error Scenarios

## Usage Examples

### Frontend Integration

```typescript
// Using the helper function
import { syncMetersForReport } from '@/lib/helpers/collectionReportDetailPageData';

const handleSync = async (reportId: string) => {
  try {
    await syncMetersForReport(reportId);
    // Refresh the page data after sync
    await refreshCollectionReportData(reportId);
  } catch (error) {
    console.error('Error syncing meters:', error);
  }
};
```

### Direct API Call

```typescript
import axios from 'axios';

const syncMeters = async (reportId: string) => {
  const response = await axios.post(
    `/api/collection-report/${reportId}/sync-meters`
  );

  if (response.data.success) {
    console.log(`Synced ${response.data.data.updatedCollections} collections`);
    console.log(`Report totals updated:`, response.data.data.reportTotals);
  }
};
```

## Error Handling

### Common Error Scenarios

1. **Missing Report ID**

   ```json
   {
     "success": false,
     "error": "Report ID is required"
   }
   ```

2. **No Collections Found**

   ```json
   {
     "success": false,
     "error": "No collections found for this report"
   }
   ```

3. **Database Connection Issues**
   ```json
   {
     "success": false,
     "error": "Internal server error"
   }
   ```

### Error Recovery

- **Partial Updates**: If some collections fail to update, others may still succeed
- **Logging**: All errors are logged with detailed information
- **Graceful Degradation**: The system continues processing other collections even if one fails

## Performance Considerations

### Optimization Strategies

1. **Indexed Queries**: Uses database indexes on:
   - `locationReportId` in Collections
   - `machine` and `readAt` in Meters

2. **Batch Processing**: Processes collections sequentially to avoid overwhelming the database

3. **Time Period Filtering**: Only retrieves meter data within the relevant time period

### Monitoring

- **Processing Time**: Logs the time taken to process each collection
- **Success Rate**: Tracks how many collections were successfully updated
- **Data Volume**: Reports the number of meter records processed

## API Usage Examples

### Frontend Integration

```typescript
// Using the helper function
import { syncMetersForReport } from '@/lib/helpers/collectionReportDetailPageData';

const handleSync = async (reportId: string) => {
  try {
    await syncMetersForReport(reportId);
    // Refresh the page data after sync
    await refreshCollectionReportData(reportId);
  } catch (error) {
    console.error('Error syncing meters:', error);
  }
};
```

### Direct API Call

```typescript
import axios from 'axios';

const syncMeters = async (reportId: string) => {
  const response = await axios.post(
    `/api/collection-report/${reportId}/sync-meters`
  );

  if (response.data.success) {
    console.log(`Synced ${response.data.data.updatedCollections} collections`);
    console.log(`Report totals updated:`, response.data.data.reportTotals);
  }
};
```

## Business Rules

### Time Period Logic

1. **Primary**: Use `sasMeters.sasStartTime` and `sasMeters.sasEndTime` if available
2. **Fallback**: Default to 24-hour period ending at current time
3. **Validation**: Ensure start time is before end time

### Calculation Rules

1. **Movement Calculation (Primary Method)**: Calculate actual movement by comparing first and last meters
   - **Drop Movement**: `lastMeter.movement.drop - firstMeter.movement.drop`
   - **Cancelled Movement**: `lastMeter.movement.totalCancelledCredits - firstMeter.movement.totalCancelledCredits`
   - **Gross Calculation**: `dropMovement - cancelledMovement`
2. **Aggregation Method (Verification)**: Sum all `movement.drop` and `movement.totalCancelledCredits` values within the time period
3. **Zero Handling**: Treat missing or null values as 0
4. **Primary vs Verification**: Use movement calculation as primary, aggregation for verification

### Data Integrity

1. **Machine Validation**: Skip collections without valid `machineId`
2. **Meter Validation**: Skip machines with no meter data in the time period
3. **Update Validation**: Only update collections where meter data was found

## Integration Points

### Related APIs

- **Collection Reports**: `/api/collection-report/[reportId]`
- **Collections**: `/api/collections`
- **Meters**: `/api/metrics/meters`

### Related Components

- **SyncButton**: UI component for triggering sync operations
- **CollectionReportPage**: Page that displays sync results
- **MetersTab**: Tab that shows meter data

## Security Considerations

1. **Authentication**: Requires valid user session
2. **Authorization**: Users must have permission to access collection reports
3. **Input Validation**: Validates report ID before processing
4. **Rate Limiting**: Consider implementing rate limiting for sync operations

## Troubleshooting

### Common Issues

1. **No Updates**: Check if meter data exists for the time period
2. **Slow Performance**: Verify database indexes are in place
3. **Incorrect Calculations**: Validate meter data integrity
4. **Missing Collections**: Ensure collections have valid `machineId` values

### Debug Information

The API provides detailed debug information in the response:

- Number of collections processed
- Number of collections updated
- Individual results for each collection
- Time periods used for calculations

## Future Enhancements

### Planned Features

## Future Enhancements

### Planned Features

1. **Background Processing**: Move sync operations to background jobs
2. **Incremental Sync**: Only sync collections that have changed
3. **Real-time Updates**: WebSocket notifications for sync completion
4. **Bulk Operations**: Sync multiple reports at once
5. **Audit Trail**: Track sync operations in activity logs

### Performance Improvements

1. **Parallel Processing**: Process multiple collections concurrently
2. **Caching**: Cache meter data to reduce database queries
3. **Compression**: Compress large meter datasets
4. **Pagination**: Handle large collections with pagination

---

**Last Updated:** October 15th, 2025

## Troubleshooting

### Common Issues

1. **No Updates**: Check if meter data exists for the time period
2. **Slow Performance**: Verify database indexes are in place
3. **Incorrect Calculations**: Validate meter data integrity
4. **Missing Collections**: Ensure collections have valid `machineId` values

### Debug Information

The API provides detailed debug information in the response:

- Number of collections processed
- Number of collections updated
- Individual results for each collection
- Time periods used for calculations

## Related Documentation

- [Collections API](collections-api.md)
- [Meters API](meters-api.md)
- [Collection Reports](collection-report-implementation-guide.md)
- [Database Relationships](../frontend/database-relationships.md)
