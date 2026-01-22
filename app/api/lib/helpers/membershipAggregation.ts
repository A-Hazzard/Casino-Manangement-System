/**
 * Aggregates member counts for a list of location IDs.
 * Filters out members deleted after a specific threshold (e.g., legacy data cleanup).
 * 
 * @param locationIds - Array of location IDs to aggregate members for.
 * @returns Promise resolving to a Map of location ID to member count.
 */
export async function getMemberCountsPerLocation(locationIds: string[]): Promise<Map<string, number>> {
  if (!locationIds || locationIds.length === 0) {
    return new Map();
  }

  // Use dynamic import to avoid potential connection/circular dependency issues
  const { Member } = await import('@/app/api/lib/models/members');

  const memberCounts = await Member.aggregate([
    {
      $match: {
        gamingLocation: { $in: locationIds.map(String) },
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
    },
    {
      $group: {
        _id: '$gamingLocation',
        count: { $sum: 1 },
      },
    },
  ]);

  const memberCountMap = new Map<string, number>();
  memberCounts.forEach((item: { _id: string; count: number }) => {
    memberCountMap.set(String(item._id), item.count);
  });
  
  return memberCountMap;
}
