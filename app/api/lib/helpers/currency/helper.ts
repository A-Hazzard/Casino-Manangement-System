import { convertCurrency, getLicenceeCurrency } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';

/**
 * Check if currency conversion should be applied based on licencee selection
 * @param licencee - The selected licencee or 'all'
 * @returns boolean indicating if conversion is needed
 */
export function shouldApplyCurrencyConversion(
  licencee: string | null
): boolean {
  return !licencee || licencee === 'all' || licencee === '';
}

/**
 * Financial fields that need currency conversion from meters movement object
 */
const FINANCIAL_FIELDS = [
  'drop',
  'totalCancelledCredits',
  'coinIn',
  'coinOut',
  'jackpot',
  'gamesPlayed',
  'gamesWon',
] as const;

/**
 * Convert financial fields in an object from one currency to another
 * @param data - Object containing financial fields
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Object with converted financial fields
 */
function convertFinancialFields<T extends Record<string, unknown>>(
  data: T,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): T {
  if (fromCurrency === toCurrency) {
    return data;
  }

  const converted: Record<string, unknown> = { ...data };

  for (const field of FINANCIAL_FIELDS) {
    const value = converted[field];
    if (typeof value === 'number') {
      converted[field] = convertCurrency(
        value,
        fromCurrency,
        toCurrency
      );
    }
  }

  return converted as T;
}

/**
 * Apply currency conversion to financial metrics data based on licencee and display currency
 * @param data - Financial data object or array of objects
 * @param licencee - Selected licencee or 'all'
 * @param displayCurrency - Target currency for display
 * @returns Converted financial data
 */
export async function applyCurrencyConversionToMetrics<T>(
  data: T,
  licencee: string | null,
  displayCurrency: CurrencyCode
): Promise<T> {
  // No conversion needed if not in "All Licencee" mode
  if (!shouldApplyCurrencyConversion(licencee)) {
    return data;
  }

  // No conversion needed if display currency is USD
  if (displayCurrency === 'USD') {
    return data;
  }

  // Helper function to convert a single object
  const convertObject = (obj: unknown): unknown => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const record = obj as Record<string, unknown>;

    // If object has licencee information, convert based on that licencee's currency
    const objLicencee = (record['licencee'] || record['licencee']) as
      | string
      | undefined;
    const sourceCurrency = objLicencee
      ? getLicenceeCurrency(objLicencee)
      : 'USD';

    if (sourceCurrency !== displayCurrency) {
      return convertFinancialFields(record, sourceCurrency, displayCurrency);
    }
    return obj;
  };

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(convertObject) as T;
  }

  // Handle single objects
  return convertObject(data) as T;
}



/**
 * Get currency query parameter from request
 * @param searchParams - URLSearchParams object
 * @returns Currency code or 'USD' as default
 */
export function getCurrencyFromQuery(searchParams: URLSearchParams): CurrencyCode {
  const currency = searchParams.get('currency');
  const validCurrencies: CurrencyCode[] = ['USD', 'TTD', 'GYD', 'BBD'];
  return validCurrencies.includes(currency as CurrencyCode)
    ? (currency as CurrencyCode)
    : 'USD';
}

