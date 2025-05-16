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
