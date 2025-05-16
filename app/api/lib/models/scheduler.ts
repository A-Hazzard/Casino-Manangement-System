import mongoose, { Schema, Document } from "mongoose";

// Define the type for the Scheduler document
export type IScheduler = Document & {
  licencee: string;
  location: string;
  collector: string;
  creator: string;
  startTime: Date;
  endTime: Date;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

// Define the Mongoose schema
const SchedulerSchema: Schema = new Schema(
  {
    creator: { type: String, required: true },
    collector: { type: String, required: true },
    location: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "canceled"], // Use enum validator
      default: "pending", // Set a default status
      required: true,
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt
);

// Create and export the Mongoose model
// Check if the model already exists to prevent overwriting
export default mongoose.models.Scheduler ||
  mongoose.model<IScheduler>("Scheduler", SchedulerSchema, "schedulers");
