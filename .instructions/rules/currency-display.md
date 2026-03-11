---
description: Currency Display and Conversion Rules
---

# Currency Framework Guidelines

## 1. Overview
The Evolution One CMS uses a dynamic currency conversion engine. Operations default to `USD` as the base currency. For individual licencees, currency is auto-resolved based on `getLicenceeCurrency` or `getCountryCurrency`. When "All Licencees" is selected, the application provides a dropdown header allowing the user (Admins/Developers) to switch the view between multiple currencies (USD, TTD, GYD, BBD, etc.).

## 2. Global State and Context
- The selected global currency is stored in `dashboardStore` as `displayCurrency`.
- `CurrencyContext.tsx` strictly controls resolving and converting this global state.
- Components should grab the current currency via the `useCurrencyFormat()` hook (which exports `displayCurrency`).

## 3. API Data Fetching
- APIs (like `search-all/route.ts` or `reports/locations/route.ts`) take `?currency=[displayCurrency]`.
- The APIs do the heavy lifting of converting raw DB amounts (stored in the licencee's native currency) into the request's `displayCurrency`.
- Therefore, frontend UI components **rarely** need to do math conversions. They just need to display the values properly.

## 4. Currency Display Rules
**CRITICAL**: You must *never* hardcode `$` or use the `style: 'currency', currency: 'USD'` property in `Intl.NumberFormat` locally inside a React component. 

* The universal format for financial strings is: `[Sign][CurrencyCode] [Amount]`
* Example Positive: `USD 10,000.00`
* Example Negative: `-BBD 2,000.00`

### Displaying Values in UI
When rendering tables, charts, or cards:
1. Fetch the selected currency: `const { displayCurrency } = useCurrencyFormat();`
2. Pass `displayCurrency` as a prop if your table is a child component.
3. Use the global utility `formatCurrencyWithCodeString(amount, displayCurrency)` from `lib/utils/currency.ts` to render the string.

### Handling Null/NaN Letdowns
If a metric is `null`, `undefined`, or `NaN`, the formatter will output `--` or `-` (for technicians). Ensure error handling doesn't crash the table columns.

## 5. Chart Tooltips
Chart tooltips must also follow this rule. Instead of hardcoding `$` in Recharts tooltip wrappers, use the `formatCurrencyWithCodeString` function with the active `displayCurrency`.
