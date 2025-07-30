# MongoDB Machine Search by Licensee - ChatGPT Prompt

## Context
I have a gaming management system with the following MongoDB collections and relationships:

### Database Schema:
1. **`licencees`** collection - Contains licensee information
2. **`gaminglocations`** collection - Contains locations with `rel.licencee` field referencing licensee
3. **`machines`** collection - Contains machines with `gamingLocation` field referencing location
4. **`meters`** collection - Contains meter readings with `machine` field referencing machine serial number

### Relationships:
- Licensee → owns → Gaming Locations (via `rel.licencee`)
- Gaming Location → contains → Machines (via `gamingLocation`)
- Machine → has → Meters (via `machine` field)

## Requirements

Create a MongoDB shell command that:

1. **Input Parameters:**
   - `serialNumber` (const) - Machine serial number to search for
   - `date` (const) - Date filter: "today", "yesterday", "last7days"

2. **Functionality:**
   - Search for a machine by its serial number
   - Filter results by licensee (ensure machine belongs to licensee's locations)
   - Filter meters by the specified date range
   - Convert date strings to actual date filtering

3. **Date Conversion Logic:**
   - "today" → Current date (00:00:00 to 23:59:59)
   - "yesterday" → Previous day (00:00:00 to 23:59:59)
   - "last7days" → Last 7 days from today

## Expected Output

The command should return:
- Machine details (serial number, location, status, etc.)
- Associated meter readings for the specified date range
- Confirmation that the machine belongs to the specified licensee

## Technical Requirements

1. **Use MongoDB aggregation pipeline**
2. **Handle date conversion properly**
3. **Include proper error handling for invalid inputs**
4. **Use efficient indexing (consider existing indexes)**
5. **Return structured data with machine and meter information**

## Example Usage:
```javascript
const serialNumber = "MACHINE123";
const date = "today"; // or "yesterday" or "last7days"
```

## Database Indexes Available:
- `gaminglocations`: `{ "rel.licencee": 1, deletedAt: 1 }`
- `machines`: `{ gamingLocation: 1, deletedAt: 1 }`
- `meters`: `{ location: 1, createdAt: 1 }`, `{ machine: 1, readAt: 1 }`

## Additional Notes:
- Consider soft deletes (`deletedAt` field)
- Handle timezone considerations
- Include proper field projections for performance
- Consider pagination if results are large

Please create a complete MongoDB shell command that accomplishes this task efficiently. 