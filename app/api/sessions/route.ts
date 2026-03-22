import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { MachineSession } from '@/app/api/lib/models/machineSessions';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching sessions
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const sortBy = searchParams.get('sortBy') || 'startTime';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      const licencee = searchParams.get('licencee') || '';
      const dateFilter = searchParams.get('dateFilter') || 'all';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');

      const query: Record<string, unknown> = {};
      if (search) {
        query.$or = [
          { _id: { $regex: search, $options: 'i' } },
          { machineId: { $regex: search, $options: 'i' } },
          { memberId: { $regex: search, $options: 'i' } },
        ];
      }

      if (startDateParam && endDateParam) {
        query.startTime = { $gte: new Date(startDateParam), $lte: new Date(endDateParam) };
      } else if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date | undefined;

        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
          default:
            startDate = new Date(0);
        }
        if (endDate) query.startTime = { $gte: startDate, $lte: endDate };
        else query.startTime = { $gte: startDate };
      }

      const basePipeline = [
        { $match: query },
        { $lookup: { from: 'machines', localField: 'machineId', foreignField: '_id', as: 'machine' } },
        { $unwind: { path: '$machine', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'gaminglocations', localField: 'machine.gamingLocation', foreignField: '_id', as: 'location' } },
        { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'licencees', localField: 'location.rel.licencee', foreignField: '_id', as: 'licencee' } },
        { $unwind: { path: '$licencee', preserveNullAndEmptyArrays: true } },
        ...(licencee && licencee !== 'All Licencees' ? [{ $match: { 'licencee.name': licencee } }] : []),
      ];

      const countResult = await MachineSession.aggregate([...basePipeline, { $count: 'total' }]);
      const totalSessions = countResult[0]?.total || 0;

      const sessions = await MachineSession.aggregate([
        ...basePipeline,
        { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'member' } },
        { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            machineName: { $ifNull: ['$machine.custom.name', '$machine.serialNumber', 'Unknown'] },
            memberName: {
              $cond: {
                if: { $ne: ['$member', null] },
                then: { $concat: [{ $ifNull: ['$member.profile.firstName', ''] }, ' ', { $ifNull: ['$member.profile.lastName', ''] }] },
                else: null,
              },
            },
            relevanceScore: search ? 1 : 0 // Simplified relevance for refactor
          },
        },
        { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            sessionId: '$_id',
            machineId: 1,
            machineName: 1,
            machineSerialNumber: '$machine.serialNumber',
            locationName: { $ifNull: ['$location.name', 'Unknown Location'] },
            memberId: 1,
            memberName: 1,
            startTime: 1,
            endTime: 1,
            gamesPlayed: 1,
            points: 1,
            status: { $cond: { if: { $eq: ['$endTime', null] }, then: 'active', else: 'completed' } },
            duration: {
              $cond: {
                if: { $and: [{ $ne: ['$startTime', null] }, { $ne: ['$endTime', null] }] },
                then: { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60000] },
                else: null,
              },
            },
          },
        },
      ]);

      const duration = Date.now() - startTime;
      if (duration > 2000) console.warn(`[Sessions API] Completed in ${duration}ms`);

      return NextResponse.json({
        success: true,
        data: {
          sessions,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalSessions / limit),
            totalSessions,
            hasNextPage: page * limit < totalSessions,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error(`[Sessions API] Error:`, error);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  });
}


