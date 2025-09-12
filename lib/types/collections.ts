export type Location = {
  _id: string;
  name: string;
};

export type MachineData = {
  id: string;
  name: string;
  prevMetersIn?: number | string;
  prevMetersOut?: number | string;
};

export type CabinetData = {
  id: string;
  name: string;
  locationId?: string;
  machines: MachineData[];
  prevIn?: number;
  prevOut?: number;
};

export type CollectionReportMachineEntry = {
  machineId: string;
  machineName: string;
  collectionTime: string; // Should be ISO string e.g., new Date().toISOString()
  metersIn: number | string;
  metersOut: number | string;
  notes?: string;
  useCustomTime: boolean;
  selectedDate: string; // Store date as string e.g. YYYY-MM-DD
  timeHH: string;
  timeMM: string;
};

export type LocationSelectItem = {
  _id: string; // Or id, matching whatever is used
  name: string;
};

export type CollectionSasMeters = {
  machine: string;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  gamesPlayed: number;
  jackpot: number;
  sasStartTime: string;
  sasEndTime: string;
};

export type CollectionMovement = {
  metersIn: number;
  metersOut: number;
  gross: number;
};

export type CollectionDocument = {
  _id: string;
  isCompleted: boolean;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  softMetersIn: number;
  softMetersOut: number;
  notes: string;
  timestamp: Date;
  location: string;
  collector: string;
  locationReportId: string;
  sasMeters: CollectionSasMeters;
  movement: CollectionMovement;
  machineCustomName: string;
  machineId: string;
  machineName: string;
  ramClear?: boolean;
  serialNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

// Collection Creation Types
export type CreateCollectionPayload = {
  machineId: string;
  location: string;
  collector: string;
  metersIn: number;
  metersOut: number;
  sasStartTime?: Date;
  sasEndTime?: Date;
  notes?: string;
  locationReportId?: string;
  machineCustomName?: string;
  machineName?: string;
  serialNumber?: string;
  isCompleted?: boolean;
  ramClear?: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
};

export type SasMetricsCalculation = {
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  sasStartTime: string;
  sasEndTime: string;
  gamesPlayed: number;
  jackpot: number;
};

export type MovementCalculation = {
  metersIn: number;
  metersOut: number;
  gross: number;
};

export type PreviousCollectionMeters = {
  metersIn: number;
  metersOut: number;
  collectionTime?: Date;
};

export type MachineCollectionUpdate = {
  machineId: string;
  metersIn: number;
  metersOut: number;
  collectionTime: Date;
};
