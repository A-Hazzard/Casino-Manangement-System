# Location API Performance Testing Suite

This directory contains performance testing scripts to benchmark different querying approaches for the locations API and identify the most performant implementation.

## 📋 Test Scripts

### 1. `test-location-queries.js` - Database Query Performance Test

**Purpose**: Tests different database querying techniques directly against MongoDB to compare raw query performance.

**What it tests**:
- ✅ Sequential Processing (old approach - baseline)
- ✅ Parallel Batch Processing with different batch sizes (current implementation)
- ✅ Single Aggregation Pipeline approach
- ✅ Optimized Aggregation with `$facet`

**Requirements**:
- MongoDB connection (uses `MONGO_URI` from `.env`)
- Node.js

**Usage**:
```bash
node scripts/performance/test-location-queries.js
```

**Output Example**:
```
🏆 1. Parallel Batch (size: 20)
   Time: 1234.56ms
   Speedup vs Sequential: 12.5x faster
   Speedup vs Slowest: 1.8x faster

🥈 2. Optimized Aggregation
   Time: 1456.78ms
   Speedup vs Sequential: 10.8x faster
   Speedup vs Slowest: 1.5x faster
```

### 2. `test-location-api.js` - API Endpoint Performance Test

**Purpose**: Tests the actual API endpoint to measure real-world performance including network overhead, authentication, and full request processing.

**What it tests**:
- ⏱️ Total request time (client to server and back)
- 🖥️ Server processing time
- 🌐 Network overhead
- 📊 Performance across different time periods (Today, 7d, 30d)

**Requirements**:
- Next.js dev server running on `http://localhost:3000`
- Node.js
- Optional: Authentication token (for protected endpoints)

**Usage**:
```bash
# Start your Next.js server first
npm run dev

# In another terminal:
node scripts/performance/test-location-api.js

# With authentication:
TEST_AUTH_TOKEN=your-token-here node scripts/performance/test-location-api.js
```

**Output Example**:
```
🏆 Today
   Total Time: 1234.56ms
   Server Time: 980.23ms
   Network: 254.33ms
   Locations: 45

💡 PERFORMANCE INSIGHTS:
• Server Processing: 79.4% of total time
• Network Overhead: 20.6% of total time
```

## 🎯 Configuration

Both scripts can be configured by editing the `CONFIG` object at the top of each file:

### `test-location-queries.js`:
```javascript
const CONFIG = {
  TEST_LOCATION_COUNT: 20,    // Number of locations to test
  TEST_ITERATIONS: 3,          // Iterations per test
  BATCH_SIZES: [5, 10, 20, 30, 50], // Batch sizes to test
  TIME_PERIOD: 'Today',        // Time period for queries
};
```

### `test-location-api.js`:
```javascript
const CONFIG = {
  API_URL: 'http://localhost:3000',
  TEST_ITERATIONS: 5,
  TIME_PERIODS: ['Today', '7d', '30d'],
  AUTH_TOKEN: '',              // Optional auth token
};
```

## 📊 Understanding the Results

### Metrics Explained

**Total Time**: Complete request time from start to finish
**Server Time**: Time spent processing on the server (from performance.totalTime)
**Network Overhead**: Difference between total and server time
**Avg/Location**: Average processing time per location
**Throughput**: Number of locations processed per second
**Speedup**: How much faster compared to baseline

### Performance Targets

| Metric | Excellent | Good | Needs Work |
|--------|-----------|------|------------|
| Avg Time/Location | < 10ms | 10-20ms | > 20ms |
| Throughput | > 100/sec | 50-100/sec | < 50/sec |
| Network Overhead | < 20% | 20-30% | > 30% |

## 🚀 How to Use Results

### 1. Identify Bottlenecks

Look at the breakdown to see where time is spent:
```
Breakdown:
  🔌 DB Connection:      45ms (3.6%)
  🔐 Authentication:     23ms (1.9%)
  📍 Fetch Locations:    156ms (12.6%)
  ⚙️  Process Locations:  890ms (72.1%)  ← Main bottleneck
```

### 2. Choose Optimal Batch Size

If parallel batching is fastest, use the recommended batch size:
```
✅ OPTIMAL BATCH SIZE: Parallel Batch (size: 20)
   Average Time: 1234.56ms
```

Update in `app/api/reports/locations/route.ts`:
```typescript
const BATCH_SIZE = 20; // Use optimal size from tests
```

### 3. Consider Alternative Approaches

If aggregation pipeline is faster:
```
✅ FASTEST METHOD: Single Aggregation Pipeline
   Performance Gain: 2.5x faster than current method
```

Consider refactoring the API to use the aggregation approach.

## 📈 Performance Optimization Tips

Based on test results, you might want to:

### If Database Queries are Slow:
1. ✅ Ensure all indexes are created (see `scripts/migrations/add-performance-indexes.js`)
2. 🔍 Check index usage with `.explain("executionStats")`
3. 📊 Consider using aggregation pipelines
4. 🔄 Increase batch size if using parallel processing

### If Network is Slow:
1. 📦 Enable response compression
2. ✂️ Reduce response payload (use pagination)
3. 🗜️ Remove unnecessary fields from response
4. 🌐 Use CDN for static assets

### If Processing is Slow:
1. ⚡ Use parallel processing (already implemented)
2. 🔄 Optimize batch size
3. 💾 Add caching layer (Redis)
4. 📉 Reduce data processing in API

## 🔧 Troubleshooting

### "Cannot connect to database"
- Check `MONGO_URI` in `.env`
- Ensure MongoDB is accessible
- Verify network connection

### "Cannot connect to server"
- Make sure Next.js dev server is running: `npm run dev`
- Check API_URL is correct (default: `http://localhost:3000`)
- Verify port 3000 is not blocked

### "Unauthorized" errors
- Set `TEST_AUTH_TOKEN` environment variable
- Get token from browser DevTools → Application → Cookies
- Or skip authentication if testing public endpoints

### Tests are very slow
- Reduce `TEST_LOCATION_COUNT`
- Reduce `TEST_ITERATIONS`
- Test with fewer batch sizes
- Check database performance

## 📝 Example Session

```bash
# 1. Add database indexes (if not already done)
node scripts/migrations/add-performance-indexes.js

# 2. Test database query performance
node scripts/performance/test-location-queries.js

# 3. Start your dev server
npm run dev

# 4. In another terminal, test API performance
node scripts/performance/test-location-api.js

# 5. Review results and implement recommendations
```

## 🎯 Next Steps

After running tests:

1. **Review Performance Summary**: Check which method is fastest
2. **Implement Recommendations**: Update `BATCH_SIZE` or refactor to aggregation
3. **Monitor Production**: Use the performance metrics in API response
4. **Iterate**: Re-run tests after changes to verify improvements

## 📚 Related Files

- `app/api/reports/locations/route.ts` - Main API implementation
- `scripts/migrations/add-performance-indexes.js` - Database indexes
- `scripts/migrations/PERFORMANCE_OPTIMIZATION.md` - Optimization guide

---

**Pro Tip**: Run these tests regularly as your database grows to ensure performance remains optimal! 📊

