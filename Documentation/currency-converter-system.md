# Currency Converter System

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** August 29th, 2025  
**Version:** 2.0.0

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Details](#implementation-details)
5. [Business Logic](#business-logic)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)

## Overview

The Evolution One CMS includes a comprehensive currency converter system that handles multi-licensee financial data aggregation with proper currency conversion. This system ensures accurate financial reporting when viewing data across multiple licensees with different currencies, providing consistent and reliable financial calculations across all system components.

### Key Principles
- **Accuracy**: Precise currency conversion with fixed exchange rates
- **Consistency**: Uniform financial calculations across all licensees
- **Flexibility**: Support for multiple base currencies and conversion options
- **Performance**: Efficient conversion algorithms with minimal overhead

### System Integration
- **Multi-Licensee Support**: Seamless handling of different licensee currencies
- **Financial Reporting**: Accurate aggregation across currency boundaries
- **Dashboard Analytics**: Real-time currency conversion for analytics
- **Collection Systems**: Currency-aware collection and reporting calculations

## Key Features

### 1. Licensee-Specific Currency Display
- **TTG Licensee**: All financial data displayed in TTD (Trinidad & Tobago Dollar)
- **Cabana Licensee**: All financial data displayed in GYD (Guyanese Dollar)
- **Barbados Licensee**: All financial data displayed in BBD (Barbados Dollar)
- **No Conversion Required**: When viewing individual licensee data, no currency conversion is needed

### 2. Multi-Licensee Currency Conversion
- **"All Licensees" View**: When viewing data from all licensees, financial data is converted to a common base currency before aggregation
- **Default Base Currency**: USD (US Dollar)
- **User-Selectable Base Currencies**: USD, TTD, GYD, BBD
- **Smart Aggregation**: Prevents incorrect totals by converting currencies before summing

### 3. Fixed Exchange Rates
The system uses fixed exchange rates for consistent calculations:
- **USD**: 1.0 (base currency)
- **TTD**: 6.75 (1 USD = 6.75 TTD)
- **GYD**: 209.5 (1 USD = 209.5 GYD)
- **BBD**: 2.0 (1 USD = 2.0 BBD)

## Technical Architecture

### Core Components

#### 1. Currency Conversion Utilities
**File**: `lib/helpers/currencyConversion.ts`

Enhanced with new functions for multi-licensee scenarios:
- `convertMultiLicenseeFinancialData()`: Converts financial data from multiple licensees to a common base currency
- `aggregateMultiLicenseeFinancialData()`: Aggregates converted financial data with proper currency handling
- `shouldConvertForAllLicensees()`: Determines when currency conversion is needed
- `getAggregationBaseCurrency()`: Returns the appropriate base currency for aggregation

#### 2. Currency Store
**File**: `lib/store/currencyStore.ts`

Extended with new methods:
- `isAllLicenseesSelected()`: Checks if "All Licensees" is currently selected
- `shouldShowCurrencyConverter()`: Determines when to show the currency converter UI
- `setSelectedLicensee()`: Enhanced with auto-sync behavior for licensee-currency synchronization
- `formatAmount()`: Enhanced to handle currency conversion for individual vs. all licensees

#### 3. Currency Converter UI Component
**File**: `components/ui/AllLicenseesCurrencyConverter.tsx`

A comprehensive UI component that:
- Only renders when "All Licensees" is selected
- Provides dropdown for base currency selection
- Displays current exchange rates
- Shows licensee-to-currency mapping
- Includes explanatory information about the conversion process

#### 4. API Integration
**File**: `app/api/metrics/meters/route.ts`

Updated to:
- Accept `currency` parameter in requests
- Apply currency conversion for "All Licensees" scenarios
- Return properly converted financial data

### Data Flow

1. **User Selection**: User selects "All Licensees" from the licensee dropdown
2. **Auto-Sync**: Currency store automatically shows currency converter and sets default currency
3. **UI Display**: Currency converter component becomes visible
4. **Currency Selection**: User selects desired base currency (default: USD)
5. **Data Fetching**: API calls include currency parameter
6. **Conversion**: Backend converts all licensee data to base currency
7. **Aggregation**: Converted data is properly aggregated
8. **Display**: Frontend displays aggregated data in selected currency

### Auto-Sync Behavior

The system includes intelligent auto-sync functionality:

#### Individual Licensee Selection
- **TTG Selected**: Currency automatically switches to TTD, currency converter hidden
- **Cabana Selected**: Currency automatically switches to GYD, currency converter hidden  
- **Barbados Selected**: Currency automatically switches to BBD, currency converter hidden

#### All Licensees Selection
- **"All Licensees" Selected**: Currency converter appears, preserves user's last selected currency or defaults to USD
- **User Override**: When user manually selects a currency in "All Licensees" mode, this preference is preserved when switching back

#### Implementation Details
- **Header Component**: `handleLicenseeChange()` wrapper function syncs both dashboard and currency stores
- **Dashboard Page**: `useEffect` ensures currency store is always synchronized with dashboard licensee selection
- **State Management**: Currency store's `setSelectedLicensee()` method handles auto-sync logic

## User Experience

### Individual Licensee View
- **TTG Selected**: All data shows in TTD, no currency converter visible
- **Cabana Selected**: All data shows in GYD, no currency converter visible
- **Barbados Selected**: All data shows in BBD, no currency converter visible

### All Licensees View
- **Currency Converter Visible**: Appears below the refresh button
- **Base Currency Selection**: Dropdown with USD, TTD, GYD, BBD options
- **Exchange Rate Display**: Shows current rates for all currencies
- **Real-time Updates**: Currency changes immediately refresh all data
- **Clear Indication**: UI clearly shows which currency is being used

## Example Scenarios

### Scenario 1: TTG Licensee Selected
```
TTG Data: 100 TTD
Display: 100 TTD
Currency Converter: Hidden
```

### Scenario 2: All Licensees, USD Base
```
TTG Data: 100 TTD → Convert to USD: 100/6.75 = 14.81 USD
Cabana Data: 1000 GYD → Convert to USD: 1000/209.5 = 4.77 USD
Barbados Data: 50 BBD → Convert to USD: 50/2.0 = 25 USD
Total: 14.81 + 4.77 + 25 = 44.58 USD
```

### Scenario 3: All Licensees, TTD Base
```
TTG Data: 100 TTD → Already in TTD: 100 TTD
Cabana Data: 1000 GYD → Convert to TTD: 1000/209.5 * 6.75 = 32.22 TTD
Barbados Data: 50 BBD → Convert to TTD: 50/2.0 * 6.75 = 168.75 TTD
Total: 100 + 32.22 + 168.75 = 300.97 TTD
```

## Implementation Details

### Frontend Integration
- **Dashboard Page**: Updated to pass currency parameter through data fetching chain, includes `useEffect` for licensee synchronization
- **Header Component**: Enhanced with `handleLicenseeChange()` wrapper function for dual store synchronization
- **Layout Components**: Both PC and mobile layouts include the currency converter
- **State Management**: Currency state managed through Zustand store with auto-sync capabilities
- **Real-time Updates**: Currency changes trigger immediate data refresh

### Backend Processing
- **API Endpoints**: Updated to handle currency conversion parameters
- **Data Processing**: Financial data converted before aggregation
- **Error Handling**: Graceful fallback to original data if conversion fails
- **Performance**: Efficient conversion using fixed exchange rates

### Error Handling
- **Conversion Failures**: Falls back to original data if conversion fails
- **Missing Exchange Rates**: Uses default rates if rates are unavailable
- **Invalid Currency Codes**: Validates currency codes before processing
- **Network Issues**: Handles API failures gracefully

## Benefits

### 1. Accurate Financial Reporting
- Prevents incorrect aggregation of different currencies
- Ensures meaningful financial totals across licensees
- Provides clear understanding of actual financial performance

### 2. User Flexibility
- Users can view aggregated data in their preferred currency
- Real-time currency switching without page reload
- Clear indication of which currency is being used

### 3. System Reliability
- Fixed exchange rates ensure consistent calculations
- No dependency on external exchange rate APIs
- Graceful error handling and fallbacks

### 4. Performance
- Efficient conversion using pre-calculated rates
- Minimal impact on API response times
- Optimized data processing pipeline

## Future Enhancements

### Potential Improvements
1. **Historical Exchange Rates**: Support for historical rate data
2. **Rate Updates**: Admin interface for updating exchange rates
3. **Additional Currencies**: Support for more currencies as needed
4. **Rate Validation**: Automated rate validation and alerts
5. **Audit Trail**: Logging of currency conversions for compliance

### Integration Opportunities
1. **Reporting System**: Enhanced financial reports with currency conversion
2. **Export Features**: Export data in selected currencies
3. **Analytics**: Currency-based performance analytics
4. **Notifications**: Alerts for significant currency fluctuations

## Testing Guidelines

### Manual Testing
1. **Individual Licensees**: Verify data displays in correct currency
2. **All Licensees**: Test currency conversion accuracy
3. **Currency Switching**: Verify real-time updates
4. **Error Scenarios**: Test fallback behavior
5. **Responsive Design**: Test on different screen sizes

### Automated Testing
1. **Unit Tests**: Test currency conversion functions
2. **Integration Tests**: Test API endpoints with currency parameters
3. **UI Tests**: Test currency converter component behavior
4. **Performance Tests**: Verify conversion doesn't impact performance

## Conclusion

The currency converter system provides a robust solution for handling multi-licensee financial data with proper currency conversion. It ensures accurate financial reporting while providing users with flexibility in how they view aggregated data. The system is designed for reliability, performance, and ease of use.

---

**Author**: Aaron Hazzard - Senior Software Engineer  
**Last Updated**: August 29th, 2025
