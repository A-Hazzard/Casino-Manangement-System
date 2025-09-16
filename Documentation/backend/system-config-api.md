# System Configuration API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025  
**Version:** 2.0.0

## Quick Search Guide

- **Countries**: `GET /api/countries` - Country information and regulations
- **Firmwares**: `GET /api/firmwares` - Firmware management and versions
- **Licensees**: `GET /api/licensees` - Licensee information and compliance
- **Gaming Locations**: `GET /api/gaming-locations` - Gaming location configuration
- **File Upload**: `POST /api/firmwares` - Firmware file upload
- **Migration**: `POST /api/firmwares/migrate` - Firmware migration

## Overview

The System Configuration API manages core system settings including countries, firmware management, licensee information, and gaming location configurations. This comprehensive system provides centralized management of all system-wide settings and configurations.

### System Architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication
- **File Storage**: GridFS for firmware files
- **Security**: File upload validation and checksum verification

## Countries Endpoints

### GET `/api/countries`
**Purpose**: Retrieves country information for licensing and regional configurations

**Query Parameters:**
- `active` - Filter by active status
- `region` - Filter by region
- `licenseRequired` - Filter by license requirement

**Response Fields:**
```json
{
  "countries": [
    {
      "_id": "string",
      "name": "United States",           // Country name
      "code": "US",                     // ISO country code
      "region": "North America",        // Geographic region
      "active": true,                   // Active status
      "licenseRequired": true,          // License requirement flag
      "currency": "USD",                // Currency code
      "timezone": "America/New_York",   // Timezone
      "regulations": {
        "maxBet": 1000,                 // Maximum bet amount
        "maxPayout": 50000,             // Maximum payout amount
        "ageRequirement": 21            // Age requirement
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

### POST `/api/countries`
**Purpose**: Creates a new country configuration

**Request Fields:**
```json
{
  "name": "Canada",
  "code": "CA",
  "region": "North America",
  "active": true,
  "licenseRequired": true,
  "currency": "CAD",
  "timezone": "America/Toronto",
  "regulations": {
    "maxBet": 1000,
    "maxPayout": 50000,
    "ageRequirement": 19
  }
}
```

### PUT `/api/countries/[id]`
**Purpose**: Updates country configuration

**Request Fields:**
```json
{
  "active": false,
  "regulations": {
    "maxBet": 2000,
    "maxPayout": 75000,
    "ageRequirement": 21
  }
}
```

## Firmwares Endpoints

### GET `/api/firmwares`
**Purpose**: Retrieves firmware information for gaming machines

**Query Parameters:**
- `active` - Filter by active status
- `machineType` - Filter by machine type
- `version` - Filter by version number
- `locationId` - Filter by location

**Response Fields:**
```json
{
  "firmwares": [
    {
      "_id": "string",
      "name": "Slot Machine Firmware v2.1",
      "version": "2.1.0",              // Firmware version
      "machineType": "slot",            // Target machine type
      "active": true,                   // Active status
      "fileSize": 5242880,             // File size in bytes
      "checksum": "sha256:abc123...",   // File checksum
      "downloadUrl": "https://example.com/firmware/v2.1.0.bin",
      "releaseNotes": "Bug fixes and performance improvements",
      "compatibility": ["machine_model_1", "machine_model_2"], // Compatible models
      "uploadedBy": "admin@example.com", // Uploader email
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "installedCount": 150             // Number of installations
    }
  ],
  "total": 25
}
```

### POST `/api/firmwares`
**Purpose**: Uploads new firmware

**Request Body:** (multipart/form-data)
- `file` - Firmware binary file
- `name` - Firmware name
- `version` - Version number
- `machineType` - Target machine type
- `releaseNotes` - Release notes
- `compatibility` - Array of compatible machine models

**Response Fields:**
```json
{
  "success": true,
  "firmware": {
    "_id": "string",
    "name": "Slot Machine Firmware v2.2",
    "version": "2.2.0",
    "fileSize": 5242880,
    "downloadUrl": "https://example.com/firmware/v2.2.0.bin"
  }
}
```

### POST `/api/firmwares/migrate`
**Purpose**: Initiates firmware migration for machines

**Request Fields:**
```json
{
  "firmwareId": "string",              // Firmware to install
  "machineIds": ["machine1", "machine2"], // Target machines
  "locationId": "string",              // Target location
  "scheduledAt": "2024-01-01T02:00:00.000Z" // Migration schedule
}
```

## Licensees Endpoints

### GET `/api/licensees`
**Purpose**: Retrieves licensee information

**Query Parameters:**
- `active` - Filter by active status
- `country` - Filter by country
- `licenseType` - Filter by license type
- `expiresBefore` - Filter by expiration date

**Response Fields:**
```json
{
  "licensees": [
    {
      "_id": "string",
      "name": "ABC Gaming Corporation",
      "licenseNumber": "LIC-2024-001",  // License number
      "licenseType": "casino",          // License type
      "country": "US",                  // Country code
      "state": "Nevada",                // State/Province
      "active": true,                   // Active status
      "contactInfo": {
        "email": "contact@abcgaming.com",
        "phone": "+1-555-0123",
        "address": "123 Gaming St, Las Vegas, NV 89101"
      },
      "licenseDetails": {
        "issuedDate": "2024-01-01T00:00:00.000Z",
        "expiryDate": "2025-01-01T00:00:00.000Z",
        "maxMachines": 1000,            // Maximum machines allowed
        "maxLocations": 10              // Maximum locations allowed
      },
      "compliance": {
        "lastAudit": "2024-01-01T00:00:00.000Z",
        "auditScore": 95,               // Compliance audit score
        "violations": []                // List of violations
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

### POST `/api/licensees`
**Purpose**: Creates new licensee

**Request Fields:**
```json
{
  "name": "XYZ Gaming LLC",
  "licenseType": "casino",
  "country": "US",
  "state": "New Jersey",
  "contactInfo": {
    "email": "contact@xyzgaming.com",
    "phone": "+1-555-0456",
    "address": "456 Casino Ave, Atlantic City, NJ 08401"
  },
  "licenseDetails": {
    "issuedDate": "2024-01-01T00:00:00.000Z",
    "expiryDate": "2025-01-01T00:00:00.000Z",
    "maxMachines": 500,
    "maxLocations": 5
  }
}
```

## Gaming Locations Endpoints

### GET `/api/gaming-locations`
**Purpose**: Retrieves gaming location information

**Query Parameters:**
- `active` - Filter by active status
- `licenseeId` - Filter by licensee
- `country` - Filter by country
- `state` - Filter by state

**Response Fields:**
```json
{
  "locations": [
    {
      "_id": "string",
      "name": "Main Street Casino",
      "licenseeId": "string",           // Licensee identifier
      "licenseeName": "ABC Gaming Corporation",
      "active": true,                   // Active status
      "address": {
        "street": "123 Main St",
        "city": "Las Vegas",
        "state": "NV",
        "zipCode": "89101",
        "country": "US"
      },
      "contactInfo": {
        "email": "info@mainstreetcasino.com",
        "phone": "+1-555-0789",
        "manager": "John Smith"         // Location manager
      },
      "capacity": {
        "maxMachines": 200,             // Maximum machines allowed
        "currentMachines": 150,         // Current machine count
        "maxPatrons": 1000              // Maximum patron capacity
      },
      "hours": {
        "open": "09:00",                // Opening time
        "close": "03:00",               // Closing time
        "timezone": "America/Los_Angeles" // Location timezone
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25
}
```

### POST `/api/gaming-locations`
**Purpose**: Creates new gaming location

**Request Fields:**
```json
{
  "name": "Downtown Gaming Center",
  "licenseeId": "string",
  "address": {
    "street": "456 Downtown Blvd",
    "city": "Las Vegas",
    "state": "NV",
    "zipCode": "89102",
    "country": "US"
  },
  "contactInfo": {
    "email": "info@downtowngaming.com",
    "phone": "+1-555-0321",
    "manager": "Jane Doe"
  },
  "capacity": {
    "maxMachines": 100,
    "maxPatrons": 500
  },
  "hours": {
    "open": "10:00",
    "close": "02:00",
    "timezone": "America/Los_Angeles"
  }
}
```

## Data Models

### Country Model
**Database Fields:**
```typescript
{
  _id: string;                          // Country identifier
  name: string;                         // Country name
  code: string;                         // ISO country code
  region: string;                       // Geographic region
  active: boolean;                      // Active status
  licenseRequired: boolean;             // License requirement flag
  currency: string;                     // Currency code
  timezone: string;                     // Timezone identifier
  regulations: {
    maxBet: number;                     // Maximum bet amount
    maxPayout: number;                  // Maximum payout amount
    ageRequirement: number;             // Age requirement
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Firmware Model
**Database Fields:**
```typescript
{
  _id: string;                          // Firmware identifier
  name: string;                         // Firmware name
  version: string;                      // Version number
  machineType: string;                  // Target machine type
  active: boolean;                      // Active status
  fileSize: number;                     // File size in bytes
  checksum: string;                     // File checksum
  downloadUrl: string;                  // Download URL
  releaseNotes: string;                 // Release notes
  compatibility: string[];              // Compatible machine models
  uploadedBy: string;                   // Uploader identifier
  uploadedAt: Date;                     // Upload timestamp
  installedCount: number;               // Installation count
  createdAt: Date;
  updatedAt: Date;
}
```

### Licensee Model
**Database Fields:**
```typescript
{
  _id: string;                          // Licensee identifier
  name: string;                         // Licensee name
  licenseNumber: string;                // License number
  licenseType: string;                  // License type
  country: string;                      // Country code
  state: string;                        // State/Province
  active: boolean;                      // Active status
  contactInfo: {
    email: string;                      // Contact email
    phone: string;                      // Contact phone
    address: string;                    // Contact address
  };
  licenseDetails: {
    issuedDate: Date;                   // License issue date
    expiryDate: Date;                   // License expiry date
    maxMachines: number;                // Maximum machines allowed
    maxLocations: number;               // Maximum locations allowed
  };
  compliance: {
    lastAudit: Date;                    // Last audit date
    auditScore: number;                 // Audit score
    violations: string[];               // List of violations
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### GamingLocation Model
**Database Fields:**
```typescript
{
  _id: string;                          // Location identifier
  name: string;                         // Location name
  licenseeId: string;                   // Licensee reference
  active: boolean;                      // Active status
  address: {
    street: string;                     // Street address
    city: string;                       // City
    state: string;                      // State/Province
    zipCode: string;                    // ZIP/Postal code
    country: string;                    // Country code
  };
  contactInfo: {
    email: string;                      // Contact email
    phone: string;                      // Contact phone
    manager: string;                    // Location manager
  };
  capacity: {
    maxMachines: number;                // Maximum machines
    currentMachines: number;            // Current machine count
    maxPatrons: number;                 // Maximum patron capacity
  };
  hours: {
    open: string;                       // Opening time
    close: string;                      // Closing time
    timezone: string;                   // Timezone
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Business Rules

### Country Management
1. **Regional Compliance**: Country-specific gaming regulations and requirements
2. **Currency Support**: Multi-currency support for different regions
3. **Timezone Management**: Automatic timezone handling for global operations
4. **License Requirements**: Automatic license requirement enforcement

### Firmware Management
1. **Version Control**: Comprehensive version tracking and management
2. **Compatibility Checking**: Automatic compatibility validation
3. **Secure Distribution**: Secure firmware distribution with checksum verification
4. **Rollback Support**: Firmware rollback capabilities for failed updates
5. **Installation Tracking**: Real-time installation status tracking

### Licensee Management
1. **License Tracking**: Comprehensive license lifecycle management
2. **Compliance Monitoring**: Automated compliance checking and reporting
3. **Contact Management**: Centralized contact information management
4. **Capacity Planning**: License-based capacity planning and enforcement

### Location Management
1. **Capacity Management**: Real-time capacity monitoring and planning
2. **Operating Hours**: Flexible operating hours configuration
3. **Contact Information**: Centralized location contact management
4. **Address Management**: Structured address data for reporting

## Financial Calculations

### Capacity Calculations
```
Machine Utilization = Current Machines / Max Machines × 100
Patron Utilization = Current Patrons / Max Patrons × 100
License Utilization = Current Machines / License Max Machines × 100
```

### Compliance Calculations
```
Compliance Score = (Total Requirements - Violations) / Total Requirements × 100
License Days Remaining = Expiry Date - Current Date
Audit Frequency = Last Audit Date + Audit Interval
```

### Firmware Calculations
```
Installation Rate = Installed Count / Target Machines × 100
File Size MB = File Size Bytes / (1024 × 1024)
Checksum Verification = Calculated Checksum === Stored Checksum
```

## Security Features

### Authentication
- JWT tokens required for all endpoints
- Role-based access control
- Session management with proper expiration

### Authorization
- Different access levels for different operations
- Resource-level permissions
- Location-based access restrictions

### Data Protection
- Input sanitization and validation
- SQL injection prevention
- XSS protection
- CSRF protection

### File Upload Security
- Secure firmware file upload with validation
- File type validation
- Checksum verification
- Virus scanning integration

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Query optimization for complex aggregations
- Connection pooling for efficient database access

### Caching Strategy
- Configuration data cached for improved performance
- Response caching with appropriate headers
- Client-side caching strategies

### File Storage
- Efficient firmware file storage using GridFS
- File compression for large firmware files
- CDN integration for firmware distribution

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (Invalid request parameters)
- `401`: Unauthorized (Authentication required)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `409`: Conflict (Resource conflict)
- `422`: Validation Error
- `500`: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly message",
  "code": "ERROR_CODE"
}
```

## API Usage Examples

### Creating a New Country
```typescript
const response = await axios.post('/api/countries', {
  name: 'Canada',
  code: 'CA',
  region: 'North America',
  active: true,
  licenseRequired: true,
  currency: 'CAD',
  timezone: 'America/Toronto',
  regulations: {
    maxBet: 1000,
    maxPayout: 50000,
    ageRequirement: 19
  }
}, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Uploading Firmware
```typescript
const formData = new FormData();
formData.append('file', firmwareFile);
formData.append('name', 'Slot Machine Firmware v2.2');
formData.append('version', '2.2.0');
formData.append('machineType', 'slot');
formData.append('releaseNotes', 'Bug fixes and performance improvements');

const response = await axios.post('/api/firmwares', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

### Creating a Licensee
```typescript
const response = await axios.post('/api/licensees', {
  name: 'XYZ Gaming LLC',
  licenseType: 'casino',
  country: 'US',
  state: 'New Jersey',
  contactInfo: {
    email: 'contact@xyzgaming.com',
    phone: '+1-555-0456',
    address: '456 Casino Ave, Atlantic City, NJ 08401'
  },
  licenseDetails: {
    issuedDate: '2024-01-01T00:00:00.000Z',
    expiryDate: '2025-01-01T00:00:00.000Z',
    maxMachines: 500,
    maxLocations: 5
  }
}, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Creating a Gaming Location
```typescript
const response = await axios.post('/api/gaming-locations', {
  name: 'Downtown Gaming Center',
  licenseeId: 'licensee123',
  address: {
    street: '456 Downtown Blvd',
    city: 'Las Vegas',
    state: 'NV',
    zipCode: '89102',
    country: 'US'
  },
  contactInfo: {
    email: 'info@downtowngaming.com',
    phone: '+1-555-0321',
    manager: 'Jane Doe'
  },
  capacity: {
    maxMachines: 100,
    maxPatrons: 500
  },
  hours: {
    open: '10:00',
    close: '02:00',
    timezone: 'America/Los_Angeles'
  }
}, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

**Last Updated:** January 15th, 2025
