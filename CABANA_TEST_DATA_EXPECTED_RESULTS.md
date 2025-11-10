# Cabana Test Data - Expected Results

## Overview
- **Licensee**: Cabana (ID: `c03b094083226f216b3fc39c`)
- **Currency**: BBD (Barbadian Dollar)
- **Gaming Day Offset**: 8:00 AM
- **Location**: Cabana Paradise Casino
- **Machines**: 5 machines with distinct traffic patterns
- **Time Period**: Last 7 days (including today)

---

## Machine Configurations

### 1. CABANA-001 (Lucky Dragon)
- **Game**: Dragon Gold
- **Pattern**: High traffic, consistent activity
- **SMIB**: cab001aabbcc

### 2. CABANA-002 (Phoenix Rising)
- **Game**: Fire Phoenix
- **Pattern**: Medium traffic, growing trend
- **SMIB**: cab002ddeeff

### 3. CABANA-003 (Ocean Treasure)
- **Game**: Dolphin Bay
- **Pattern**: Low traffic with weekend spikes
- **SMIB**: cab003112233

### 4. CABANA-004 (Wild West)
- **Game**: Gold Rush
- **Pattern**: Steady traffic, minimal variance
- **SMIB**: cab004445566

### 5. CABANA-005 (Mystic Moon)
- **Game**: Lunar Fortune
- **Pattern**: New machine, ramping up
- **SMIB**: cab005778899

---

## Expected Financial Metrics by Time Period

### Today (Gaming Day: 8 AM - 8 AM next day)

#### Per Machine
| Machine | Coin In | Coin Out | Drop | Gross (In - Out) |
|---------|---------|----------|------|------------------|
| CABANA-001 | 15,000 | 12,000 | 150 | 3,000 |
| CABANA-002 | 8,000 | 7,000 | 80 | 1,000 |
| CABANA-003 | 3,000 | 2,800 | 30 | 200 |
| CABANA-004 | 10,000 | 9,000 | 100 | 1,000 |
| CABANA-005 | 12,000 | 10,000 | 120 | 2,000 |

#### Location Totals (Today)
- **Money In**: 48,000 BBD
- **Money Out**: 40,800 BBD
- **Drop**: 480 BBD
- **Gross**: 7,200 BBD

---

### Yesterday

#### Per Machine
| Machine | Coin In | Coin Out | Drop | Gross (In - Out) |
|---------|---------|----------|------|------------------|
| CABANA-001 | 18,000 | 14,000 | 180 | 4,000 |
| CABANA-002 | 7,500 | 6,500 | 75 | 1,000 |
| CABANA-003 | 12,000 | 10,000 | 120 | 2,000 |
| CABANA-004 | 10,500 | 9,500 | 105 | 1,000 |
| CABANA-005 | 10,000 | 8,500 | 100 | 1,500 |

#### Location Totals (Yesterday)
- **Money In**: 58,000 BBD
- **Money Out**: 48,500 BBD
- **Drop**: 580 BBD
- **Gross**: 9,500 BBD

---

### Last 7 Days (Cumulative)

#### Per Machine (7-Day Totals)
| Machine | Coin In | Coin Out | Drop | Gross (In - Out) |
|---------|---------|----------|------|------------------|
| CABANA-001 | 115,500 | 92,000 | 1,155 | 23,500 |
| CABANA-002 | 47,500 | 40,500 | 475 | 7,000 |
| CABANA-003 | 54,500 | 45,100 | 545 | 9,400 |
| CABANA-004 | 70,800 | 63,800 | 708 | 7,000 |
| CABANA-005 | 52,000 | 44,300 | 520 | 7,700 |

#### Location Totals (Last 7 Days)
- **Money In**: 340,300 BBD
- **Money Out**: 285,700 BBD
- **Drop**: 3,403 BBD
- **Gross**: 54,600 BBD

---

### Last 30 Days (Assuming similar pattern)
Since we only have 7 days of data, the API should calculate:
- Repeat the 7-day pattern 4 times + 2 extra days

#### Estimated Location Totals (Last 30 Days)
- **Money In**: ~1,458,571 BBD (340,300 × 30/7)
- **Money Out**: ~1,224,286 BBD (285,700 × 30/7)
- **Drop**: ~14,584 BBD (3,403 × 30/7)
- **Gross**: ~234,286 BBD (54,600 × 30/7)

---

## Expected UI Display Values

### Locations Page (`/locations`)
When viewing Cabana Paradise Casino:

**Filter: Today**
- Money In: **$48,000** or **48,000 BBD**
- Money Out: **$40,800** or **40,800 BBD**
- Gross: **$7,200** or **7,200 BBD**

**Filter: Yesterday**
- Money In: **$58,000** or **58,000 BBD**
- Money Out: **$48,500** or **48,500 BBD**
- Gross: **$9,500** or **9,500 BBD**

**Filter: Last 7 Days**
- Money In: **$340,300** or **340,300 BBD**
- Money Out: **$285,700** or **285,700 BBD**
- Gross: **$54,600** or **54,600 BBD**

---

### Location Details Page (`/locations/[id]`)

#### Machine Cards (Today Filter)
1. **CABANA-001 (Lucky Dragon)**
   - Money In: $15,000
   - Money Out: $12,000
   - Gross: $3,000
   - Status: Online

2. **CABANA-002 (Phoenix Rising)**
   - Money In: $8,000
   - Money Out: $7,000
   - Gross: $1,000
   - Status: Online

3. **CABANA-003 (Ocean Treasure)**
   - Money In: $3,000
   - Money Out: $2,800
   - Gross: $200
   - Status: Online

4. **CABANA-004 (Wild West)**
   - Money In: $10,000
   - Money Out: $9,000
   - Gross: $1,000
   - Status: Online

5. **CABANA-005 (Mystic Moon)**
   - Money In: $12,000
   - Money Out: $10,000
   - Gross: $2,000
   - Status: Online

---

### Cabinets Page (`/cabinets`)
When filtered by Cabana Paradise Casino location:

**Today Filter (5 machines total)**
- Same values as Location Details
- All machines should show BBD values

---

### Dashboard (`/`)
When licensee filter = "Cabana":

**Today**
- Total Money In: **$48,000**
- Total Money Out: **$40,800**
- Total Gross: **$7,200**
- Active Locations: **1** (Cabana Paradise Casino)
- Active Machines: **5**

**Last 7 Days**
- Total Money In: **$340,300**
- Total Money Out: **$285,700**
- Total Gross: **$54,600**

---

## Currency Conversion Notes

### For Admin/Developer Users (when "All Licensees" selected)
If viewing "All Licensees" with USD display currency:
- BBD to USD conversion rate: ~0.50 (1 BBD = 0.50 USD)
- Example: 48,000 BBD → **$24,000 USD**

### For Manager Users (Cabana-specific)
- **Always display BBD** (native currency)
- No conversion should occur
- Example: 48,000 BBD → **$48,000 BBD** or **48,000 BBD**

---

## Data Validation Checklist

### Database Queries
- [ ] Location exists in `gaminglocations` collection
- [ ] Location has `rel.licencee: 'c03b094083226f216b3fc39c'`
- [ ] 5 machines exist with `gamingLocation: [locationId]`
- [ ] All machines have `collectorDenomination: 2` (BBD)
- [ ] Meters exist for all 7 days (3-5 readings per machine per day)
- [ ] Total meter count: ~105-175 (5 machines × 7 days × 3-5 readings)

### API Endpoints
- [ ] `/api/reports/locations` returns correct totals for Cabana
- [ ] `/api/locationAggregation` calculates per-machine metrics correctly
- [ ] `/api/machines/aggregation` returns all 5 machines with correct values
- [ ] `/api/dashboard/totals` includes Cabana in overall totals
- [ ] All endpoints respect gaming day offset (8 AM)

### UI Pages
- [ ] Locations page shows Cabana Paradise Casino with correct totals
- [ ] Location details page shows all 5 machines
- [ ] Cabinets page shows all 5 machines when filtered by location
- [ ] Dashboard includes Cabana data when filtered
- [ ] Currency displays correctly (BBD for managers, BBD or USD for admins)
- [ ] Time period filters work (Today, Yesterday, Last 7 Days, Last 30 Days)

---

## Test Scenarios

### Scenario 1: Manager Views Dashboard
**User**: Manager assigned to Cabana licensee
**Expected**:
- Licensee dropdown shows "Cabana" (pre-selected)
- Currency dropdown: **Hidden** (always BBD)
- Today totals: 48,000 BBD Money In, 7,200 BBD Gross
- Last 7 Days: 340,300 BBD Money In, 54,600 BBD Gross

### Scenario 2: Admin Views All Licensees
**User**: Admin or Developer
**Expected**:
- Licensee dropdown shows "All Licensees"
- Currency dropdown: **Visible** (USD, BBD, TTD, GYD options)
- If USD selected: 48,000 BBD → ~24,000 USD
- If BBD selected: 48,000 BBD → 48,000 BBD

### Scenario 3: Time Period Filters
**User**: Any authorized user
**Actions**:
1. Select "Today" → Shows 48,000 BBD Money In
2. Select "Yesterday" → Shows 58,000 BBD Money In
3. Select "Last 7 Days" → Shows 340,300 BBD Money In
4. Select "Last 30 Days" → Shows ~1,458,571 BBD Money In

### Scenario 4: Machine Details
**User**: Viewing CABANA-001 (Lucky Dragon)
**Expected**:
- Collection history shows progressive meter readings
- Today: 3-5 meter readings from 8 AM to 8 AM next day
- Final reading: coinIn = 15,000, coinOut = 12,000, drop = 150
- Gross calculated: 15,000 - 12,000 = 3,000 BBD

---

## Notes
- All currency values are in **BBD (Barbadian Dollar)**
- Gaming day boundary: **8:00 AM** (not midnight)
- Meters are cumulative within each gaming day
- Multiple meter readings per day simulate real-time SAS polling
- Weekend spike pattern on CABANA-003 simulates realistic casino traffic
- CABANA-005 ramp-up pattern simulates a newly installed machine

