import { connectDB } from '@/app/api/lib/middleware/db';
import { FeedbackModel } from '@/app/api/lib/models/feedback';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  category: z.enum(['bug', 'suggestion', 'general-review', 'feature-request', 'performance', 'ui-ux', 'other']),
  description: z
    .string()
    .min(10, 'Feedback description must be at least 10 characters')
    .max(5000, 'Feedback description cannot exceed 5000 characters'),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validationResult = feedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, category, description } = validationResult.data;

    // Generate unique ID for feedback
    const feedbackId = new Date().getTime().toString() + Math.random().toString(36).substring(2, 9);

    const feedback = new FeedbackModel({
      _id: feedbackId,
      email: email.toLowerCase().trim(),
      category,
      description: description.trim(),
      submittedAt: new Date(),
      status: 'pending',
    });

    await feedback.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your feedback!',
        feedbackId: feedback._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit feedback. Please try again later.',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is admin or developer
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (currentUser.roles as string[]) || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const emailFilter = searchParams.get('email') || '';
    const categoryFilter = searchParams.get('category') || '';
    const statusFilter = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};

    if (emailFilter) {
      query.email = { $regex: emailFilter, $options: 'i' };
    }

    if (categoryFilter) {
      query.category = categoryFilter;
    }

    if (statusFilter) {
      query.status = statusFilter;
    }

    // Get total count for pagination
    const totalCount = await FeedbackModel.countDocuments(query);

    // Fetch feedback with pagination
    const feedback = await FeedbackModel.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json(
      {
        success: true,
        data: feedback,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedback. Please try again later.',
      },
      { status: 500 }
    );
  }
}

