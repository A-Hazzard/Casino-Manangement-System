import { convertCurrency, getLicenseeCurrency } from '@/lib/helpers/rates';

/**
 * Check if currency conversion should be applied based on licensee selection
 * @param licensee - The selected licensee or 'all'
 * @returns boolean indicating if conversion is needed
 */
export function shouldApplyCurrencyConversion(
  licensee: string | null
): boolean {
  return !licensee || licensee === 'all' || licensee === '';
}

/**
 * Financial fields that need currency conversion from meters movement object
 */
export const FINANCIAL_FIELDS = [
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
export function convertFinancialFields<T extends Record<string, unknown>>(
  data: T,
  fromCurrency: string,
  toCurrency: string
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
        fromCurrency as never,
        toCurrency as never
      );
    }
  }

  return converted as T;
}

/**
 * Apply currency conversion to financial metrics data based on licensee and display currency
 * @param data - Financial data object or array of objects
 * @param licensee - Selected licensee or 'all'
 * @param displayCurrency - Target currency for display
 * @returns Converted financial data
 */
export async function applyCurrencyConversionToMetrics<T>(
  data: T,
  licensee: string | null,
  displayCurrency: string
): Promise<T> {
  // No conversion needed if not in "All Licensee" mode
  if (!shouldApplyCurrencyConversion(licensee)) {
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

    // If object has licensee information, convert based on that licensee's currency
    const objLicensee = (record['licensee'] || record['licencee']) as
      | string
      | undefined;
    const sourceCurrency = objLicensee
      ? getLicenseeCurrency(objLicensee)
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
 * Apply currency conversion to aggregation results
 * @param aggregationResult - Result from MongoDB aggregation
 * @param licensee - Selected licensee or 'all'
 * @param displayCurrency - Target currency for display
 * @returns Converted aggregation result
 */
export async function applyCurrencyConversionToAggregation<T>(
  aggregationResult: T,
  licensee: string | null,
  displayCurrency: string
): Promise<T> {
  return applyCurrencyConversionToMetrics(
    aggregationResult,
    licensee,
    displayCurrency
  );
}

/**
 * Convert session financial metrics
 * @param sessions - Array of session objects
 * @param licensee - Selected licensee or 'all'
 * @param displayCurrency - Target currency for display
 * @returns Sessions with converted financial metrics
 */
export async function convertSessionFinancialMetrics<
  T extends Array<Record<string, unknown>>,
>(sessions: T, licensee: string | null, displayCurrency: string): Promise<T> {
  return applyCurrencyConversionToMetrics(sessions, licensee, displayCurrency);
}

/**
 * Get currency query parameter from request
 * @param searchParams - URLSearchParams object
 * @returns Currency code or 'USD' as default
 */
export function getCurrencyFromQuery(searchParams: URLSearchParams): string {
  return searchParams.get('currency') || 'USD';
}
