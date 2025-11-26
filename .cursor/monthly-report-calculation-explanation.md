# Monthly Report Calculation - High Level Overview

## How It Works

The monthly report aggregates data from the `collectionreports` collection to show financial summaries and details by location.

### Data Source

- **Collection**: `collectionreports`
- **Key Fields Used**:
  - `timestamp`: Date filter for the report period
  - `locationName`: String field containing the location name (used for grouping)
  - `location`: ObjectId reference to `gaminglocations` collection
  - `totalDrop`: Sum of money dropped
  - `totalCancelled`: Sum of cancelled credits (win)
  - `totalGross`: Total gross revenue
  - `totalSasGross`: Total SAS gross revenue

### Calculation Flow

#### 1. Summary Calculation (`getMonthlyCollectionReportSummary`)

- **Purpose**: Calculate totals across all locations (or filtered location)
- **Process**:
  1. Match collection reports by date range (`timestamp` between startDate and endDate)
  2. Optionally filter by `locationName` (exact string match)
  3. If licensee filter is provided:
     - Join with `gaminglocations` collection using `location` field
     - Filter by `locationDetails.rel.licencee` matching the licensee
  4. Sum all matching records:
     - `drop` = sum of `totalDrop`
     - `cancelledCredits` = sum of `totalCancelled`
     - `gross` = sum of `totalGross`
     - `sasGross` = sum of `totalSasGross`
  5. Format numbers (show decimals only if significant)

#### 2. Details Calculation (`getMonthlyCollectionReportByLocation`)

- **Purpose**: Show breakdown by location
- **Process**:
  1. Same matching and filtering as summary
  2. Group by `locationName` (the `_id` in the group stage)
  3. Sum totals per location
  4. Sort alphabetically by location name
  5. Return array of location summaries

### Key Filtering Logic

```typescript
// Date filter (always applied)
match.timestamp = { $gte: startDate, $lte: endDate }

// Location name filter (if provided)
if (locationName) {
  match.locationName = locationName; // EXACT STRING MATCH
}

// Licensee filter (if provided)
if (licencee) {
  // Join with gaminglocations
  $lookup: {
    from: "gaminglocations",
    localField: "location",      // ObjectId in collectionreports
    foreignField: "_id",          // _id in gaminglocations
    as: "locationDetails"
  }
  // Filter by licensee
  $match: { "locationDetails.rel.licencee": licencee }
}
```

## Why "d'fastlime" Might Not Be Showing

### Potential Issues:

1. **Exact String Match Required**
   - The `locationName` field in `collectionreports` must match EXACTLY
   - Case-sensitive: "D'Fastlime" ≠ "d'fastlime" ≠ "D'fastlime"
   - Check what's actually stored in the database

2. **No Collection Reports in Date Range**
   - The location must have collection reports with `timestamp` in the selected date range
   - Check if collection reports exist for this location in the period

3. **Licensee Filter Mismatch**
   - If a licensee is selected, the location must belong to that licensee
   - The `gaminglocations` record must have `rel.licencee` matching the selected licensee
   - The `location` ObjectId in `collectionreports` must match a `gaminglocations._id`

4. **Location Name Mismatch**
   - The `locationName` string in `collectionreports` might not match the location name in `gaminglocations`
   - These are stored separately and can get out of sync

5. **User Permissions**
   - The API filters locations by user permissions
   - If the user doesn't have access to this location, it won't appear in the location dropdown
   - Even if data exists, it won't be shown if the user can't access the location

### Debugging Steps:

1. **Check Collection Reports Exist**:

   ```javascript
   db.collectionreports.find({
     locationName: /fastlime/i, // Case-insensitive search
     timestamp: { $gte: startDate, $lte: endDate },
   });
   ```

2. **Check Location Name Variations**:

   ```javascript
   db.collectionreports.distinct('locationName', {
     locationName: /fastlime/i,
   });
   ```

3. **Check Location in Gaming Locations**:

   ```javascript
   db.gaminglocations.find({
     name: /fastlime/i,
   });
   ```

4. **Check Licensee Assignment**:

   ```javascript
   // Find the location
   const loc = db.gaminglocations.findOne({ name: /fastlime/i });
   // Check its licensee
   loc.rel.licencee;
   ```

5. **Check Collection Reports Location Reference**:
   ```javascript
   // Find collection reports for this location
   db.collectionreports.find({
     location: ObjectId('b928b07b8164f0a4b22c70d5'), // D'Fastlime location ID
   });
   ```

### Common Issues:

- **Case Sensitivity**: Location name stored as "D'Fastlime" but searching for "d'fastlime"
- **Special Characters**: Apostrophe in name might cause matching issues
- **Data Sync**: `locationName` in collectionreports doesn't match `name` in gaminglocations
- **Date Range**: No collection reports in the selected date range
- **Licensee Mismatch**: Location belongs to different licensee than selected
