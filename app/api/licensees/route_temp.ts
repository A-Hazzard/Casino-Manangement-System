import { NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Licencee } from '@/app/api/lib/models/licencee';
import { generateMongoId } from '@/lib/utils/id';

export async function GET() {
  await connectDB();

  try {
    // Aggregate licensees with country names
    const licensees = await Licencee.aggregate([
      {
        $lookup: {
          from: 'countries',
          localField: 'country',
          foreignField: '_id',
          as: 'countryDetails',
        },
      },
      {
        $unwind: {
          path: '$countryDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          country: 1,
          countryName: '$countryDetails.name',
          startDate: 1,
          expiryDate: 1,
          lastEdited: { $ifNull: ['$lastEdited', '$updatedAt'] },
          createdAt: 1,
          updatedAt: 1,
          geoCoords: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);

    return new Response(JSON.stringify({ licensees }), { status: 200 });
  } catch (error) {
    console.error('Error fetching licensees:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to fetch licensees' }),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { name, description, country, startDate, expiryDate } = body;

  if (!name || !country) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Name and country are required',
      }),
      { status: 400 }
    );
  }

  try {
    // Generate a proper MongoDB ObjectId-style hex string for the licensee
    const licenseeId = await generateMongoId();

    const licensee = await Licencee.create({
      _id: licenseeId,
      name,
      description,
      country,
      startDate:
        startDate !== undefined
          ? startDate
            ? new Date(startDate)
            : null
          : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      lastEdited: new Date(),
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
    });

    return new Response(JSON.stringify({ success: true, licensee }), {
      status: 201,
    });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { _id, name, description, country, startDate, expiryDate } = body;

  if (!_id || !name || !country) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'ID, name and country are required',
      }),
      { status: 400 }
    );
  }

  try {
    const updated = await Licencee.findOneAndUpdate(
      { _id: _id },
      {
        name,
        description,
        country,
        startDate:
          startDate !== undefined
            ? startDate
              ? new Date(startDate)
              : null
            : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        lastEdited: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return new Response(
        JSON.stringify({ success: false, message: 'Licensee not found' }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify({ success: true, licensee: updated }), {
      status: 200,
    });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { _id } = body;

  if (!_id) {
    return new Response(
      JSON.stringify({ success: false, message: 'Licensee ID is required' }),
      { status: 400 }
    );
  }

  try {
    const deleted = await Licencee.findByIdAndUpdate(
      _id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, message: 'Licensee not found' }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error & { message?: string };
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
}
