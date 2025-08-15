export type ReportsLocationData = {
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
  nonSasMachines: number;
  hasSasMachines: boolean;
  hasNonSasMachines: boolean;
  isLocalServer: boolean;
  machines: Array<{
    id: string;
    serialNumber: string;
    game: string;
    isSasMachine: boolean;
    lastActivity?: Date;
  }>;
  meters: Array<{
    id: string;
    machineId: string;
    drop: number;
    cancelledCredits: number;
    createdAt: Date;
  }>;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ReportsLocationsResponse = {
  data: ReportsLocationData[];
  pagination: PaginationInfo;
}; 