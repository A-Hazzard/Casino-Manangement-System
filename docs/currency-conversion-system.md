# Currency Conversion System Documentation

## Overview

The currency conversion system allows users to view financial data in different currencies when "All Licensee" is selected. The system supports USD, TTD (Trinidad & Tobago Dollar), GYD (Guyanese Dollar), and BBD (Barbados Dollar) with fixed exchange rates.

## Architecture

### Core Components

1. **Types & Constants** (`shared/types/currency.ts`)
   - Defines currency codes and exchange rates
   - Maps licensees to their default currencies
   - Provides fixed exchange rates for conversion

2. **Context Provider** (`lib/contexts/CurrencyContext.tsx`)
   - Global state management for currency selection
   - Handles currency conversion logic
   - Manages licensee-specific currency defaults

3. **Helper Functions** (`lib/helpers/`)
   - `rates.ts`: Exchange rate utilities
   - `currencyConversion.ts`: Data conversion logic
   - `useCurrencyFormat.ts`: React hook for formatting

4. **UI Components** (`components/`)
   - `CurrencyFilter.tsx`: Currency selection dropdown
   - `CurrencyDisplay.tsx`: Formatted amount display
   - `CurrencyIndicator.tsx`: Current currency indicator

## Exchange Rates

### Fixed Rates (Base: USD)
- **USD**: 1.0 (base currency)
- **TTD**: 6.75 (1 USD = 6.75 TTD)
- **GYD**: 209.5 (1 USD = 209.5 GYD)
- **BBD**: 2.0 (1 USD = 2.0 BBD)

### Licensee Currency Mapping
```typescript
const LICENSEE_CURRENCY_MAP = {
  "65e822e5a0741f08c709272a": "TTD", // TTG Licensee
  "65e822e5a0741f08c709272b": "GYD", // Cabana Licensee
  "65e822e5a0741f08c709272c": "BBD", // Barbados Licensee
};
```

## Usage

### When Currency Conversion Applies

Currency conversion is only applied when:
- "All Licensee" is selected (`licenseeId` is null, undefined, or "all")
- The user has selected a display currency other than USD

### When Currency Conversion Does NOT Apply

Currency conversion is NOT applied when:
- A specific licensee is selected
- The selected licensee has a default currency mapping
- The display currency matches the licensee's default currency

## API Integration

### Backend APIs Modified

All financial data APIs now accept a `currency` parameter:

1. **Analytics APIs**
   - `/api/analytics/dashboard`
   - `/api/analytics/charts`
   - `/api/analytics/locations`

2. **Reports APIs**
   - `/api/reports/locations`
   - `/api/reports/machines`
   - `/api/reports/meters`

3. **Dashboard APIs**
   - `/api/dashboard/totals`

### API Response Format

```typescript
{
  data: convertedData,
  currency: "TTD",
  converted: true
}
```

## Frontend Integration

### Components Using Currency Conversion

1. **Dashboard Components**
   - `FinancialMetricsCards.tsx`
   - `MobileLayout.tsx`
   - `PcLayout.tsx`
   - `app/page.tsx` (Dashboard)

2. **Reports Components**
   - `MachinesTab.tsx`
   - `LocationsTab.tsx`

3. **Collection Report Components**
   - `CollectedMachinesList.tsx`
   - `CollectionReportTable.tsx`
   - `CollectionReportCards.tsx`

4. **Member Components**
   - `PlayerTotalsCard.tsx`
   - `PlayerSessionTable.tsx`

5. **Cabinet Components**
   - `AccountingMetricsSection.tsx`
   - `AccountingDetails.tsx`
   - `UnifiedBillValidator.tsx`

### Currency Selector

The currency selector appears in the header when "All Licensee" is selected:

```tsx
<CurrencyFilter
  className="hidden xl:flex"
  disabled={disabled}
  onCurrencyChange={() => {
    // Trigger data refresh when currency changes
  }}
/>
```

## Implementation Details

### Currency Context Usage

```tsx
import { useCurrency } from '@/lib/contexts/CurrencyContext';

const { 
  displayCurrency, 
  setDisplayCurrency, 
  isAllLicensee, 
  formatAmount 
} = useCurrency();
```

### Formatting Amounts

```tsx
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

const { formatAmount, shouldShowCurrency } = useCurrencyFormat();

// Conditional formatting
{shouldShowCurrency() ? formatAmount(amount) : formatCurrency(amount)}
```

### Currency Display Component

```tsx
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';

<CurrencyDisplay 
  amount={1000} 
  currency="TTD" 
  showSymbol={true}
  showCode={false}
/>
```

## Data Flow

1. **User selects "All Licensee"** → `isAllLicensee` becomes `true`
2. **Currency selector appears** → User can select display currency
3. **API calls include currency parameter** → Backend applies conversion
4. **Frontend displays converted amounts** → Using `formatAmount` function

## Testing

### Test File: `lib/helpers/__tests__/currencyConversion.test.ts`

Tests cover:
- Exchange rate retrieval
- Currency conversion calculations
- Licensee currency mapping
- Data conversion for different data structures

### Demo Component: `components/demo/CurrencyConversionDemo.tsx`

Interactive demonstration of currency conversion functionality.

## Configuration

### Environment Variables

No additional environment variables are required. The system uses fixed exchange rates defined in the codebase.

### Store Integration

The Zustand dashboard store includes currency state:

```typescript
interface DashBoardStore {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  isAllLicensee: boolean;
  setIsAllLicensee: (isAll: boolean) => void;
}
```

## Error Handling

- **Missing currency data**: Falls back to USD
- **Invalid currency codes**: Uses USD as default
- **Conversion errors**: Returns original amount
- **API failures**: Graceful degradation to non-converted display

## Performance Considerations

- **Memoized calculations**: Currency conversions are memoized
- **Conditional rendering**: Currency components only render when needed
- **Efficient data flow**: Conversion happens at API level, not in components

## Future Enhancements

1. **Dynamic Exchange Rates**: Integration with real-time exchange rate APIs
2. **Additional Currencies**: Support for more Caribbean currencies
3. **Historical Rates**: Support for historical currency conversion
4. **Bulk Conversion**: Optimized conversion for large datasets

## Troubleshooting

### Common Issues

1. **Currency selector not showing**
   - Ensure "All Licensee" is selected
   - Check `isAllLicensee` state

2. **Amounts not converting**
   - Verify API includes `currency` parameter
   - Check `shouldApplyCurrencyConversion` logic

3. **Wrong currency symbols**
   - Verify `getCurrencySymbol` function
   - Check currency code mapping

### Debug Information

Enable debug logging by setting `NODE_ENV=development` to see:
- Currency conversion calculations
- API request parameters
- State changes in currency context

## Security Considerations

- **No sensitive data exposure**: Exchange rates are public information
- **Input validation**: Currency codes are validated against allowed values
- **Type safety**: TypeScript ensures type correctness throughout the system

## Maintenance

### Adding New Currencies

1. Update `CurrencyCode` type in `shared/types/currency.ts`
2. Add exchange rate to `FIXED_EXCHANGE_RATES`
3. Update `getCurrencySymbol` function
4. Add tests for new currency

### Modifying Exchange Rates

1. Update `FIXED_EXCHANGE_RATES` in `shared/types/currency.ts`
2. Update tests to reflect new rates
3. Consider impact on existing data

### Adding Licensee Mappings

1. Update `LICENSEE_CURRENCY_MAP` in `shared/types/currency.ts`
2. Test with specific licensee data
3. Verify default currency behavior
