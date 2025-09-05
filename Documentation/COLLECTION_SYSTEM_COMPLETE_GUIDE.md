# Collection System Complete Guide

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: August 29th, 2025

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Models Explained](#database-models-explained)
3. [Collection Creation Process](#collection-creation-process)
4. [Collection Report Creation Process](#collection-report-creation-process)
5. [Frontend Pages Explained](#frontend-pages-explained)
6. [Backend API Endpoints](#backend-api-endpoints)
7. [Data Flow and Calculations](#data-flow-and-calculations)
8. [Field Mappings and Relationships](#field-mappings-and-relationships)

---

## System Overview

The Collection System manages the process of collecting money from casino machines and generating comprehensive reports. It consists of two main components:

1. **Collections**: Individual machine collection records
2. **Collection Reports**: Aggregated financial summaries for locations

### Key Concepts
- **Meters**: Physical counters on machines that track money in/out
- **SAS (Slot Accounting System)**: Electronic tracking system for machine data
- **Drop**: Money put into the machine by players
- **Gross**: Net revenue (Drop - Cancelled Credits)
- **Variance**: Difference between expected and actual amounts

---

## Database Models Explained

### 1. Collections Model (`collections` collection)

**Purpose**: Records individual machine collections with detailed financial data

**Key Fields**:
- `_id`: Unique identifier for the collection record
- `machineId`: Reference to the machine that was collected
- `location`: Name of the gaming location
- `collector`: User ID of the person who performed the collection
- `locationReportId`: Links this collection to a specific collection report
- `metersIn`: Current meter reading for money in
- `metersOut`: Current meter reading for money out
- `prevIn`: Previous meter reading for money in (from last collection)
- `prevOut`: Previous meter reading for money out (from last collection)
- `timestamp`: When the collection was performed
- `notes`: Additional notes about the collection
- `ramClear`: Boolean indicating if RAM was cleared during collection

**Calculated Fields**:
- `sasMeters`: SAS system data including drop, cancelled credits, gross, and time periods
- `movement`: Calculated movement data showing the difference from previous collection

### 2. CollectionReport Model (`collectionreport` collection)

**Purpose**: Aggregates multiple collections into location-level financial summaries

**Key Fields**:
- `_id`: Unique identifier (same as locationReportId)
- `locationReportId`: Unique identifier linking to collections
- `location`: Reference to the gaming location
- `locationName`: Human-readable location name
- `collectorName`: Name of the collector
- `timestamp`: When the report was created
- `variance`: Financial variance amount
- `varianceReason`: Explanation for any variance
- `previousBalance`: Previous balance owed
- `currentBalance`: Current balance owed
- `amountToCollect`: Total amount that should be collected
- `amountCollected`: Actual amount collected
- `amountUncollected`: Amount not collected
- `partnerProfit`: Profit share for the location partner
- `taxes`: Tax amount
- `advance`: Advance payment amount
- `balanceCorrection`: Correction to balance calculations
- `balanceCorrectionReas`: Reason for balance correction
- `reasonShortagePayment`: Reason for any shortage in payment

**Calculated Totals**:
- `totalDrop`: Sum of all drops from collections
- `totalCancelled`: Sum of all cancelled credits
- `totalGross`: Total gross revenue (totalDrop - totalCancelled)
- `totalSasGross`: SAS system calculated gross
- `machinesCollected`: Number of machines included in this report

---

## Collection Creation Process

### Step 1: User Interface (NewCollectionModal)
1. **Location Selection**: User selects a gaming location
2. **Machine Selection**: User selects specific machines from that location
3. **Data Entry**: For each machine, user enters:
   - Current meter readings (metersIn, metersOut)
   - Collection timestamp
   - Notes
   - RAM clear status
4. **Financial Data**: User enters shared financial data:
   - Taxes
   - Advance payments
   - Variance amounts and reasons
   - Previous balance
   - Collected amount

### Step 2: Backend Processing
1. **SAS Metrics Calculation**: System calculates SAS data for each machine
2. **Movement Calculation**: Calculates difference from previous collection
3. **Collection Creation**: Creates individual collection records
4. **Machine Update**: Updates machine's collectionMeters with new readings

### Step 3: Data Storage
- Individual collection records are stored in `collections` collection
- Each collection links to a `locationReportId` for grouping
- Machine records are updated with new meter readings

---

## Collection Report Creation Process

### Step 1: Report Generation
1. **Collection Aggregation**: Groups all collections by `locationReportId`
2. **Total Calculations**: Calculates totals for drop, cancelled, gross, and SAS gross
3. **Financial Summary**: Aggregates all financial data from collections
4. **Report Creation**: Creates single collection report record

### Step 2: Backend Calculations
The system automatically calculates:
- **Total Drop**: Sum of (current metersIn - previous metersIn) for all machines
- **Total Cancelled**: Sum of (current metersOut - previous metersOut) for all machines
- **Total Gross**: Total Drop - Total Cancelled
- **SAS Gross**: Sum of SAS system gross calculations
- **Machine Count**: Number of machines included in the report

### Step 3: Report Storage
- Single report record created in `collectionreport` collection
- Links to all related collections via `locationReportId`
- Contains aggregated financial data and totals

---

## Frontend Pages Explained

### 1. Collection Report Main Page (`/collection-report`)

**Purpose**: Main dashboard for viewing and managing collection reports

**Tabs**:
- **Collection Tab**: Lists all collection reports with filtering and search
- **Monthly Tab**: Shows monthly aggregated reports
- **Manager Tab**: Displays manager schedules and assignments
- **Collector Tab**: Shows collector schedules and assignments

**Features**:
- Date filtering (Today, Yesterday, Last 7 days, Last 30 days, Custom)
- Location filtering
- Search functionality
- Pagination
- Create new collection reports button

**Data Sources**:
- Collection reports from `collectionreport` collection
- Location data from `gaminglocations` collection
- Machine data for filtering

### 2. Collection Report Detail Page (`/collection-report/report/[reportId]`)

**Purpose**: Detailed view of a specific collection report

**Tabs**:
- **Machine Metrics**: Individual machine data from collections
- **Location Metrics**: Aggregated location-level data
- **SAS Metrics Compare**: SAS system data comparison

**Data Sources**:
- Collection report from `collectionreport` collection
- Individual collections from `collections` collection
- Machine data for detailed metrics

### 3. New Collection Modal

**Purpose**: Interface for creating new collection reports

**Process**:
1. Select location and machines
2. Enter meter readings for each machine
3. Enter shared financial data
4. Create collections and report

**Data Flow**:
- Creates individual collection records
- Generates collection report
- Updates machine meter readings

---

## Backend API Endpoints

### 1. Collection Reports API (`/api/collectionReport`)

**GET Endpoints**:
- **Basic**: Returns collection reports with filtering
- **Monthly**: Returns monthly aggregated data
- **Locations with Machines**: Returns locations and their machines

**POST Endpoint**:
- **Create Report**: Creates new collection report and related collections

### 2. Collections API (`/api/collections`)

**GET Endpoints**:
- **List Collections**: Returns collections with filtering
- **By Report ID**: Returns collections for specific report

**POST Endpoint**:
- **Create Collection**: Creates individual collection record

**PATCH Endpoint**:
- **Update Collection**: Updates existing collection

**DELETE Endpoint**:
- **Delete Collection**: Removes collection record

### 3. Collection Report Detail API (`/api/collection-report/[reportId]`)

**GET Endpoint**:
- **Report Details**: Returns detailed report data with machine metrics

**POST Endpoint**:
- **Sync Meters**: Synchronizes meter data for report

---

## Data Flow and Calculations

### Collection Creation Flow
1. **Frontend**: User enters meter readings and financial data
2. **API**: Validates data and calculates SAS metrics
3. **Database**: Creates collection record with calculated fields
4. **Update**: Updates machine's collectionMeters

### Report Creation Flow
1. **Frontend**: Submits collection data for report creation
2. **API**: Calculates totals and creates report
3. **Database**: Stores report and links collections
4. **Response**: Returns success confirmation

### Data Calculations

**Movement Calculation**:
```
Drop = Current metersIn - Previous metersIn
Cancelled = Current metersOut - Previous metersOut
Gross = Drop - Cancelled
```

**SAS Metrics**:
- Fetched from SAS system for time period
- Includes drop, cancelled credits, gross, and jackpot data

**Report Totals**:
```
Total Drop = Sum of all machine drops
Total Cancelled = Sum of all machine cancelled
Total Gross = Total Drop - Total Cancelled
SAS Gross = Sum of SAS system gross calculations
```

---

## Field Mappings and Relationships

### Collections to CollectionReport
- `collections.locationReportId` → `collectionreport.locationReportId`
- Multiple collections link to one report

### Collections to Machines
- `collections.machineId` → `machines._id`
- Each collection belongs to one machine

### Collections to Locations
- `collections.location` → `gaminglocations.name`
- Collections are performed at specific locations

### Collections to Users
- `collections.collector` → `users._id`
- Each collection is performed by a specific user

### Machine Meter Updates
- `collections.metersIn/metersOut` → `machines.collectionMeters.metersIn/metersOut`
- Machine records are updated with latest meter readings

---

## Key Business Rules

1. **Meter Readings**: Must be numeric and greater than or equal to previous readings
2. **Collection Timing**: Collections must have valid timestamps
3. **Location Consistency**: All machines in a report must be from the same location
4. **Financial Validation**: Required financial fields must be provided
5. **SAS Integration**: SAS data is calculated automatically based on time periods
6. **Report Linking**: Collections are linked to reports via locationReportId

---

## Error Handling

### Common Issues
1. **Invalid Meter Readings**: System validates meter data consistency
2. **Missing Financial Data**: Required fields are validated before creation
3. **SAS Calculation Failures**: Fallback values provided if SAS data unavailable
4. **Machine Update Failures**: Errors logged but don't prevent report creation

### Validation Rules
- Meter readings must be numeric
- Financial amounts must be valid numbers
- Required fields cannot be empty
- Timestamps must be valid dates

---

This guide provides a comprehensive understanding of how the collection system works from database models through frontend interfaces. Each component is designed to work together to provide accurate financial tracking and reporting for casino operations.
