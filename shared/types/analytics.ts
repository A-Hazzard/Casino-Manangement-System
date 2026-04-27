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

