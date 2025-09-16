# Currency Conversion System Implementation

## Overview

The Evolution1 CMS now supports multi-currency display for financial metrics. Users can view data in TTD (Trinidad & Tobago Dollar), GYD (Guyanese Dollar), BBD (Barbados Dollar), or USD (US Dollar), with automatic conversion based on fixed exchange rates.

## Key Features

- **Multi-Currency Support**: TTD, GYD, BBD, USD
- **Licensee-Specific Defaults**: Each licensee has a default currency
- **User Override**: Users can override the default currency
- **Automatic Conversion**: All financial values are automatically converted
- **Fixed Exchange Rates**: Uses predefined rates instead of external APIs
- **Real-time Updates**: Currency changes apply immediately to all displays

## Architecture

### 1. Fixed Exchange Rates
The system uses fixed exchange rates instead of external APIs:

```typescript
const FIXED_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,      // Base currency
  TTD: 6.75,     // 1 USD = 6.75 TTD
  GYD: 209.5,    // 1 USD = 209.5 GYD
  BBD: 2.0,      // 1 USD = 2.0 BBD
};
```

### 2. Licensee Currency Mapping
```typescript
const LICENSEE_DEFAULT_CURRENCY: Record<string, CurrencyCode> = {
  TTG: "TTD",    // Trinidad & Tobago
  Cabana: "GYD", // Guyana
  Barbados: "BBD" // Barbados
};
```

### 3. Currency Context
Global state management for currency preferences across the application.

## Implementation Steps

### Step 1: Type Definitions
**File**: `shared/types/currency.ts`
- Define currency codes and exchange rate types
- Create currency conversion request/response types
- Define currency filter state and metadata types

### Step 2: Fixed Exchange Rate Helper
**File**: `lib/helpers/rates.ts`
- Implement fixed exchange rate system
- Provide currency conversion functions
- Handle licensee default currency logic

### Step 3: API Endpoint
**File**: `app/api/rates/route.ts`
- Expose fixed exchange rates via `/api/rates`
- Return current rates with timestamp

### Step 4: Currency Conversion Helpers
**File**: `lib/helpers/currencyConversion.ts`
- Server-side currency conversion for API responses
- Process financial data arrays and objects
- Add currency metadata to responses

### Step 5: Frontend Components
**Files**: 
- `components/filters/CurrencyFilter.tsx`
- `lib/contexts/CurrencyContext.tsx`
- `components/reports/common/ReportsDateFilters.tsx`

### Step 6: API Integration
**File**: `app/api/reports/locations/route.ts`
- Example of integrating currency conversion into existing APIs
- Extract currency preferences from query parameters
- Convert financial fields before response

### Step 7: Frontend Usage
- Use `useCurrency()` hook for currency state
- Apply `formatAmount()` for display formatting
- Show current currency in headers/tooltips

## Configuration

### Environment Variables
```bash
# Currency Conversion Settings
LICENSEE_DEFAULT_CURRENCIES={"TTG":"TTD","Cabana":"GYD","Barbados":"BBD"}
DEFAULT_DISPLAY_CURRENCY=USD
```

### Fixed Exchange Rates
- **USD**: 1.0 (base currency)
- **TTD**: 6.75 (1 USD = 6.75 TTD)
- **GYD**: 209.5 (1 USD = 209.5 GYD)
- **BBD**: 2.0 (1 USD = 2.0 BBD)

## Usage Examples

### Frontend Currency Display
```typescript
import { useCurrency } from '@/lib/contexts/CurrencyContext';

function FinancialDisplay() {
  const { displayCurrency, formatAmount } = useCurrency();
  
  return (
    <div>
      <h3>Revenue: {formatAmount(1000, 'USD')}</h3>
      <p>Currency: {displayCurrency}</p>
    </div>
  );
}
```

### API Response with Currency
```typescript
// GET /api/reports/locations?currency=TTD&licensee=TTG
{
  "success": true,
  "data": [
    {
      "name": "Location A",
      "revenue": 6750, // Converted to TTD
      "currencyMeta": {
        "originalCurrency": "USD",
        "displayCurrency": "TTD",
        "exchangeRate": 6.75
      }
    }
  ]
}
```

## Benefits

1. **No External Dependencies**: Fixed rates eliminate need for API keys or external services
2. **Predictable Performance**: No network calls for exchange rates
3. **Always Available**: Rates are always current and never expire
4. **Easy Maintenance**: Simple to update rates when needed
5. **Consistent Experience**: All users see the same rates

## Testing

1. **Verify Fixed Rates**: Check `/api/rates` endpoint returns correct rates
2. **Test Currency Conversion**: Verify amounts convert correctly
3. **Test Licensee Defaults**: Ensure proper default currency assignment
4. **Test User Override**: Verify currency selection works
5. **Test API Integration**: Check currency conversion in reports

## Future Enhancements

- **Rate Updates**: Admin interface to update fixed rates
- **Historical Rates**: Support for different rates over time
- **Custom Currencies**: Add support for additional currencies
- **Rate Validation**: Ensure rates are within reasonable bounds
