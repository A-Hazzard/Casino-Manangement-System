import { Db, Filter, Document } from "mongodb";
import {
  AggregatedLocation,
  DateRange,
  LocationFilter,
  GamingLocation,
} from "@/lib/types/location";

/**
 * Aggregates and returns location metrics, including machine counts and online status, with optional filters.
 *
 * @param db - MongoDB database instance.
 * @param startDate - Start date for aggregation.
 * @param endDate - End date for aggregation.
 * @param includeAllLocations - Whether to include all locations or only those with metrics.
 * @param licencee - (Optional) Licencee filter for locations.
 * @param machineTypeFilter - (Optional) Machine type filter.
 * @returns Promise resolving to an array of AggregatedLocation objects.
 */
export const getLocationsWithMetrics = async (
  db: Db,
  { startDate, endDate }: DateRange,
  includeAllLocations = true,
  licencee?: string,
  machineTypeFilter?: LocationFilter
): Promise<AggregatedLocation[]> => {
  const onlineThreshold = new Date();
  onlineThreshold.setMinutes(onlineThreshold.getMinutes() - 3);

  const pipeline: Document[] = [
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$location",
        moneyIn: { $sum: "$movement.drop" },
        moneyOut: { $sum: "$movement.totalCancelledCredits" },
        machineIds: { $addToSet: "$machineId" },
      },
    },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "_id",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    ...(licencee
      ? [{ $match: { "locationDetails.rel.licencee": licencee } }]
      : []),
    {
      $addFields: {
        location: { $toString: "$_id" },
        locationName: {
          $ifNull: [
            { $arrayElemAt: ["$locationDetails.name", 0] },
            "Unknown Location",
          ],
        },
        isLocalServer: {
          $ifNull: [
            { $arrayElemAt: ["$locationDetails.isLocalServer", 0] },
            false,
          ],
        },
        noSMIBLocation: {
          $ifNull: [
            { $arrayElemAt: ["$locationDetails.noSMIBLocation", 0] },
            false,
          ],
        },
        gross: { $subtract: ["$moneyIn", "$moneyOut"] },
      },
    },
  ];

  const metrics = await db.collection("meters").aggregate(pipeline).toArray();

  const locationFilter: Filter<GamingLocation> = {
    deletedAt: { $in: [null, new Date(-1)] },
  };
  if (licencee) locationFilter["rel.licencee"] = licencee;

  const allLocations = includeAllLocations
    ? await db
        .collection<GamingLocation>("gaminglocations")
        .find(locationFilter)
        .toArray()
    : [];

  const allMachines = await db
    .collection("machines")
    .find({
      deletedAt: { $in: [null, new Date(-1)] },
    })
    .project({
      _id: 1,
      gamingLocation: 1,
      lastActivity: 1,
    })
    .toArray();

  const locationMachines: Record<string, { total: number; online: number }> =
    {};

  allMachines.forEach((machine) => {
    if (!machine.gamingLocation) return;

    const locationId = machine.gamingLocation.toString();
    if (!locationMachines[locationId]) {
      locationMachines[locationId] = { total: 0, online: 0 };
    }

    locationMachines[locationId].total++;

    if (
      machine.lastActivity &&
      new Date(machine.lastActivity) > onlineThreshold
    ) {
      locationMachines[locationId].online++;
    }
  });

  const enhancedMetrics = metrics.map((metric) => {
    const locationId = metric.location;
    const machineInfo = locationMachines[locationId] || {
      total: 0,
      online: 0,
    };

    return {
      ...metric,
      totalMachines: machineInfo.total,
      onlineMachines: machineInfo.online,
      noSMIBLocation: metric.noSMIBLocation === true,
      hasSmib: metric.noSMIBLocation !== true,
    } as AggregatedLocation;
  });

  const existingIds = new Set(enhancedMetrics.map((m) => m.location));
  const missing = includeAllLocations
    ? allLocations
        .filter((loc) => !existingIds.has(loc._id.toString()))
        .map((loc) => {
          const locationId = loc._id.toString();
          const machineInfo = locationMachines[locationId] || {
            total: 0,
            online: 0,
          };

          return {
            location: locationId,
            locationName: loc.name ?? "Unknown Location",
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
            totalMachines: machineInfo.total,
            onlineMachines: machineInfo.online,
            isLocalServer: !!loc.isLocalServer,
            noSMIBLocation: loc.noSMIBLocation === true,
            hasSmib: loc.noSMIBLocation !== true,
          };
        })
    : [];

  let combined = [...enhancedMetrics, ...missing];

  if (machineTypeFilter === "LocalServersOnly") {
    combined = combined.filter((loc) => loc.isLocalServer === true);
  } else if (machineTypeFilter === "SMIBLocationsOnly") {
    combined = combined.filter((loc) => loc.noSMIBLocation === false);
  } else if (machineTypeFilter === "NoSMIBLocation") {
    combined = combined.filter((loc) => loc.noSMIBLocation === true);
  }

  return combined.sort((a, b) => b.moneyIn - a.moneyIn);
};
