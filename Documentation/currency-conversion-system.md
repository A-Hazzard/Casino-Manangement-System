# Currency Conversion System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** December 2025  
**Version:** 3.1.0

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Currency Mappings](#currency-mappings)
4. [Implementation](#implementation)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Evolution One CMS currency conversion system provides accurate multi-licensee financial data aggregation with proper currency conversion. The system handles locations and machines belonging to different licensees with different currencies, as well as unassigned locations that use country-based currency detection.

### Key Principles

- **Accuracy**: Native currency detection → USD → Display currency conversion
- **Flexibility**: Support for locations with/without licensees
- **Consistency**: Unified conversion across all endpoints
- **Performance**: Efficient conversion with minimal overhead

### Supported Currencies

- **USD** - US Dollar (base currency, rate: 1.0)
- **TTD** - Trinidad & Tobago Dollar (rate: 6.75)
- **GYD** - Guyanese Dollar (rate: 207.98)
- **BBD** - Barbados Dollar (rate: 2.0)

---

## Architecture

### Core Components

#### 1. **Currency Mappings** (`lib/helpers/rates.ts`)

Defines fixed exchange rates and mappings:

```typescript
// Exchange rates (USD as base)
const FIXED_RATES: ExchangeRates = {
  USD: 1.0,
  TTD: 6.75,
  GYD: 207.98,
  BBD: 2.0,
};

// Licensee to currency mapping
const LICENSEE_CURRENCY = {
  TTG: 'TTD',
  Cabana: 'GYD',
  Barbados: 'BBD',
};

// Country to currency mapping (for unassigned locations)
const COUNTRY_CURRENCY_MAP = {
  'Trinidad and Tobago': 'TTD',
  'Trinidad & Tobago': 'TTD',
  Trinidad: 'TTD',
  Guyana: 'GYD',
  Barbados: 'BBD',
};
```

#### 2. **Conversion Functions** (`lib/helpers/rates.ts`)

```typescript
// Convert from native currency to USD
export function convertToUSD(value: number, licenseeOrCurrency: string): number

// Convert from USD to target currency
export function convertFromUSD(value: number, targetCurrency: CurrencyCode): number

// Get currency for a country
export function getCountryCurrency(countryName: string): CurrencyCode
```

#### 3. **Dual Currency State Management**

**CurrencyContext** (`lib/contexts/CurrencyContext.tsx`)
- UI-focused currency state
- Provides `isAllLicensee` flag
- Used by currency filter components
- **Auto-Set Logic**: Automatically sets currency for single-licensee non-admin users to their licensee's native currency
  - Overrides localStorage if it contains USD from a previous admin session
  - Only applies to users with exactly one licensee who are not admins/developers
  - Runs whenever user data loads or changes

**DashboardStore** (`lib/store/dashboardStore.ts`)
- Data-fetching currency state
- Used by API hooks
- Synchronized with CurrencyContext

#### 4. **Currency Filter UI** (`components/filters/CurrencyFilter.tsx`)

- Only visible when "All Licensee" is selected
- Updates BOTH CurrencyContext AND DashboardStore
- Triggers automatic data refresh

---

## Currency Mappings

### Licensee-Based Currency

| Licensee | Currency | Rate |
|----------|----------|------|
| TTG | TTD | 6.75 |
| Cabana | GYD | 207.98 |
| Barbados | BBD | 2.0 |
| Unassigned | *Country-based* | *Varies* |

### Country-Based Currency (Fallback)

| Country | Currency | Rate |
|---------|----------|------|
| Trinidad and Tobago | TTD | 6.75 |
| Guyana | GYD | 207.98 |
| Barbados | BBD | 2.0 |
| Unknown | USD | 1.0 |

---

## Implementation

### Role-Based Currency Conversion Rules

⚠️ **CRITICAL**: Currency conversion ONLY applies for **Admin/Developer** roles when viewing **"All Licensees"**.

**Conversion Rules by Role:**

| User Role | Licensee Filter | Currency Conversion | Currency Selector Visible | Auto-Set Currency |
|-----------|----------------|---------------------|---------------------------|-------------------|
| Admin/Developer | "All Licensees" | ✅ YES (to selected display currency) | ✅ YES | ❌ NO (manual selection) |
| Admin/Developer | Specific Licensee (e.g., "Barbados") | ❌ NO (shows native currency) | ❌ NO | ❌ NO (manual selection) |
| Manager | Any (assigned licensee only) | ❌ NO (always native currency) | ❌ NO | ✅ YES (if single licensee) |
| Single-Licensee Non-Admin | N/A (only one licensee) | ❌ NO (always native currency) | ❌ NO | ✅ YES (auto-set to licensee currency) |
| Other Roles | N/A | ❌ NO | ❌ NO | ✅ YES (if single licensee) |

**Auto-Set Currency Logic:**
- **Trigger**: When user data loads or changes
- **Condition**: User has exactly 1 licensee AND is not admin/developer
- **Action**: Automatically sets `displayCurrency` to licensee's native currency (TTD, GYD, or BBD)
- **Override**: Overrides localStorage if it contains USD from a previous admin session
- **Purpose**: Ensures single-licensee users always see their native currency, preventing USD display from previous admin sessions

**Implementation:**

```typescript
// Check if currency conversion should apply
const shouldConvert = isAdminOrDev && licensee === 'all';

if (shouldConvert) {
  // Apply conversion: Native → USD → Display Currency
} else {
  // Return native currency values without conversion
}
```

### Conversion Flow

**Example: Admin viewing "All Licensees" with DevLabTuna (Trinidad, TTD $20)**

```
Step 1: Determine Native Currency
├─ Check licensee: NULL
├─ Check country: "Trinidad and Tobago"
└─ Native Currency: TTD

Step 2: Convert to USD (intermediate)
├─ TTD $20 / 6.75 = USD $2.96

Step 3: Convert to Display Currency
├─ USD selected: $2.96 * 1.0 = USD $2.96 ✓
├─ TTD selected: $2.96 * 6.75 = TTD $20.00 ✓
├─ GYD selected: $2.96 * 207.98 = GYD $616.24 ✓
└─ BBD selected: $2.96 * 2.0 = BBD $5.93 ✓
```

**Example: Manager viewing Barbados licensee (BBD $2,310)**

```
Step 1: Check Role & Filter
├─ Role: Manager
├─ Filter: Barbados (assigned licensee)
└─ NO CONVERSION - Show native currency

Step 2: Display Value
└─ Display: $2,310 BBD (or just $2,310)
```

### API Pattern

All endpoints with "All Licensee" support follow this pattern:

```typescript
import { getUserFromServer } from '@/app/api/lib/helpers/users';

export async function GET(req: NextRequest) {
  const licensee = searchParams.get('licensee');
  const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';

  // Get user to check role
  const user = await getUserFromServer();
  const userRoles = (user?.roles as string[]) || [];
  const isAdminOrDev = userRoles.some(role => ['admin', 'developer'].includes(role));

  // ... fetch data ...

  // CRITICAL: Only convert for Admin/Developer when viewing "All Licensees"
  if (isAdminOrDev && shouldApplyCurrencyConversion(licensee)) {
    // Get licensee and country mappings
    const licenseesData = await db.collection('licencees').find(...).toArray();
    const countriesData = await db.collection('countries').find({}).toArray();
    
    const licenseeIdToName = new Map(...);
    const countryIdToName = new Map(...);

    // Convert each item
    data = data.map(item => {
      const licenseeId = item.rel?.licencee;
      
      if (!licenseeId) {
        // Use country to determine native currency
        const countryName = countryIdToName.get(item.country);
        const nativeCurrency = getCountryCurrency(countryName) || 'USD';
        
        const valueUSD = convertToUSD(item.moneyIn, nativeCurrency);
        return {
          ...item,
          moneyIn: convertFromUSD(valueUSD, displayCurrency),
        };
      }
      
      // Use licensee to determine native currency
      const licenseeName = licenseeIdToName.get(licenseeId);
      const valueUSD = convertToUSD(item.moneyIn, licenseeName);
      return {
        ...item,
        moneyIn: convertFromUSD(valueUSD, displayCurrency),
      };
    });
  }

  return NextResponse.json({ data, currency: displayCurrency });
}
```

---

## API Endpoints

### ✅ Fully Implemented

| Endpoint | Purpose | Currency Support |
|----------|---------|------------------|
| `/api/dashboard/totals` | Dashboard financial totals | ✅ Multi-licensee + Country |
| `/api/reports/locations` | Locations list financial data | ✅ Multi-licensee + Country |
| `/api/locations/search-all` | Location search with financial data | ✅ Multi-licensee + Country |
| `/api/machines/aggregation` | Cabinets/Machines list financial data | ✅ Multi-licensee + Country |
| `/api/analytics/locations` | Analytics location data | ✅ Multi-licensee + Country |

### 📋 Single-Licensee Endpoints (No Conversion Needed)

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `/api/locations/{id}` | Specific location details | Native currency only |
| `/api/machines/{id}` | Specific machine details | Native currency only |
| `/api/cabinets/{id}` | Specific cabinet details | Native currency only |

### 🔄 Analytics Endpoints (Future Enhancement)

These endpoints are used by the Reports page and may need similar updates:
- `/api/analytics/dashboard`
- `/api/analytics/charts`
- `/api/reports/machines`
- `/api/reports/meters`
- `/api/analytics/manufacturer-performance`
- `/api/analytics/machine-hourly`

---

## Frontend Integration

### Pages with Currency Conversion

#### **Dashboard** (`app/page.tsx`)
```typescript
const { displayCurrency } = useCurrency();

useEffect(() => {
  fetchMetricsData(..., displayCurrency);
}, [displayCurrency]); // Re-fetch when currency changes
```

#### **Locations** (`app/locations/page.tsx`)
```typescript
// useLocationData hook automatically includes displayCurrency in dependencies
const { locationData } = useLocationData({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  searchTerm,
  selectedFilters,
});
```

#### **Cabinets** (`app/cabinets/page.tsx`)
```typescript
const { displayCurrency } = useCurrencyFormat();

const { allCabinets } = useCabinetData({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  displayCurrency, // Passed to API
});
```

### Detail Pages (No Conversion)

#### **Location Details** (`app/locations/[slug]/page.tsx`)
```typescript
<FinancialMetricsCards
  totals={financialTotals}
  disableCurrencyConversion={true} // Shows native values
/>

<PageLayout hideLicenceeFilter={true} /> // Hides currency selector
```

#### **Cabinet Details** (`app/cabinets/[slug]/page.tsx`)
```typescript
<AccountingDetails
  cabinet={cabinet}
  disableCurrencyConversion={true} // Shows native values
/>

<PageLayout hideLicenceeFilter={true} /> // Hides currency selector
```

### Currency Selector Components

#### **Header** (`components/layout/Header.tsx`)
```typescript
<CurrencyFilter
  onCurrencyChange={(newCurrency) => {
    // Use newCurrency parameter, not old displayCurrency
    if (pathname === '/') {
      fetchMetricsData(..., newCurrency);
    }
  }}
/>
```

#### **Sidebar** (`components/layout/AppSidebar.tsx`)
```typescript
<Select
  value={displayCurrency}
  onValueChange={(value) => {
    const newCurrency = value as CurrencyCode;
    setDisplayCurrency(newCurrency);      // CurrencyContext
    setDashboardCurrency(newCurrency);    // DashboardStore
  }}
/>
```

---

## Testing

### Manual Testing Scenarios

1. **All Licensee Mode**
   - Select "All Licensee" → Currency selector appears
   - Change currency → Data refreshes automatically
   - Verify conversions are correct for each currency

2. **Specific Licensee Mode**
   - Select specific licensee (e.g., TTG)
   - Currency selector hidden
   - Data shows in licensee's native currency

3. **Detail Pages**
   - Navigate from list to detail page
   - Currency selector hidden
   - Values show as plain numbers

### Automated Testing

Verification script: `scripts/test-all-pages-currency.js`

```bash
node scripts/test-all-pages-currency.js
```

Expected output:
```
Dashboard:   ✅ USD ✅ TTD ✅ GYD ✅ BBD (4/4)
Locations:   ✅ USD ✅ TTD ✅ GYD ✅ BBD (4/4)
Cabinets:    ✅ USD ✅ TTD ✅ GYD ✅ BBD (4/4)

FINAL RESULTS: 12/12 tests passed
```

### Test Cases

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Trinidad location, All Licensee + USD | TTD $20 | USD $2.96 |
| Trinidad location, All Licensee + TTD | TTD $20 | TTD $20.00 |
| Trinidad location, All Licensee + GYD | TTD $20 | GYD $616.24 |
| Trinidad location, All Licensee + BBD | TTD $20 | BBD $5.93 |
| Trinidad location, TTG Licensee | TTD $20 | TTD $20 (no conversion) |
| Location details page | TTD $20 | 20 (plain number) |

---

## Troubleshooting

### Common Issues

#### **Issue: Currency doesn't update when changed**
**Symptom**: Selecting different currency doesn't refresh data  
**Cause**: Dual currency states not synchronized  
**Solution**: Verify `CurrencyFilter` updates both stores:
```typescript
setDisplayCurrency(newCurrency);      // CurrencyContext
setDashboardCurrency(newCurrency);    // DashboardStore
```

#### **Issue: Wrong currency symbol on detail pages**
**Symptom**: Detail page shows "Bds$20" instead of "20"  
**Cause**: Currency conversion not disabled  
**Solution**: Pass `disableCurrencyConversion={true}` to components

#### **Issue: Values not converting correctly**
**Symptom**: Shows $20 USD instead of $2.96 USD  
**Cause**: Missing country/licensee data or treating as USD  
**Solution**: 
1. Ensure API projection includes `rel` and `country`
2. Verify country-based fallback is implemented
3. Check `convertToUSD` receives correct currency

#### **Issue: Unassigned locations show wrong values**
**Symptom**: Trinidad location shows as USD instead of TTD  
**Cause**: Missing country-based currency detection  
**Solution**: Implement country lookup:
```typescript
const countryName = countryIdToName.get(location.country);
const nativeCurrency = getCountryCurrency(countryName) || 'USD';
```

### Debug Checklist

When currency conversion isn't working:

1. **Check API Request**
   - Is `currency` parameter being sent?
   - Is `licensee` parameter empty for "All Licensee"?

2. **Check API Response**
   - Does response include `rel` and `country` fields?
   - Is `converted: true` in response?
   - Are values different for different currencies?

3. **Check Frontend State**
   - Is `displayCurrency` in DashboardStore updated?
   - Is `isAllLicensee` correct?
   - Is hook dependency array including `displayCurrency`?

4. **Check Data Projection**
   - Does API query include `rel: 1, country: 1`?
   - Is location data passed to conversion logic?

---

## Best Practices

### For New Endpoints

When adding currency conversion to a new endpoint:

1. **Add imports**
```typescript
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD, getCountryCurrency } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
```

2. **Get currency parameter**
```typescript
const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';
```

3. **Include rel and country in queries**
```typescript
.find(matchStage, {
  projection: { _id: 1, name: 1, rel: 1, country: 1, /* other fields */ }
})
```

4. **Apply conversion logic**
```typescript
if (shouldApplyCurrencyConversion(licensee)) {
  // Get mappings
  const licenseesData = await db.collection('licencees').find(...).toArray();
  const countriesData = await db.collection('countries').find({}).toArray();
  
  // Map IDs to names
  const licenseeIdToName = new Map(...);
  const countryIdToName = new Map(...);
  
  // Convert each item
  data = data.map(item => {
    // Determine native currency from licensee or country
    // Convert: Native → USD → Display
  });
}
```

### For New UI Components

When creating components that display financial data:

1. **Add `disableCurrencyConversion` prop for detail pages**
```typescript
type Props = {
  data: FinancialData;
  disableCurrencyConversion?: boolean;
};
```

2. **Check if conversion should apply**
```typescript
const { shouldShowCurrency } = useCurrencyFormat();
const shouldApplyCurrency = !disableCurrencyConversion && shouldShowCurrency();
```

3. **Conditional formatting**
```typescript
{shouldApplyCurrency 
  ? formatAmount(value, displayCurrency)
  : formatNumber(value)
}
```

---

## Data Flow Examples

### Example 1: Multi-Licensee Aggregation

**Scenario**: Dashboard with 3 locations, "All Licensee" selected, USD display currency

```
Location 1 (TTG Licensee):
  Raw: TTD $100
  → TTD $100 / 6.75 = USD $14.81

Location 2 (Cabana Licensee):
  Raw: GYD $1000
  → GYD $1000 / 207.98 = USD $4.81

Location 3 (Trinidad, no licensee):
  Raw: TTD $20
  → Country: Trinidad → Currency: TTD
  → TTD $20 / 6.75 = USD $2.96

Total: $14.81 + $4.81 + $2.96 = USD $22.58
```

### Example 2: Single Currency Display

**Scenario**: Same 3 locations, "All Licensee" selected, TTD display currency

```
Location 1 (TTG/TTD):
  TTD $100 → USD $14.81 → TTD $100.00

Location 2 (Cabana/GYD):
  GYD $1000 → USD $4.81 → TTD $32.47

Location 3 (Trinidad/TTD):
  TTD $20 → USD $2.96 → TTD $20.00

Total: TTD $152.47
```

### Example 3: Detail Page (No Conversion)

**Scenario**: Viewing Location 3 details

```
Location 3 (Trinidad, TTD $20):
  Display: 20 (plain number, no symbol)
  No conversion applied
  Currency selector hidden
```

---

## Configuration

### Adding New Currencies

1. **Update `FIXED_RATES`** in `lib/helpers/rates.ts`
```typescript
const FIXED_RATES = {
  USD: 1.0,
  TTD: 6.75,
  GYD: 207.98,
  BBD: 2.0,
  JMD: 155.0, // Jamaica Dollar (example)
};
```

2. **Update `CurrencyCode` type** in `shared/types/currency.ts`
```typescript
export type CurrencyCode = 'USD' | 'TTD' | 'GYD' | 'BBD' | 'JMD';
```

3. **Update `COUNTRY_CURRENCY_MAP`** if needed
```typescript
const COUNTRY_CURRENCY_MAP = {
  // ... existing ...
  Jamaica: 'JMD',
};
```

4. **Update currency symbols** in formatting functions

### Adding New Licensees

1. **Update `LICENSEE_CURRENCY`** in `lib/helpers/rates.ts`
```typescript
const LICENSEE_CURRENCY = {
  TTG: 'TTD',
  Cabana: 'GYD',
  Barbados: 'BBD',
  NewLicensee: 'JMD', // Map to appropriate currency
};
```

---

## Performance Considerations

### Optimization Strategies

1. **Efficient Map Lookups**: O(1) lookups for licensee/country mappings
2. **Single Database Queries**: Fetch all licensees/countries once per request
3. **Dependency Arrays**: Currency changes trigger single refetch via hooks
4. **Conditional Conversion**: Only converts when "All Licensee" is selected

### Caching

- Currency mappings are queried per request (consider caching if performance issue)
- Frontend stores currency preference in localStorage
- API responses include `converted: boolean` flag

---

## Security & Data Integrity

### Validation

- Currency codes validated against `CurrencyCode` type
- Exchange rates are fixed (no external API dependencies)
- Type safety ensures correct parameter passing

### Audit Trail

- All conversions are logged in development mode
- API responses include currency metadata
- Original values preserved in database

---

## Migration Notes

### Version 3.0.0 Changes (November 2025)

**Breaking Changes:**
- None (backward compatible)

**New Features:**
- Country-based currency detection for unassigned locations
- Dual currency state synchronization
- Automatic refresh on currency changes
- Detail page currency display control

**Bug Fixes:**
- Fixed unassigned locations being treated as USD
- Fixed currency selector not triggering refetch
- Fixed detail pages showing wrong currency symbols
- Fixed dual currency states being out of sync

---

## Future Enhancements

### Potential Improvements

1. **Dynamic Exchange Rates**: Support for real-time rate updates via admin interface
2. **Historical Rates**: Support for historical currency conversions
3. **More Currencies**: Eastern Caribbean Dollar (XCD), others as needed
4. **Rate Alerts**: Notifications when rates are updated
5. **Conversion Audit**: Detailed logging of all conversions for compliance
6. **Performance**: Cache country/licensee mappings for better performance

---

## Conclusion

The Evolution One CMS currency conversion system provides comprehensive support for multi-currency financial data across all major pages. The system intelligently determines native currencies based on licensee assignments or country locations, ensures accurate conversions, and provides a seamless user experience with automatic refresh and proper display formatting.

**Key Achievements:**
- ✅ 100% test pass rate across all main pages
- ✅ Support for 4 currencies (USD, TTD, GYD, BBD)
- ✅ Handles both assigned and unassigned locations
- ✅ Automatic refresh on currency changes
- ✅ Proper display on list vs detail pages

---

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: November 2nd, 2025  
**Version**: 3.0.0

