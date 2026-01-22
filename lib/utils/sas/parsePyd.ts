/**
 * SAS Meters Payload Parser
 *
 * Slice-based string parser for SAS `rsp pyd` payloads.
 *
 * Format:
 * - Header: address(2), command(2), length(2), gameNumber(4)
 * - Exactly 10 meters, each: meterCode(4), meterSize(2), meterValue(size*2 hex chars)
 * - CRC at end (4 chars)
 *
 * Features:
 * - Parses core SAS meter values from raw pyd hex strings
 * - Handles error and invalid format cases
 * - Returns a structured object with key meter values
 *
 * Values are BCD (Binary Coded Decimal) - parse as decimal (base 10).
 */

// ============================================================================
// Types
// ============================================================================
export type SasMetersParsed = {
  totalCoinCredits?: number;
  totalCoinOut?: number;
  totalCancelledCredits?: number;
  totalHandPaidCancelCredits?: number;
  totalWonCredits?: number;
  totalDrop?: number;
  totalAttendantPaidProgressiveWin?: number;
  currentCredits?: number;
  total20KBillsAccepted?: number;
  total200BillsToDrop?: number;
  error?: string;
  pyd?: string;
};

// ============================================================================
// Parsing Functions
// ============================================================================
/**
 * Parse a SAS pyd HEX string and return key meters.
 * Values are BCD (Binary Coded Decimal) - parse as decimal (base 10).
 */
export function parseSasPyd(pyd: string): SasMetersParsed {
  const result: SasMetersParsed = {};

  // Handle error cases
  if (!pyd || pyd === '-1') {
    return { error: 'An error occurred: -1', pyd };
  }

  if (pyd.length < 10) {
    return { error: 'Invalid pyd format', pyd };
  }

  try {
    // Start after header: address(2), command(2), length(2), gameNumber(4) = 10 chars
    let idx = 10;

    // Loop through exactly 10 meters (as per SAS protocol)
    for (let i = 0; i < 10; i++) {
      // Read meter code (4 chars starting at idx)
      const code = pyd.slice(idx, idx + 4);

      // Read meter length (2 chars after code)
      const len = parseInt(pyd.slice(idx + 4, idx + 6), 16);
      const meterLength = len * 2;

      // Extract value based on meter length
      const val = pyd.slice(idx + 6, idx + 6 + meterLength);
      const value = val ? parseInt(val, 10) : 0; // BCD - parse as decimal

      // Store in result object based on code
      switch (code) {
        case '0000':
          result.totalCoinCredits = value;
          break;
        case '0100':
          result.totalCoinOut = value;
          break;
        case '0400':
          result.totalCancelledCredits = value;
          break;
        case '0300':
          result.totalHandPaidCancelCredits = value;
          break;
        case '2200':
          result.totalWonCredits = value;
          break;
        case '2400':
          result.totalDrop = value;
          break;
        case '0200':
          result.totalAttendantPaidProgressiveWin = value;
          break;
        case '0C00':
          result.currentCredits = value;
          break;
        case '0500':
          result.total20KBillsAccepted = value;
          break;
        case '0600':
          result.total200BillsToDrop = value;
          break;
        default:
          break;
      }

      // Update idx for next meter (special handling for last meter)
      if (i !== 9) {
        idx = idx + meterLength + 6;
      } else {
        idx += meterLength;
      }
    }
  } catch (error) {
    console.error('Error parsing SAS pyd:', error);
    return { error: 'Failed to parse pyd: ' + error, pyd };
  }

  return result;
}

