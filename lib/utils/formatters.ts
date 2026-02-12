/**
 * Format Activity Type
 * Converts underscore-separated activity types to human-readable Title Case
 * 
 * @param type - Activity type with underscores (e.g., "cashier_shift_open")
 * @returns Human-readable title case string (e.g., "Cashier Shift Open")
 * 
 * @example
 * formatActivityType("cashier_shift_open") // "Cashier Shift Open"
 * formatActivityType("vault_open") // "Vault Open"
 * formatActivityType("float_increase") // "Float Increase"
 */
export function formatActivityType(type: string): string {
  if (!type) return '';
  
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
