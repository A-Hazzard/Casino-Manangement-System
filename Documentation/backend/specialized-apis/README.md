# Specialized APIs

This directory contains documentation for specialized API endpoints that handle advanced functionality and system integrations.

## APIs in This Directory

### 🔄 Meter Synchronization
**[sync-meters-api.md](./sync-meters-api.md)** - Meter data synchronization and validation

**Key Endpoints:**
- `POST /api/sync/meters` - Synchronize meter data
- `GET /api/sync/status` - Synchronization status
- `POST /api/sync/validate` - Validate synchronized data
- `GET /api/sync/history` - Synchronization history

### 🏢 Location-Machine Relationships
**[locations-machines-api.md](./locations-machines-api.md)** - Advanced location and machine relationship management

**Key Endpoints:**
- `GET /api/locations/[id]/machines` - Machines for specific location
- `POST /api/locations/[id]/machines` - Assign machines to location
- `DELETE /api/locations/[id]/machines/[machineId]` - Remove machine from location
- `GET /api/locations/machines/bulk` - Bulk location-machine operations

## Specialized Features

### Data Synchronization
- Real-time meter data syncing
- Validation and integrity checking
- Conflict resolution
- Synchronization status tracking

### Relationship Management
- Complex location-machine associations
- Bulk operations support
- Relationship validation
- Hierarchical data management

## Common Patterns

### Synchronization Operations
- Asynchronous processing
- Progress tracking
- Error handling and retry logic
- Data consistency validation

### Bulk Operations
- Batch processing capabilities
- Transaction safety
- Rollback support
- Performance optimization

## Related Documentation

- **[Business APIs](../business-apis/)** - Core location and machine APIs
- **[Analytics APIs](../analytics-apis/)** - Data validation and reporting
- **[Database Models](../../../database-models.md)** - Relationship schema