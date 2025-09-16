# Manufacturers API Issue - Empty Array Return

## Problem Description
The manufacturers API (`/api/manufacturers`) is returning an empty array instead of the expected manufacturer list. This affects both the create and edit cabinet modals where users should be able to select from existing manufacturers.

## Current Implementation
- **API Endpoint**: `/api/manufacturers`
- **Database Query**: MongoDB aggregation on `machines` collection
- **Fields Checked**: Both `manufacturer` and `manuf` fields
- **Filtering**: Includes machines with `deletedAt: -1`, `null`, or missing `deletedAt`

## Expected Behavior
The API should return a list of unique manufacturer names from the machines collection, such as:
- "People's National Movement"
- "IGT"
- "Aristocrat"
- etc.

## Current Issue
- API returns `[]` (empty array)
- No manufacturers appear in dropdown
- Both create and edit modals affected

## Debugging Steps Needed
1. **Check Database Data**: Verify machines collection has manufacturer data
2. **Test API Directly**: Test the aggregation query in MongoDB
3. **Check Field Names**: Ensure `manufacturer` and `manuf` fields exist in documents
4. **Verify Filtering**: Check if the `deletedAt` filtering is too restrictive
5. **Test with Sample Data**: Create test machines with manufacturer data

## Sample Document Structure
```json
{
  "_id": "68c87d9163d2a5d14d16b50b",
  "manufacturer": "People's National Movement",
  "manuf": "",
  "deletedAt": -1,
  // ... other fields
}
```

## Files to Investigate
- `app/api/manufacturers/route.ts` - Main API endpoint
- `lib/helpers/manufacturers.ts` - Frontend helper
- `components/ui/cabinets/NewCabinetModal.tsx` - Create modal
- `components/ui/cabinets/EditCabinetModal.tsx` - Edit modal

## Next Steps
1. Test the MongoDB aggregation query directly
2. Check if machines collection has manufacturer data
3. Verify the API endpoint is accessible
4. Test with sample data if needed
5. Fix the aggregation pipeline if necessary

## Related Features
- Cabinet creation with manufacturer selection
- Cabinet editing with manufacturer selection
- Manufacturer dropdown population
- Data consistency between `manufacturer` and `manuf` fields
