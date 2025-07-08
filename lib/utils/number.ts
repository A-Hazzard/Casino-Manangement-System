/**
 * Formats a number into a currency string with commas and two decimal places.
 * @param amount - The number to format.
 * @param currency - The currency code (e.g., 'USD'). Defaults to 'USD'.
 * @returns A formatted currency string (e.g., "$1,234.56").
 */
export const formatCurrency = (amount: number, currency: string = "USD"): string => {
  if (isNaN(amount)) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}; 