// MovementRequest type for movement requests
/**
 * Represents a movement request for a cabinet or other asset.
 */
export type MovementRequest = {
  /** Unique identifier */
  _id: string;
  /** Variance amount */
  variance: number;
  /** Previous balance */
  previousBalance: number;
  /** Current balance */
  currentBalance: number;
  /** Amount to collect */
  amountToCollect: number;
  /** Amount collected */
  amountCollected: number;
  /** Amount uncollected */
  amountUncollected: number;
  /** Partner profit */
  partnerProfit: number;
  /** Taxes */
  taxes: number;
  /** Advance */
  advance: number;
  /** Name of the location */
  locationName: string;
  /** Location from (name or id) */
  locationFrom: string;
  /** Location to (id) */
  locationTo: string;
  /** Location id */
  locationId: string;
  /** User who created the request */
  createdBy: string;
  /** Type of movement (e.g., 'cabinet') */
  movementType: string;
  /** Installation type (e.g., 'new_install') */
  installationType: string;
  /** Reason for movement */
  reason: string;
  /** User to whom the request is sent */
  requestTo: string;
  /** Cabinet in (id or name) */
  cabinetIn: string;
  /** Status of the request */
  status: MovementRequestStatus;
  /** Timestamp of the request */
  timestamp: Date;
  /** Creation date */
  createdAt: Date;
  /** Last update date */
  updatedAt: Date;
  /** Mongoose version key */
  __v?: number;
  /** Approved by (user email) */
  approvedBy?: string;
  /** Second approver (user email) */
  approvedBySecond?: string;
  /** Soft deletion timestamp */
  deletedAt?: Date;
};

/**
 * Status values for a movement request.
 */
export type MovementRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in progress';
