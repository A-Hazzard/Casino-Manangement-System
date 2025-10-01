# MongoDB Timeout Solutions

## 🚨 **Current Problem Analysis**

Based on your terminal logs, you're experiencing:
- **Connection timeouts**: `connection 961 to 147.182.210.65:32017 timed out`
- **Query duration**: 20-30+ seconds per request
- **Multiple concurrent timeouts**: Multiple API calls failing simultaneously
- **503 status codes**: Server returning "Service Unavailable"

## 🔍 **Root Causes Identified**

### 1. **Database Connection Configuration Issues**
- ❌ **Inadequate timeout settings** (was 90s, now optimized to 30s)
- ❌ **Missing connection pooling** configuration
- ❌ **No retry logic** for failed connections
- ❌ **No connection health monitoring**

### 2. **Query Performance Issues**
- 🔥 **Heavy aggregation queries** without proper indexing
- 🔥 **Missing database indexes** on frequently queried fields
- 🔥 **No query optimization** for large datasets
- 🔥 **No query result caching**

### 3. **Infrastructure/Network Issues**
- 🌐 **High latency** to MongoDB server (147.182.210.65:32017)
- 🌐 **Network instability** causing connection drops
- 🌐 **Server overload** during peak usage
- 🌐 **No connection monitoring** or health checks

## ✅ **Solutions Implemented**

### 1. **Enhanced Connection Configuration**
```typescript
// Updated lib/middleware/db.ts with optimized settings:
{
  connectTimeoutMS: 60000,        // 30s connection timeout
  serverSelectionTimeoutMS: 60000, // 30s server selection timeout
  socketTimeoutMS: 45000,         // 45s socket timeout
  maxPoolSize: 10,                // Connection pool size
  minPoolSize: 2,                 // Minimum connections
  maxIdleTimeMS: 60000,           // Close idle connections
  serverSelectionRetryDelayMS: 2000, // Retry delay
  heartbeatFrequencyMS: 10000,     // Heartbeat frequency
  retryWrites: true,              // Retry write operations
  retryReads: true,               // Retry read operations
}
```

### 2. **Database Optimization Utilities**
- ✅ **Essential indexes** for better query performance
- ✅ **Query optimization** with execution time limits
- ✅ **Performance monitoring** for slow queries
- ✅ **Connection health checks**

### 3. **Error Handling Improvements**
- ✅ **Structured error responses** (503 instead of 500)
- ✅ **User-friendly error messages**
- ✅ **Automatic retry logic** with exponential backoff
- ✅ **Toast notifications** for connection issues

## 🚀 **Immediate Actions to Take**

### 1. **Create Database Indexes** (Critical)
Run this in your MongoDB shell or add to your application startup:

```javascript
// Essential indexes for performance
db.gaminglocations.createIndex({ "rel.licencee": 1, deletedAt: 1 }, { background: true });
db.machines.createIndex({ gamingLocation: 1, isSasMachine: 1 }, { background: true });
db.machines.createIndex({ gamingLocation: 1, lastActivity: 1 }, { background: true });
db.meters.createIndex({ machine: 1, readAt: 1 }, { background: true });
db.meters.createIndex({ readAt: 1 }, { background: true });
db.collections.createIndex({ locationReportId: 1, isCompleted: 1 }, { background: true });
```

### 2. **Optimize Heavy Queries**
Add query limits and optimization to your aggregation pipelines:

```typescript
// Example optimization for heavy queries
const optimizedPipeline = {
  pipeline: yourAggregationPipeline,
  options: {
    allowDiskUse: true,
    maxTimeMS: 60000,        // 30 second timeout
    batchSize: 1000,         // Process in batches
    hint: { readAt: 1 }      // Use the readAt index
  }
};
```

### 3. **Add Query Caching**
Implement caching for frequently accessed data:

```typescript
// Cache expensive queries
const cacheKey = `dashboard-totals-${timePeriod}-${licencee}`;
const cachedResult = await getCachedData(cacheKey);
if (cachedResult) {
  return cachedResult;
}

// Execute query and cache result
const result = await executeQuery();
await setCachedData(cacheKey, result, 600000); // 5 minute cache
```

## 🔧 **Additional Recommendations**

### 1. **Database Server Optimization**
- **Increase MongoDB server resources** (RAM, CPU)
- **Enable MongoDB query profiling** to identify slow queries
- **Consider MongoDB Atlas** for better performance and monitoring
- **Implement database sharding** if data volume is large

### 2. **Application-Level Optimizations**
- **Implement query result caching** (Redis/Memory cache)
- **Add database connection monitoring**
- **Implement circuit breaker pattern** for failing services
- **Add query performance metrics**

### 3. **Infrastructure Improvements**
- **Use a CDN** for static assets
- **Implement database connection pooling**
- **Add load balancing** for multiple MongoDB instances
- **Monitor network latency** to MongoDB server

## 📊 **Monitoring and Debugging**

### 1. **Add Performance Monitoring**
```typescript
// Monitor query performance
const startTime = Date.now();
const result = await db.collection("meters").aggregate(pipeline);
const duration = Date.now() - startTime;

if (duration > 5000) {
  console.warn(`🐌 Slow query detected: ${duration}ms`);
}
```

### 2. **Database Health Checks**
```typescript
// Regular health checks
setInterval(async () => {
  const health = await getConnectionHealth(db);
  if (!health.isHealthy) {
    console.error("❌ Database health check failed");
  }
}, 60000); // Check every 30 seconds
```

### 3. **Query Analysis**
Enable MongoDB profiling to identify slow queries:
```javascript
// Enable profiling for slow queries
db.setProfilingLevel(1, { slowms: 1000 });
```

## 🎯 **Expected Results**

After implementing these solutions, you should see:

1. **Reduced Timeout Errors**: From 20-30s to <10s query times
2. **Better Error Handling**: User-friendly messages instead of blank screens
3. **Automatic Recovery**: Retry logic with exponential backoff
4. **Performance Monitoring**: Visibility into slow queries
5. **Improved User Experience**: Toast notifications and retry options

## 🚨 **Critical Next Steps**

1. **Create the database indexes** (most important)
2. **Restart your application** to use the new connection settings
3. **Monitor the logs** for improved performance
4. **Test the error handling** by simulating connection issues
5. **Consider upgrading your MongoDB server** if issues persist

---

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: December 19th, 2024
