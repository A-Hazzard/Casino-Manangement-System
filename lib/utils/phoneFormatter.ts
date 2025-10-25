/**
 * Formats a phone number into a readable format
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number or original if invalid
 */
export function formatPhoneNumber(
  phoneNumber: string | null | undefined
): string {
  if (!phoneNumber) return 'N/A';

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // If it's empty after cleaning, return N/A
  if (cleaned.length === 0) return 'N/A';

  // Format based on length
  switch (cleaned.length) {
    case 7:
      // Format as XXX-XXXX
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    case 10:
      // Format as (XXX) XXX-XXXX
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`;
    case 11:
      // Format as +X (XXX) XXX-XXXX
      return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(
        4,
        7
      )}-${cleaned.slice(7)}`;
    default:
      // For other lengths, just return the cleaned number
      return cleaned;
  }
}

/**
 * Validates if a phone number is in a valid format
 * @param phoneNumber - The phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPhoneNumber(
  phoneNumber: string | null | undefined
): boolean {
  if (!phoneNumber) return false;

  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15;
}
