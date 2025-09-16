# Collection Report System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** January 15th, 2025

## Quick Search Guide (Ctrl+F)

- **amount to collect** - How collection amounts are calculated
- **balance correction** - Balance adjustment logic
- **create report** - Report creation process
- **edit collection** - Editing existing reports
- **financial calculations** - All formulas and calculations
- **machine entries** - Adding machines to reports
- **meter calculations** - Meter reading calculations
- **previous balance** - How previous balance works
- **profit sharing** - Location profit calculations
- **RAM clear** - RAM clear meter handling
- **variance** - Variance calculation and display

## Overview

The Collection Report System manages casino slot machine money collection. It calculates amounts to collect based on meter readings, profit sharing, and balance management.

## Collection Process

### Create Report Flow

1. **Select Location** → System loads machines and previous balance
2. **Add Machines** → Enter meter readings for each machine
3. **Financial Inputs** → Enter collected amount, variance, taxes, advance
4. **Auto-Calculations** → System calculates amount to collect and balance correction
5. **Create Report** → Saves to database and updates location balance

### Database Fields

**CollectionReport:**
- `locationReportId` - Unique report identifier
- `collectorName` - Collector performing collection
- `locationName` - Location being collected
- `timestamp` - Collection date/time
- `totalDrop` - Sum of all machine meter movements (metersIn - prevIn)
- `totalCancelled` - Sum of all cancelled credits (metersOut - prevOut)
- `totalGross` - Net revenue (totalDrop - totalCancelled)
- `amountToCollect` - Calculated amount to collect from location
- `amountCollected` - Actual cash collected
- `previousBalance` - Outstanding balance from previous collections
- `currentBalance` - Updated balance after collection
- `balanceCorrection` - Manual adjustment amount
- `partnerProfit` - Location's share of revenue
- `variance` - Difference between expected and actual

**Collection (Machine Entry):**
- `machineId` - Machine identifier
- `locationReportId` - Links to parent report
- `metersIn` - Current meters in reading
- `metersOut` - Current meters out reading
- `prevIn` - Previous meters in reading
- `prevOut` - Previous meters out reading
- `movement.metersIn` - Calculated movement (metersIn - prevIn)
- `movement.metersOut` - Calculated movement (metersOut - prevOut)
- `movement.gross` - Machine gross (metersIn movement - metersOut movement)

## Financial Calculations

### Meter Movement Calculations

**Standard Meters:**
```
Collection Drop = Current metersIn - Previous metersIn
Collection Cancelled = Current metersOut - Previous metersOut
Machine Gross = Collection Drop - Collection Cancelled
```

**RAM Clear Meters (when machine memory resets):**
```
Collection Drop = (RAM Clear metersIn - Previous metersIn) + Current metersIn
Collection Cancelled = (RAM Clear metersOut - Previous metersOut) + Current metersOut
```

**Zero Movement:**
- When current meters equal previous meters = 0 drop, 0 cancelled

### Amount to Collect Calculation

```
Amount to Collect = Total Gross - Variance - Advance - Partner Profit + Previous Balance
```

**Partner Profit Formula:**
```
Partner Profit = Floor((Total Gross - Variance - Advance) × Profit Share % ÷ 100) - Taxes
```

**Example:**
- Total Gross: $1,000
- Variance: $0
- Advance: $50
- Profit Share: 50%
- Taxes: $25
- Previous Balance: $200

```
Partner Profit = Floor((1000 - 0 - 50) × 50 ÷ 100) - 25 = Floor(475) - 25 = $450
Amount to Collect = 1000 - 0 - 50 - 450 + 200 = $700
```

### Balance Correction

**Auto-Calculation:**
```
Balance Correction = Amount Collected (defaults to this value, but editable)
```

**Balance Update:**
```
New Balance = Previous Balance + Amount to Collect - Amount Collected + Balance Correction
```

### Previous Balance

- **Source**: `location.collectionBalance` field
- **Purpose**: Outstanding balance from previous collections
- **Update**: Automatically updated after each collection
- **Display**: Read-only field showing last collection balance

## Machine Entry Management

### Adding Machines

1. **Select Location** → Loads machines at that location
2. **Click Machine** → Opens meter entry form
3. **Enter Readings** → Current metersIn and metersOut
4. **RAM Clear** → Check if machine memory was reset
5. **Submit** → Calculates movement and adds to collection

### Machine Entry Fields

- **Current Meters In** - Required meter reading
- **Current Meters Out** - Required meter reading
- **RAM Clear** - Checkbox if machine memory was reset
- **RAM Clear Meters In** - Required if RAM Clear checked
- **RAM Clear Meters Out** - Required if RAM Clear checked

### Validation Rules

- All meter readings must be positive numbers
- RAM Clear fields required when checkbox checked
- Current readings must be reasonable values
- Previous readings loaded from machine history

## Collection Report Editing

### Editable Fields

**Financial Fields:**
- `amountCollected` - Actual cash collected
- `variance` - Difference from expected
- `varianceReason` - Explanation for variance
- `taxes` - Tax deductions
- `advance` - Advance payments
- `balanceCorrection` - Manual adjustment
- `balanceCorrectionReas` - Reason for correction

**Read-Only Fields:**
- `amountToCollect` - Auto-calculated
- `previousBalance` - From location data
- `currentBalance` - Auto-calculated

### Edit Process

1. **Load Report** → Loads existing data
2. **Modify Fields** → Edit financial inputs
3. **Auto-Recalculate** → System updates dependent fields
4. **Save Changes** → Updates database and location balance

## Variance Calculation

### Variance Display

- **No SAS Data** → Shows "No SAS Data"
- **Zero Variance** → Shows "No Variance"
- **Positive Variance** → Meters exceed SAS data
- **Negative Variance** → SAS data exceeds meters

### Variance Formula

```
Variance = Meters Gross - SAS Gross
```

## Database Collections

### Primary Collections

- **collectionReports** - Main collection reports
- **collections** - Individual machine entries
- **machines** - Machine data and history
- **gaminglocations** - Location data and balances

### Key Relationships

```
CollectionReport (1) ←→ (Many) Collection
Collection (Many) ←→ (1) Machine
CollectionReport (Many) ←→ (1) GamingLocation
```

## API Endpoints

- `GET /api/collectionReport` - List reports
- `POST /api/collectionReport` - Create report
- `PUT /api/collectionReport/[id]` - Update report
- `GET /api/collection-report/[id]` - Get report details
- `GET /api/collections` - List machine entries
- `POST /api/collections` - Add machine entry
- `PATCH /api/collections/[id]` - Update machine entry

## Common Issues

**Amount to Collect shows zero:**
- No machine entries added
- Add at least one machine with meter readings

**Balance Correction not updating:**
- Collected amount field not filled
- Enter actual amount collected

**Variance shows "No SAS Data":**
- Normal for non-SAS machines
- SAS data not available for this machine

**Cannot edit collection:**
- Check report status and user permissions
- Report may be completed or locked

## Security & Compliance

- **Authentication** - JWT tokens required
- **Role-Based Access** - Different permissions for collectors vs managers
- **Audit Trail** - All changes logged with user and timestamp
- **Data Validation** - All inputs validated before storage
- **Audit Logging** - Complete history of all collection activities