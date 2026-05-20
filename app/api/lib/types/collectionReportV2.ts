import type { ReportedMachineStatus } from '@/app/api/lib/models/reportedMachines';

export type CaptureMachinePayload = {
  sessionId: string;
  machineId: string;
  machineName?: string;
  machineCustomName?: string;
  serialNumber?: string;
  manufacturer?: string;
  game?: string;
  locationId: string;
  locationName: string;
  licencee?: string;
  collector: string;
  collectorName?: string;
  /** SAS/system lifetime meters read from the machine */
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  /** Manual meters entered by the collector (only when metersMatch === false) */
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
  sasStartTime?: string;
  sasEndTime?: string;
  metersMatch?: boolean;
  sequenceOrder: number;
  status: ReportedMachineStatus;
  imageData?: string;
};

export type UpdateMachinePayload = Partial<
  Pick<
    CaptureMachinePayload,
    | 'status'
    | 'sasMetersIn'
    | 'sasMetersOut'
    | 'manualMetersIn'
    | 'manualMetersOut'
    | 'metersMatch'
    | 'sasStartTime'
    | 'sasEndTime'
  >
> & {
  imageCapturedAt?: string;
  notes?: string;
  removeImage?: boolean;
  imageData?: string;
};
