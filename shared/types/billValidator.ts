/**
 * Bill Validator Types
 * Based on Angular implementation and acceptedBills.ts model
 */

// Accepted Bill from database (acceptedBills collection)
export type AcceptedBill = {
  _id: string;
  value: number; // denomination value
  machine: string; // machine ID
  member: string; // member ID
  createdAt: string;
  updatedAt: string;
};

// Bill Validator Note Info (from Angular)
export type NoteInfo = {
  denomination: number;
  quantity: number;
  _id?: string; // for React keys
};

// Bill Validator Data (from machine.billValidator)
export type BillValidatorData = {
  balance: number;
  notes: NoteInfo[];
};

// Bill Meters Data (from machine.billMeters - V2)
export type BillMetersData = {
  dollar1?: number;
  dollar2?: number;
  dollar5?: number;
  dollar10?: number;
  dollar20?: number;
  dollar50?: number;
  dollar100?: number;
  dollar200?: number;
  dollar500?: number;
  dollar1000?: number;
  dollar2000?: number;
  dollar5000?: number;
  dollarTotal?: number;
  dollarTotalUnknown?: number;
};

// Bill Validator Options (from location.billValidatorOptions)
export type BillValidatorOptions = {
  denom1?: boolean;
  denom2?: boolean;
  denom5?: boolean;
  denom10?: boolean;
  denom20?: boolean;
  denom50?: boolean;
  denom100?: boolean;
  denom200?: boolean;
  denom500?: boolean;
  denom1000?: boolean;
  denom2000?: boolean;
  denom5000?: boolean;
};

// Time Period for filtering
export type BillValidatorTimePeriod =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "custom";

// Bill Validator Form Data (for collection)
export type BillValidatorFormData = {
  note_1?: number;
  note_2?: number;
  note_5?: number;
  note_10?: number;
  note_20?: number;
  note_50?: number;
  note_100?: number;
  note_200?: number;
  note_500?: number;
};

// Processed Bill Data (for display)
export type ProcessedBillData = {
  denomination: number;
  label: string;
  quantity: number;
  subtotal: number;
  isUnknown?: boolean;
};

// Bill Validator Summary
export type BillValidatorSummary = {
  totalQuantity: number;
  totalAmount: number;
  totalUnknown: number;
  grandTotal: number;
  currentBalance: number;
};
