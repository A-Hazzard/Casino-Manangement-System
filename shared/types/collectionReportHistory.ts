export type MachineReportHistoryEntry = {
  reportId: string;
  reportVersion: 1 | 2;
  collectedAt: string;
  locationName: string;
  collectorName: string;
  machineGross: number;
  sasGross: number | null;
  variation: number | null;
  metersIn: number;
  metersOut: number;
  reportGross?: number;
  timeframeStart?: string;
  timeframeEnd?: string;
};

export type MachineReportHistoryResponse = {
  success: boolean;
  data: MachineReportHistoryEntry[];
};
