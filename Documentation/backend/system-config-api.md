# System Configuration API Documentation

**Author:** Aaron Hazzard - Senior Software Engineer

## Overview

The System Configuration API manages core system settings including countries, firmware management, licensee information, and gaming location configurations.

## API Endpoints

### Countries

**Base URL:** `/api/countries`

#### GET /api/countries
Retrieves country information for licensing and regional configurations.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `region` (string): Filter by region
- `licenseRequired` (boolean): Filter by license requirement

**Response:**
```json
{
  "countries": [
    {
      "_id": "string",
      "name": "United States",
      "code": "US",
      "region": "North America",
      "active": true,
      "licenseRequired": true,
      "currency": "USD",
      "timezone": "America/New_York",
      "regulations": {
        "maxBet": 1000,
        "maxPayout": 50000,
        "ageRequirement": 21
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

#### POST /api/countries
Creates a new country configuration.

**Request Body:**
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

#### PUT /api/countries/[id]
Updates country configuration.

**Path Parameters:**
- `id` (string): Country ID

**Request Body:**
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

### Firmwares

**Base URL:** `/api/firmwares`

#### GET /api/firmwares
Retrieves firmware information for gaming machines.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `machineType` (string): Filter by machine type
- `version` (string): Filter by version number
- `locationId` (string): Filter by location

**Response:**
```json
{
  "firmwares": [
    {
      "_id": "string",
      "name": "Slot Machine Firmware v2.1",
      "version": "2.1.0",
      "machineType": "slot",
      "active": true,
      "fileSize": 5242880,
      "checksum": "sha256:abc123...",
      "downloadUrl": "https://example.com/firmware/v2.1.0.bin",
      "releaseNotes": "Bug fixes and performance improvements",
      "compatibility": ["machine_model_1", "machine_model_2"],
      "uploadedBy": "admin@example.com",
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "installedCount": 150
    }
  ],
  "total": 25
}
```

#### POST /api/firmwares
Uploads new firmware.

**Request Body:** (multipart/form-data)
- `file`: Firmware binary file
- `name`: Firmware name
- `version`: Version number
- `machineType`: Target machine type
- `releaseNotes`: Release notes
- `compatibility`: Array of compatible machine models

**Response:**
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

#### GET /api/firmwares/[id]
Retrieves specific firmware details.

**Path Parameters:**
- `id` (string): Firmware ID

#### PUT /api/firmwares/[id]
Updates firmware information.

**Path Parameters:**
- `id` (string): Firmware ID

#### DELETE /api/firmwares/[id]
Deactivates firmware (soft delete).

**Path Parameters:**
- `id` (string): Firmware ID

#### POST /api/firmwares/migrate
Initiates firmware migration for machines.

**Request Body:**
```json
{
  "firmwareId": "string",
  "machineIds": ["machine1", "machine2"],
  "locationId": "string",
  "scheduledAt": "2024-01-01T02:00:00.000Z"
}
```

### Licensees

**Base URL:** `/api/licensees`

#### GET /api/licensees
Retrieves licensee information.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `country` (string): Filter by country
- `licenseType` (string): Filter by license type
- `expiresBefore` (string): Filter by expiration date

**Response:**
```json
{
  "licensees": [
    {
      "_id": "string",
      "name": "ABC Gaming Corporation",
      "licenseNumber": "LIC-2024-001",
      "licenseType": "casino",
      "country": "US",
      "state": "Nevada",
      "active": true,
      "contactInfo": {
        "email": "contact@abcgaming.com",
        "phone": "+1-555-0123",
        "address": "123 Gaming St, Las Vegas, NV 89101"
      },
      "licenseDetails": {
        "issuedDate": "2024-01-01T00:00:00.000Z",
        "expiryDate": "2025-01-01T00:00:00.000Z",
        "maxMachines": 1000,
        "maxLocations": 10
      },
      "compliance": {
        "lastAudit": "2024-01-01T00:00:00.000Z",
        "auditScore": 95,
        "violations": []
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

#### POST /api/licensees
Creates new licensee.

**Request Body:**
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

#### PUT /api/licensees/[id]
Updates licensee information.

**Path Parameters:**
- `id` (string): Licensee ID

#### DELETE /api/licensees/[id]
Deactivates licensee (soft delete).

**Path Parameters:**
- `id` (string): Licensee ID

### Gaming Locations

**Base URL:** `/api/gaming-locations`

#### GET /api/gaming-locations
Retrieves gaming location information.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `licenseeId` (string): Filter by licensee
- `country` (string): Filter by country
- `state` (string): Filter by state

**Response:**
```json
{
  "locations": [
    {
      "_id": "string",
      "name": "Main Street Casino",
      "licenseeId": "string",
      "licenseeName": "ABC Gaming Corporation",
      "active": true,
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
        "manager": "John Smith"
      },
      "capacity": {
        "maxMachines": 200,
        "currentMachines": 150,
        "maxPatrons": 1000
      },
      "hours": {
        "open": "09:00",
        "close": "03:00",
        "timezone": "America/Los_Angeles"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25
}
```

#### POST /api/gaming-locations
Creates new gaming location.

**Request Body:**
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

## Database Models

### Country Model
```typescript
type Country = {
  _id: string;
  name: string;
  code: string;
  region: string;
  active: boolean;
  licenseRequired: boolean;
  currency: string;
  timezone: string;
  regulations: {
    maxBet: number;
    maxPayout: number;
    ageRequirement: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Firmware Model
```typescript
type Firmware = {
  _id: string;
  name: string;
  version: string;
  machineType: string;
  active: boolean;
  fileSize: number;
  checksum: string;
  downloadUrl: string;
  releaseNotes: string;
  compatibility: string[];
  uploadedBy: string;
  uploadedAt: Date;
  installedCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Licensee Model
```typescript
type Licensee = {
  _id: string;
  name: string;
  licenseNumber: string;
  licenseType: string;
  country: string;
  state: string;
  active: boolean;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  licenseDetails: {
    issuedDate: Date;
    expiryDate: Date;
    maxMachines: number;
    maxLocations: number;
  };
  compliance: {
    lastAudit: Date;
    auditScore: number;
    violations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### GamingLocation Model
```typescript
type GamingLocation = {
  _id: string;
  name: string;
  licenseeId: string;
  active: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    manager: string;
  };
  capacity: {
    maxMachines: number;
    currentMachines: number;
    maxPatrons: number;
  };
  hours: {
    open: string;
    close: string;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Features

### Country Management
- **Regional Compliance**: Country-specific gaming regulations and requirements
- **Currency Support**: Multi-currency support for different regions
- **Timezone Management**: Automatic timezone handling for global operations
- **License Requirements**: Automatic license requirement enforcement

### Firmware Management
- **Version Control**: Comprehensive version tracking and management
- **Compatibility Checking**: Automatic compatibility validation
- **Secure Distribution**: Secure firmware distribution with checksum verification
- **Rollback Support**: Firmware rollback capabilities for failed updates
- **Installation Tracking**: Real-time installation status tracking

### Licensee Management
- **License Tracking**: Comprehensive license lifecycle management
- **Compliance Monitoring**: Automated compliance checking and reporting
- **Contact Management**: Centralized contact information management
- **Capacity Planning**: License-based capacity planning and enforcement

### Location Management
- **Capacity Management**: Real-time capacity monitoring and planning
- **Operating Hours**: Flexible operating hours configuration
- **Contact Information**: Centralized location contact management
- **Address Management**: Structured address data for reporting

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request parameters |
| 401 | Unauthorized access |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Resource conflict |
| 422 | Validation error |
| 500 | Internal server error |

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Role-based Access**: Different access levels for different user roles
- **File Upload Security**: Secure firmware file upload with validation
- **Data Encryption**: Sensitive configuration data encrypted at rest
- **Audit Logging**: All configuration changes logged for audit purposes

## Performance Considerations

- **Caching**: Configuration data cached for improved performance
- **Indexing**: Optimized database indexes for common queries
- **File Storage**: Efficient firmware file storage using GridFS
- **Validation**: Client-side and server-side validation for data integrity

## Related Frontend Pages

- **System Configuration**: `/administration/config` - Main configuration page
- **Country Management**: `/administration/countries` - Country configuration
- **Firmware Management**: `/administration/firmwares` - Firmware upload and management
- **Licensee Management**: `/administration/licensees` - Licensee information
- **Location Management**: `/administration/locations` - Gaming location configuration

## Dependencies

- **MongoDB**: Primary data storage
- **Mongoose**: ODM for data modeling
- **GridFS**: Firmware file storage
- **JWT**: Authentication and authorization
- **Multer**: File upload handling
- **Crypto**: Checksum generation and verification

## Usage Examples

### Creating a New Country
```javascript
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
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Uploading Firmware
```javascript
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
```javascript
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
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Creating a Gaming Location
```javascript
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
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```
