# Currency Converter Implementation Prompt

## Overview
Implement a comprehensive currency converter system for the Evolution1 CMS that handles multi-licensee financial data aggregation with proper currency conversion.

## Requirements

### Core Functionality
1. **Licensee-Specific Currency Display**
   - TTG licensee → Display data in TTD (Trinidad & Tobago Dollar)
   - Cabana licensee → Display data in GYD (Guyanese Dollar)  
   - Barbados licensee → Display data in BBD (Barbados Dollar)
   - No conversion needed when viewing individual licensee data

2. **"All Licensees" Currency Conversion**
   - When "All Licensees" is selected, convert all financial data to a common base currency before aggregation
   - Default base currency: USD
   - User-selectable base currencies: USD, TTD, GYD, BBD
   - Currency converter UI only visible when "All Licensees" is selected

3. **Exchange Rates**
   - Use fixed exchange rates (no external API calls)
   - USD: 1.0 (base currency)
   - TTD: 6.75 (1 USD = 6.75 TTD)
   - GYD: 209.5 (1 USD = 209.5 GYD)
   - BBD: 2.0 (1 USD = 2.0 BBD)

### Technical Implementation

#### 1. Enhanced Currency Conversion Utilities
**File**: `lib/helpers/currencyConversion.ts`
- Add `convertMultiLicenseeFinancialData()` function
- Add `aggregateMultiLicenseeFinancialData()` function
- Add `shouldConvertForAllLicensees()` helper
- Add `getAggregationBaseCurrency()` helper

#### 2. Currency Store Updates
**File**: `lib/store/currencyStore.ts`
- Add `isAllLicenseesSelected()` method
- Add `shouldShowCurrencyConverter()` method
- Enhance `setSelectedLicensee()` with auto-sync behavior for licensee-currency synchronization
- Enhance `formatAmount()` to handle currency conversion for individual vs. all licensees
- Maintain existing currency state management

#### 3. Currency Converter UI Component
**File**: `components/ui/AllLicenseesCurrencyConverter.tsx`
- Only render when "All Licensees" is selected
- Dropdown for base currency selection (USD, TTD, GYD, BBD)
- Display current exchange rates
- Show licensee currency mapping
- Explain conversion process with info box

#### 4. API Integration
**File**: `app/api/metrics/meters/route.ts`
- Accept `currency` parameter
- Use currency conversion utilities for "All Licensees" scenarios
- Convert financial data before returning to frontend

#### 5. Dashboard Integration
**Files**: `app/page.tsx`, `lib/helpers/dashboard.ts`, `lib/helpers/metrics.ts`
- Pass currency parameter through the data fetching chain
- Update all API calls to include currency information
- Ensure currency changes trigger data refresh
- Add `useEffect` for licensee synchronization between dashboard and currency stores

#### 6. Header Component Integration
**File**: `components/layout/Header.tsx`
- Add `handleLicenseeChange()` wrapper function to sync both dashboard and currency stores
- Ensure currency store is always aware of currently selected licensee
- Maintain existing licensee selection functionality

#### 7. Layout Integration
**Files**: `components/layout/PcLayout.tsx`, `components/layout/MobileLayout.tsx`
- Add `AllLicenseesCurrencyConverter` component
- Position appropriately in the layout
- Ensure responsive design

### Key Features

#### Currency Converter Component
- **Visibility**: Only shows when "All Licensees" is selected
- **Base Currency Selection**: Dropdown with USD, TTD, GYD, BBD options
- **Exchange Rate Display**: Shows current rates for all currencies
- **Licensee Mapping**: Displays which licensee uses which currency
- **Conversion Explanation**: Info box explaining how conversion works

#### Financial Data Processing
- **Individual Licensees**: No conversion, display in native currency
- **All Licensees**: Convert all data to selected base currency before aggregation
- **Proper Aggregation**: Sum converted values instead of raw values
- **Error Handling**: Fallback to original data if conversion fails

### User Experience
1. **Default Behavior**: When "All Licensees" is selected, default to USD base currency
2. **Auto-Sync Behavior**: When switching to individual licensees, currency automatically switches to licensee's native currency
3. **Currency Selection**: User can change base currency via dropdown in "All Licensees" mode
4. **Real-time Updates**: Currency changes immediately refresh all financial data
5. **Clear Indication**: UI clearly shows which currency is being used for aggregation
6. **Responsive Design**: Works on both desktop and mobile layouts
7. **State Preservation**: User's currency preference in "All Licensees" mode is preserved when switching back

### Example Scenarios

#### Scenario 1: TTG Licensee Selected
- Display all TTG data in TTD
- No currency converter shown
- No conversion needed

#### Scenario 2: All Licensees Selected, USD Base
- TTG data (100 TTD) → Convert to USD (100/6.75 = 14.81 USD)
- Cabana data (1000 GYD) → Convert to USD (1000/209.5 = 4.77 USD)
- Barbados data (50 BBD) → Convert to USD (50/2.0 = 25 USD)
- Total: 14.81 + 4.77 + 25 = 44.58 USD

#### Scenario 3: All Licensees Selected, TTD Base
- TTG data (100 TTD) → Already in TTD (100 TTD)
- Cabana data (1000 GYD) → Convert to TTD (1000/209.5 * 6.75 = 32.22 TTD)
- Barbados data (50 BBD) → Convert to TTD (50/2.0 * 6.75 = 168.75 TTD)
- Total: 100 + 32.22 + 168.75 = 300.97 TTD

### Documentation Requirements
After implementation, create comprehensive documentation in `Documentation/` following the existing documentation standards:

1. **High-level overview** of the currency converter system
2. **Technical architecture** and data flow
3. **API changes** and new endpoints
4. **Component documentation** for the currency converter UI
5. **Usage examples** and scenarios
6. **Testing guidelines** for currency conversion accuracy

### Success Criteria
- [x] Currency converter only visible when "All Licensees" selected
- [x] Individual licensee data displays in native currency without conversion
- [x] "All Licensees" data properly converted to base currency before aggregation
- [x] User can select different base currencies (USD, TTD, GYD, BBD)
- [x] Exchange rates clearly displayed and accurate
- [x] Real-time updates when currency selection changes
- [x] Auto-sync behavior works correctly when switching licensees
- [x] Responsive design works on all screen sizes
- [x] Error handling for conversion failures
- [x] Comprehensive documentation created

### Author Information
- **Author**: Aaron Hazzard - Senior Software Engineer
- **Last Updated**: August 29th, 2025

---

**Note**: This implementation builds upon the existing currency system in the codebase. Ensure compatibility with existing `CurrencyFilter` component and `useCurrencyStore` while adding the new "All Licensees" functionality.
