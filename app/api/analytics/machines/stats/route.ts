import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    // Support both 'licensee' and 'licencee'
    const licensee = searchParams.get('licensee') || searchParams.get('licencee');

    // Make licensee optional - if not provided or "all", we'll get stats for all machines
    const effectiveLicensee =
      licensee && licensee.toLowerCase() !== 'all' ? licensee : null;

    const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);

    // Build match stage for machines
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // Derive allowed locations based on user, roles, and optional selected licensee
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions =
      (
        userPayload?.resourcePermissions as {
          'gaming-locations'?: { resources?: string[] };
        }
      )?.['gaming-locations']?.resources || [];

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      effectiveLicensee ?? undefined,
      userLocationPermissions,
      userRoles
    );

    if (allowedLocationIds !== 'all') {
      // If user has no allowed locations, return zero stats early
      if (!Array.isArray(allowedLocationIds) || allowedLocationIds.length === 0) {
        const zeroStats = {
          totalDrop: 0,
          totalCancelledCredits: 0,
          totalGross: 0,
          totalMachines: 0,
          onlineMachines: 0,
          sasMachines: 0,
        };
        return NextResponse.json({
          stats: zeroStats,
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
        });
      }
      machineMatchStage.gamingLocation = { $in: allowedLocationIds };
    }

    // Use a simpler approach - count machines directly
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );
    }

    // Count totals and online in parallel - only count machines with lastActivity
    const [totalMachines, onlineMachines] = await Promise.all([
      db.collection('machines').countDocuments({
        ...machineMatchStage,
        lastActivity: { $exists: true }, // Only count machines with lastActivity field
      }),
      db.collection('machines').countDocuments({
        ...machineMatchStage,
        lastActivity: { $gte: onlineThreshold }, // This already filters for existing lastActivity
      }),
    ]);

    // Count SAS machines
    const sasMachines = await db.collection('machines').countDocuments({
      ...machineMatchStage,
      isSasMachine: true,
    });

    // Get financial totals (this might be empty if no financial data exists)
    const financialTotals = await db
      .collection('machines')
      .aggregate([
        { $match: machineMatchStage },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: { $ifNull: ['$sasMeters.drop', 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ['$sasMeters.totalCancelledCredits', 0] },
            },
            totalGross: {
              $sum: {
                $subtract: [
                  { $ifNull: ['$sasMeters.drop', 0] },
                  { $ifNull: ['$sasMeters.totalCancelledCredits', 0] },
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const financials = financialTotals[0] || {
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0,
    };

    const stats = {
      totalDrop: financials.totalDrop,
      totalCancelledCredits: financials.totalCancelledCredits,
      totalGross: financials.totalGross,
      totalMachines,
      onlineMachines,
      sasMachines,
    };

    // console.log("🔍 Machine stats API - Licensee:", effectiveLicensee);
    // console.log("🔍 Machine stats API - Total machines:", totalMachines);
    // console.log("🔍 Machine stats API - Online machines:", onlineMachines);
    // console.log("🔍 Machine stats API - SAS machines:", sasMachines);

    return NextResponse.json({
      stats,
      totalMachines: stats.totalMachines,
      onlineMachines: stats.onlineMachines,
      offlineMachines: stats.totalMachines - stats.onlineMachines,
    });
  } catch (error) {
    console.error('Error fetching machine stats:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch machine stats',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
