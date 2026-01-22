import type { Scheduler } from '@/lib/types/api';
import mongoose, { Schema } from 'mongoose';

// Define the Mongoose schema
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
      enum: ['pending', 'completed', 'canceled'], // Use enum validator
      default: 'pending', // Set a default status
      required: true,
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt
);

// Create and export the Mongoose model
// Check if the model already exists to prevent overwriting
export default mongoose.models.Scheduler ||
  mongoose.model<Scheduler>('Scheduler', SchedulerSchema, 'schedulers');
