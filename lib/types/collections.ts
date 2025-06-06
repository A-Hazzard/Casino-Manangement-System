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
