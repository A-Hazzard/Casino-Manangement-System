import type { Scheduler } from '@/lib/types/api';
import mongoose, { Schema } from 'mongoose';

const SchedulerSchema: Schema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    creator: { type: String, required: true },
    collector: { type: String, required: true },
    location: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'canceled'],
      default: 'pending',
      required: true,
    },
    deletedAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Scheduler ||
  mongoose.model<Scheduler>('Scheduler', SchedulerSchema, 'schedulers');
