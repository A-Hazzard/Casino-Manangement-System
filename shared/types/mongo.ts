// MongoDB aggregation and query types
export type MachineMatchStage = {
  [key: string]: unknown;
};

export type MachineAggregationMatchStage = {
  _id?: string;
  $or?: Array<{
    deletedAt: null | { $lt: Date };
  }>;
  [key: string]: unknown;
};
