# Pagination Implementation Guide

## Overview
This guide explains how to implement batch-based pagination in the Evolution CMS application. The pattern fetches data in larger batches (50 items) from the backend and displays them in smaller pages (10 items per page) on the frontend.

## Key Concepts

### Batch-Based Pagination Strategy
- **Backend**: Fetches data in batches of 50 items per request
- **Frontend**: Displays 10 items per page (5 pages per batch)
- **Display**: Shows "X of 5" for the current batch, not the total count
- **Fetching**: Only fetches the next batch when crossing batch boundaries (e.g., page 5 → page 6)

### Constants
```typescript
const itemsPerPage = 10;      // Items displayed per page
const itemsPerBatch = 50;     // Items fetched per API call
const pagesPerBatch = 5;      // Pages per batch (50 / 10 = 5)
```

## Implementation Pattern

### 1. Backend API Route

The API should accept `page` and `limit` parameters and return pagination metadata:

```typescript
// app/api/example/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const requestedLimit = parseInt(searchParams.get('limit') || '50');
  const limit = Math.min(requestedLimit, 100); // Cap at 100 for performance
  const skip = (page - 1) * limit;

  // Fetch data with skip/limit
  const data = await Model.find(query).skip(skip).limit(limit).lean();
  const totalCount = await Model.countDocuments(query);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}
```

### 2. Frontend Helper Function

Create a helper function that accepts pagination parameters:

```typescript
// lib/helpers/example.ts
export async function fetchData(
  page: number = 1,
  limit: number = 50,
  filters?: FilterType
): Promise<{ data: DataType[]; pagination: PaginationData }> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  // Add filters...

  const { data } = await axios.get('/api/example', { params });
  return {
    data: data.data || [],
    pagination: data.pagination || { page: 1, limit, total: 0, totalPages: 1 },
  };
}
```

### 3. Component State Management

Set up state for managing batches and pagination:

```typescript
// In your component
const [allItems, setAllItems] = useState<DataType[]>([]);
const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
const [currentPage, setCurrentPage] = useState(0); // 0-indexed
const itemsPerPage = 10;
const itemsPerBatch = 50;
const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5
```

### 4. Batch Calculation Logic

Calculate which batch corresponds to the current page:

```typescript
// Calculate which batch we're in (each batch has 50 items = 5 pages of 10 items)
const calculateBatchNumber = (page: number) => {
  return Math.floor(page / pagesPerBatch) + 1;
};

const currentBatch = calculateBatchNumber(currentPage);
```

### 5. Initial Data Fetch

Fetch the first batch when component mounts or filters change:

```typescript
useEffect(() => {
  // Reset state when filters change
  setLoadedBatches(new Set([1]));
  setCurrentPage(0);
  
  // Fetch first batch
  fetchData(1, itemsPerBatch, filters)
    .then(result => {
      setAllItems(result.data);
      setLoadedBatches(new Set([1]));
    });
}, [filters, selectedLicencee, /* other dependencies */]);
```

### 6. Batch Boundary Detection

Fetch the next batch when crossing batch boundaries:

```typescript
useEffect(() => {
  if (loading || !activeSection) return;

  const currentBatch = calculateBatchNumber(currentPage);
  
  // Check if we're about to cross a batch boundary
  // For 0-indexed: when currentPage is 4 (page 5 in 1-indexed), fetch batch 2
  const needsNextBatch = 
    currentPage > 0 && (currentPage + 1) % pagesPerBatch === 0;
  const nextBatch = currentBatch + 1;

  // Fetch next batch if we're about to cross the boundary and haven't loaded it yet
  if (needsNextBatch && !loadedBatches.has(nextBatch)) {
    setLoadedBatches(prev => new Set([...prev, nextBatch]));
    fetchData(nextBatch, itemsPerBatch, filters)
      .then(result => {
        setAllItems(prev => {
          // Merge new data, avoiding duplicates
          const existingIds = new Set(prev.map(item => item._id));
          const newItems = result.data.filter(
            item => !existingIds.has(item._id)
          );
          return [...prev, ...newItems];
        });
      });
  }

  // Also ensure current batch is loaded
  if (!loadedBatches.has(currentBatch)) {
    setLoadedBatches(prev => new Set([...prev, currentBatch]));
    fetchData(currentBatch, itemsPerBatch, filters)
      .then(result => {
        setAllItems(prev => {
          const existingIds = new Set(prev.map(item => item._id));
          const newItems = result.data.filter(
            item => !existingIds.has(item._id)
          );
          return [...prev, ...newItems];
        });
      });
  }
}, [currentPage, loading, activeSection, loadedBatches, filters]);
```

### 7. Client-Side Pagination

Slice the current batch to show 10 items per page:

```typescript
// Get items for current page from the current batch
const paginatedItems = useMemo(() => {
  // Calculate position within current batch (0-4 for pages 0-4, 0-4 for pages 5-9, etc.)
  const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
  const startIndex = positionInBatch;
  const endIndex = startIndex + itemsPerPage;
  
  return allItems.slice(startIndex, endIndex);
}, [allItems, currentPage, itemsPerPage, pagesPerBatch]);
```

### 8. Total Pages Calculation

Calculate total pages based on the current batch size:

```typescript
const totalPages = useMemo(() => {
  // For the current batch, we always have max 5 pages (50 items / 10 per page)
  // But if we have fewer items than a full batch, calculate based on actual items
  const pagesInCurrentBatch = Math.min(
    pagesPerBatch, // 5
    Math.ceil(allItems.length / itemsPerPage)
  );
  return pagesInCurrentBatch > 0 ? pagesInCurrentBatch : 1;
}, [allItems.length, itemsPerPage, pagesPerBatch]);
```

### 9. Pagination Controls

Use the `PaginationControls` component:

```typescript
import PaginationControls from '@/components/ui/PaginationControls';

<PaginationControls
  currentPage={currentPage}
  totalPages={totalPages}
  setCurrentPage={setCurrentPage}
/>
```

## Complete Example: Cabinets Page Pattern

Reference implementation: `app/cabinets/page.tsx` and `lib/hooks/data/useCabinetSorting.ts`

### Key Features:
1. **Batch Tracking**: Uses `loadedBatches` Set to track which batches have been fetched
2. **Boundary Detection**: Only fetches when crossing from page 4→5, 9→10, etc.
3. **Client-Side Slicing**: Slices the accumulated items array for display
4. **Display Logic**: Shows "X of 5" for current batch, not total pages

### Important Notes:
- Pages are **0-indexed** in state but **1-indexed** in display
- Batch numbers are **1-indexed** (batch 1, batch 2, etc.)
- Always merge new data to avoid duplicates
- Reset batches when filters change
- Only show pagination controls when `totalPages > 0`

## Common Pitfalls to Avoid

1. **Don't fetch on every page change** - Only fetch when crossing batch boundaries
2. **Don't show total count** - Show "X of 5" for current batch, not "X of 100"
3. **Don't forget to reset** - Reset `loadedBatches` and `currentPage` when filters change
4. **Don't duplicate data** - Always check for existing items before merging
5. **Don't forget dependencies** - Include all filter dependencies in useEffect arrays

## Testing Checklist

- [ ] Initial load fetches batch 1
- [ ] Navigating to page 5 fetches batch 2
- [ ] Filter changes reset batches and refetch
- [ ] Pagination shows "X of 5" for current batch
- [ ] No duplicate items in the list
- [ ] Skeleton loader shows during batch fetch
- [ ] Pagination controls are disabled appropriately

