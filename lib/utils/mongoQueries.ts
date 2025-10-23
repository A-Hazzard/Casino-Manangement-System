/**
 * MongoDB Query Helpers for Data Verification
 *
 * These queries can be run in MongoDB Compass or mongo shell to verify data
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: October 23rd, 2025
 */

export const MONGO_QUERIES = {
  // Collection Reports - Check if data exists and respects date filters
  collectionReports: {
    // Get all collection reports
    getAll: `db.collectionreports.find({}).sort({timestamp: -1}).limit(10)`,

    // Get collection reports for a specific date range
    byDateRange: (startDate: string, endDate: string) =>
      `db.collectionreports.find({
        timestamp: {
          $gte: new Date("${startDate}"),
          $lte: new Date("${endDate}")
        }
      }).sort({timestamp: -1})`,

    // Get collection reports for a specific licencee
    byLicencee: (licenceeId: string) =>
      `db.collectionreports.aggregate([
        {
          $lookup: {
            from: "gaminglocations",
            localField: "location",
            foreignField: "_id",
            as: "locationDetails"
          }
        },
        { $unwind: "$locationDetails" },
        {
          $match: {
            "locationDetails.rel.licencee": ObjectId("${licenceeId}")
          }
        },
        { $sort: { timestamp: -1 } }
      ])`,

    // Get distinct location names from collection reports
    distinctLocations: `db.collectionreports.distinct("locationName")`,

    // Count total collection reports
    count: `db.collectionreports.countDocuments({})`,
  },

  // Gaming Locations - Check if locations exist
  gamingLocations: {
    // Get all gaming locations
    getAll: `db.gaminglocations.find({}).sort({name: 1})`,

    // Get locations by licencee
    byLicencee: (licenceeId: string) =>
      `db.gaminglocations.find({
        "rel.licencee": ObjectId("${licenceeId}")
      }).sort({name: 1})`,

    // Count total locations
    count: `db.gaminglocations.countDocuments({})`,

    // Get locations with their machines
    withMachines: `db.gaminglocations.aggregate([
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "gamingLocation",
          as: "machines"
        }
      },
      {
        $project: {
          name: 1,
          machineCount: { $size: "$machines" }
        }
      },
      { $sort: { name: 1 } }
    ])`,
  },

  // Machines - Check machine data
  machines: {
    // Get all machines
    getAll: `db.machines.find({}).sort({serialNumber: 1}).limit(10)`,

    // Get machines by location
    byLocation: (locationId: string) =>
      `db.machines.find({
        gamingLocation: ObjectId("${locationId}")
      }).sort({serialNumber: 1})`,

    // Count total machines
    count: `db.machines.countDocuments({})`,

    // Get online machines (active in last 5 minutes)
    online: `db.machines.find({
      lastActivity: {
        $gte: new Date(Date.now() - 5 * 60 * 1000)
      }
    }).sort({lastActivity: -1})`,
  },

  // Meters - Check meter data for financial calculations
  meters: {
    // Get recent meter readings
    recent: `db.meters.find({}).sort({readAt: -1}).limit(10)`,

    // Get meters for a specific machine
    byMachine: (machineId: string) =>
      `db.meters.find({
        machine: ObjectId("${machineId}")
      }).sort({readAt: -1})`,

    // Get meters for a date range
    byDateRange: (startDate: string, endDate: string) =>
      `db.meters.find({
        readAt: {
          $gte: new Date("${startDate}"),
          $lte: new Date("${endDate}")
        }
      }).sort({readAt: -1})`,
  },

  // Monthly Report Verification
  monthlyReport: {
    // Check if collection reports exist for current month
    currentMonth: `db.collectionreports.find({
      timestamp: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        $lte: new Date()
      }
    }).sort({timestamp: -1})`,

    // Get monthly aggregation
    aggregation: (startDate: string, endDate: string) =>
      `db.collectionreports.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date("${startDate}"),
              $lte: new Date("${endDate}")
            }
          }
        },
        {
          $group: {
            _id: "$locationName",
            totalGross: { $sum: "$totalGross" },
            amountCollected: { $sum: "$amountCollected" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalGross: -1 } }
      ])`,
  },
};

/**
 * Helper function to generate a query for testing
 */
export function generateQuery(
  type: keyof typeof MONGO_QUERIES,
  query: string,
  params?: Record<string, string>
): string {
  const baseQuery =
    MONGO_QUERIES[type][query as keyof (typeof MONGO_QUERIES)[typeof type]];

  if (typeof baseQuery === "function" && params) {
    return (baseQuery as (...args: unknown[]) => string)(params);
  }

  return baseQuery as string;
}

/**
 * Common verification queries
 */
export const VERIFICATION_QUERIES = {
  // Check if collection reports exist
  checkCollectionReports: MONGO_QUERIES.collectionReports.count,

  // Check if locations exist
  checkLocations: MONGO_QUERIES.gamingLocations.count,

  // Check if machines exist
  checkMachines: MONGO_QUERIES.machines.count,

  // Check recent collection reports
  recentReports: MONGO_QUERIES.collectionReports.getAll,

  // Check locations with machines
  locationsWithMachines: MONGO_QUERIES.gamingLocations.withMachines,

  // Check current month data
  currentMonthData: MONGO_QUERIES.monthlyReport.currentMonth,
};
