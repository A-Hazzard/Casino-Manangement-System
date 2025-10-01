# MongoDB Connection Pooling Optimization

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 25th, 2025

## Overview

This prompt provides comprehensive MongoDB connection pooling optimization strategies to prevent timeout issues and improve database performance in the Evolution One CMS application.

## Current Issues

### Timeout Problems
- Frontend requests timing out before database operations complete
- Red requests without status codes in network tab
- Database connection pool exhaustion under load
- Slow query performance causing user experience issues

### Performance Bottlenecks
- N+1 query problems in collection reports
- Inefficient aggregation pipelines
- Missing database indexes
- Connection pool misconfiguration

## Connection Pooling Strategy

### 1. Optimize MongoDB Connection Settings

**File:** `lib/middleware/db.ts`

```typescript
// Enhanced connection configuration
const connectionOptions = {
  // Connection timeouts
  connectTimeoutMS: 60000,        // 30s connection timeout
  serverSelectionTimeoutMS: 60000, // 30s server selection
  socketTimeoutMS: 60000,         // 60s socket timeout
  
  // Connection pool settings
  maxPoolSize: 20,                // Maximum connections in pool
  minPoolSize: 5,                 // Minimum connections in pool
  maxIdleTimeMS: 60000,           // Close idle connections after 30s
  maxConnecting: 5,               // Max concurrent connection attempts
  
  // Performance optimizations
  bufferCommands: false,          // Disable command buffering
  heartbeatFrequencyMS: 10000,    // Heartbeat every 10s
  retryWrites: true,              // Retry write operations
  retryReads: true,               // Retry read operations
  waitQueueTimeoutMS: 10000,      // Wait 10s for connection from pool
  
  // Read preferences for better performance
  readPreference: 'secondaryPreferred',
  
  // Compression for network efficiency
  compressors: ['zlib'],
  
  // Connection monitoring
  monitorCommands: process.env.NODE_ENV === 'development',
};
```

### 2. Implement Connection Health Monitoring

**File:** `lib/middleware/connectionMonitor.ts`

```typescript
import mongoose from 'mongoose';

class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    failedConnections: 0,
    lastHealthCheck: new Date(),
  };

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  startMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every 30 seconds
  }

  private async performHealthCheck() {
    try {
      const connection = mongoose.connection;
      
      this.connectionStats = {
        totalConnections: connection.db?.serverConfig?.s?.pool?.totalConnectionCount || 0,
        activeConnections: connection.db?.serverConfig?.s?.pool?.checkedOutConnections || 0,
        idleConnections: connection.db?.serverConfig?.s?.pool?.availableConnections || 0,
        failedConnections: connection.db?.serverConfig?.s?.pool?.failedConnections || 0,
        lastHealthCheck: new Date(),
      };

      // Log connection health
      if (this.connectionStats.activeConnections > 15) {
        console.warn('⚠️ High connection usage detected:', this.connectionStats);
      }

      // Check for connection leaks
      if (this.connectionStats.activeConnections > 18) {
        console.error('🚨 Connection pool near exhaustion!', this.connectionStats);
      }

    } catch (error) {
      console.error('❌ Connection health check failed:', error);
    }
  }

  getStats() {
    return this.connectionStats;
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export default ConnectionMonitor;
```

### 3. Implement Request Queuing and Throttling

**File:** `lib/middleware/requestThrottler.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

class RequestThrottler {
  private static instance: RequestThrottler;
  private requestQueue: Map<string, number> = new Map();
  private readonly maxConcurrentRequests = 10;
  private readonly requestWindowMs = 60000; // 1 minute

  static getInstance(): RequestThrottler {
    if (!RequestThrottler.instance) {
      RequestThrottler.instance = new RequestThrottler();
    }
    return RequestThrottler.instance;
  }

  async throttleRequest(req: NextRequest, endpoint: string): Promise<boolean> {
    const clientId = this.getClientId(req);
    const now = Date.now();
    const key = `${clientId}-${endpoint}`;

    // Clean old entries
    this.cleanOldEntries(now);

    // Check if client is making too many requests
    const clientRequests = Array.from(this.requestQueue.entries())
      .filter(([k]) => k.startsWith(clientId))
      .length;

    if (clientRequests >= this.maxConcurrentRequests) {
      console.warn(`🚫 Throttling request from ${clientId} - too many concurrent requests`);
      return false;
    }

    // Add current request
    this.requestQueue.set(key, now);
    return true;
  }

  private getClientId(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    return ip;
  }

  private cleanOldEntries(now: number) {
    for (const [key, timestamp] of this.requestQueue.entries()) {
      if (now - timestamp > this.requestWindowMs) {
        this.requestQueue.delete(key);
      }
    }
  }
}

export default RequestThrottler;
```

### 4. Optimize Database Queries

**File:** `lib/helpers/optimizedQueries.ts`

```typescript
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';

/**
 * Optimized query for collection reports with machine counts
 * Uses aggregation pipeline instead of N+1 queries
 */
export async function getOptimizedCollectionReports(
  licenceeId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {};
  
  if (startDate && endDate) {
    matchStage.timestamp = { $gte: startDate, $lte: endDate };
  }

  if (licenceeId) {
    matchStage['locationDetails.rel.licencee'] = licenceeId;
  }

  const pipeline = [
    // Match collection reports
    { $match: matchStage },
    
    // Lookup location details
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: '$locationDetails' },
    
    // Lookup collections for machine counts
    {
      $lookup: {
        from: 'collections',
        localField: 'locationReportId',
        foreignField: 'locationReportId',
        as: 'collections',
      },
    },
    
    // Add machine count
    {
      $addFields: {
        machinesCollected: { $size: '$collections' },
      },
    },
    
    // Project final fields
    {
      $project: {
        _id: 1,
        locationReportId: 1,
        locationName: 1,
        timestamp: 1,
        machinesCollected: 1,
        totalDrop: 1,
        totalCancelled: 1,
        totalGross: 1,
        totalSasGross: 1,
        amountCollected: 1,
        amountUncollected: 1,
        partnerProfit: 1,
        taxes: 1,
        advance: 1,
        previousBalance: 1,
        currentBalance: 1,
        balanceCorrection: 1,
        variance: 1,
        varianceReason: 1,
        reasonShortagePayment: 1,
        balanceCorrectionReas: 1,
        collectorName: 1,
        location: 1,
      },
    },
    
    // Sort by timestamp
    { $sort: { timestamp: -1 } },
  ];

  return await CollectionReport.aggregate(pipeline);
}

/**
 * Optimized query for locations with machines
 * Single aggregation instead of N+1 queries
 */
export async function getOptimizedLocationsWithMachines() {
  return await GamingLocations.aggregate([
    {
      $match: {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      },
    },
    {
      $lookup: {
        from: 'machines',
        localField: '_id',
        foreignField: 'gamingLocation',
        as: 'machines',
        pipeline: [
          {
            $match: {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('1970-01-01') } },
              ],
            },
          },
          {
            $project: {
              _id: 1,
              serialNumber: 1,
              'custom.name': 1,
              collectionMeters: 1,
              collectionTime: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        previousCollectionTime: 1,
        profitShare: 1,
        machines: {
          $map: {
            input: '$machines',
            as: 'machine',
            in: {
              _id: '$$machine._id',
              serialNumber: '$$machine.serialNumber',
              name: {
                $ifNull: [
                  '$$machine.custom.name',
                  {
                    $ifNull: ['$$machine.serialNumber', 'Unnamed Machine'],
                  },
                ],
              },
              collectionMeters: {
                $ifNull: [
                  '$$machine.collectionMeters',
                  { metersIn: 0, metersOut: 0 },
                ],
              },
              collectionTime: '$$machine.collectionTime',
            },
          },
        },
      },
    },
  ]);
}
```

### 5. Database Index Optimization

**File:** `scripts/createIndexes.js`

```javascript
// MongoDB indexes for optimal performance
const indexes = [
  // Collection Reports indexes
  { collection: 'collectionreports', index: { timestamp: -1 } },
  { collection: 'collectionreports', index: { locationReportId: 1 } },
  { collection: 'collectionreports', index: { location: 1, timestamp: -1 } },
  
  // Collections indexes
  { collection: 'collections', index: { locationReportId: 1 } },
  { collection: 'collections', index: { machineId: 1 } },
  { collection: 'collections', index: { location: 1 } },
  
  // Machines indexes
  { collection: 'machines', index: { gamingLocation: 1, deletedAt: 1 } },
  { collection: 'machines', index: { serialNumber: 1 } },
  { collection: 'machines', index: { 'custom.name': 1 } },
  
  // Gaming Locations indexes
  { collection: 'gaminglocations', index: { deletedAt: 1 } },
  { collection: 'gaminglocations', index: { 'rel.licencee': 1 } },
  
  // Compound indexes for complex queries
  { 
    collection: 'collectionreports', 
    index: { 
      location: 1, 
      timestamp: -1, 
      'locationDetails.rel.licencee': 1 
    } 
  },
];

// Create indexes
async function createIndexes() {
  for (const { collection, index } of indexes) {
    try {
      await db.collection(collection).createIndex(index);
      console.log(`✅ Created index on ${collection}:`, index);
    } catch (error) {
      console.error(`❌ Failed to create index on ${collection}:`, error);
    }
  }
}
```

### 6. Connection Pool Middleware

**File:** `lib/middleware/connectionPool.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from './db';
import ConnectionMonitor from './connectionMonitor';
import RequestThrottler from './requestThrottler';

export async function withConnectionPool(
  handler: (req: NextRequest) => Promise<NextResponse>,
  endpoint: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Check connection pool health
      const monitor = ConnectionMonitor.getInstance();
      const stats = monitor.getStats();
      
      if (stats.activeConnections > 18) {
        return NextResponse.json(
          { 
            error: 'Server overloaded', 
            message: 'Too many concurrent requests. Please try again later.',
            retryAfter: 30 
          },
          { status: 503 }
        );
      }

      // Throttle requests
      const throttler = RequestThrottler.getInstance();
      const canProceed = await throttler.throttleRequest(req, endpoint);
      
      if (!canProceed) {
        return NextResponse.json(
          { 
            error: 'Rate limited', 
            message: 'Too many requests. Please slow down.',
            retryAfter: 10 
          },
          { status: 429 }
        );
      }

      // Connect to database
      await connectDB();
      
      // Execute handler
      const response = await handler(req);
      
      // Log performance
      const duration = Date.now() - startTime;
      console.log(`✅ ${endpoint} completed in ${duration}ms`);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${endpoint} failed after ${duration}ms:`, error);
      
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          message: 'Unable to connect to database. Please try again.',
          retryAfter: 5 
        },
        { status: 503 }
      );
    }
  };
}
```

## Implementation Steps

### 1. Update Database Configuration
- Replace current connection settings with optimized configuration
- Implement connection health monitoring
- Add request throttling middleware

### 2. Optimize API Routes
- Replace N+1 queries with aggregation pipelines
- Add connection pool middleware to all database routes
- Implement proper error handling and retry logic

### 3. Create Database Indexes
- Run the index creation script
- Monitor query performance
- Add additional indexes based on usage patterns

### 4. Monitor and Adjust
- Set up connection pool monitoring
- Track query performance metrics
- Adjust pool settings based on load patterns

## Expected Results

### Performance Improvements
- **50-80% reduction** in query response times
- **Elimination** of timeout errors
- **Better resource utilization** with connection pooling
- **Improved scalability** under high load

### User Experience
- **Faster page loads** for collection reports
- **No more red requests** in network tab
- **Reliable data fetching** with retry logic
- **Better error messages** for users

## Monitoring and Maintenance

### Key Metrics to Track
- Connection pool utilization
- Query response times
- Error rates and types
- Request throughput

### Regular Maintenance
- Review and optimize slow queries
- Adjust connection pool settings based on load
- Monitor database performance
- Update indexes as needed

This comprehensive connection pooling strategy will resolve your timeout issues and significantly improve database performance.
