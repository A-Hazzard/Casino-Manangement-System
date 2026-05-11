export type UseDashboardScrollReturn = {
  showFloatingRefresh: boolean;
  scrollThreshold: number;
  setScrollThreshold: (threshold: number) => void;
  resetScrollState: () => void;
};
