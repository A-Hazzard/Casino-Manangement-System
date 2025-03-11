/**
 * Represents a generic filter for querying collections like meters, machines, and locations.
 */
export type QueryFilter = {
    userId?: string;
    location?: string
    machine?: string
    readAt?: {
        $gte: Date
        $lte: Date
    }
}
export type aggregateUserMetircsQueryFilter = {
    location: {
      $in: string[]
    }
    readAt: {
      $gte: Date
      $lte: Date
    }
}

/**
 * Represents the trend data for meters, including financial transactions and gameplay stats.
 */
// export type MeterTrend = {
//   machine: ObjectId
//   location: ObjectId
//   drop: number
//   totalCancelledCredits: number
//   gross: number
//   gamesPlayed: number
//   jackpot: number
//   bills?: {
//     reported: Bill[]
//     collected: Bill[]
//   }
//   stats?: {
//     bills: BillStats[]
//     hold: HoldStats
//     jackpot: JackpotStats
//   }
// }

/**
 * Represents the date range for filtering queries.
 */
export type CustomDate = {
    startDate: Date
    endDate: Date
}

/**
 * Represents the structure of various query parameters used in API calls.
 */
// export type QueryParams = {
//   timePeriod?: string
//   startDate?: string
//   endDate?: string
//   location?: string
//   machine?: string
//   licencee?: string
//   stats?: string
//   isCompareReport?: string
//   isExportReport?: string
//   ischartData?: string
//   isTop5MachReport?: string
//   chartUnit?: string
//   gameType?: string
// }

/**
 * Represents a bill transaction linked to a specific machine.
 */
// type Bill = {
//   bill: number
//   machine: ObjectId
//   total: number
//   count: number
// }

/**
 * Represents statistical data about bills collected vs reported.
 */
// type BillStats = {
//   bill: number
//   totalCollected: number
//   totalReported: number
//   variance: number
// }

/**
 * Represents the theoretical and actual hold percentages for a gaming machine.
 */
// type HoldStats = {
//   theoretical: number | null
//   actual: number | null
//   variance: number | null
// }

/**
 * Represents jackpot statistics, comparing metered vs actual jackpot payouts.
 */
// type JackpotStats = {
//   actual: number
//   metered: number
//   variance: number
// }
