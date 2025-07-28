// Shared types for comparison reports - used by both frontend and backend

export type DatabaseConnection = any; // Replace with proper MongoDB connection type when available

export type MachineDocument = {
  _id: string;
  machineId?: string;
  sasMeters?: {
    drop?: number;
    gamesPlayed?: number;
    jackpot?: number;
    moneyOut?: number;
  };
  gameConfig?: {
    theoreticalRtp?: number;
  };
  gamingLocation?: string;
  location?: string;
  deletedAt?: Date;
};

export type CollectionDocument = {
  _id: string;
  machineId?: string;
  metersIn?: number;
  metersOut?: number;
  sasMeters?: {
    drop?: number;
    gamesPlayed?: number;
    jackpot?: number;
    moneyOut?: number;
  };
  timestamp?: Date;
  location?: string;
  gamingLocation?: string;
};

export type LocationDocument = {
  _id: string;
  name: string;
};
