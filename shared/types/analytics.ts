// API-specific analytics types for Evolution1 CMS

// Stacked data type for hourly machine analytics
export type StackedData = {
  hour: string;
  [locationKey: string]:
    | {
        handle: number;
        winLoss: number;
        jackpot: number;
        plays: number;
      }
    | string;
};
