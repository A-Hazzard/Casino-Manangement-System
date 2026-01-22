/**
 * Bill Validator Types
 * Based on Angular implementation and acceptedBills.ts model
 */

// Time Period for filtering
export type BillValidatorTimePeriod =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'custom';

