import mongoose, { Schema } from 'mongoose';

const VaultCollectionSessionSchema = new Schema(
  {
    locationId: { type: String, required: true },
    vaultShiftId: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['machine_collection', 'soft_count'], 
      default: 'machine_collection' 
    },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'cancelled'], 
      default: 'active' 
    },
    startedBy: { type: String, required: true },
    entries: [{
      machineId: { type: String, required: true },
      machineName: { type: String }, // denormalized for easier display
      source: { type: String, enum: ['manual', 'meter'], default: 'manual' },
      
      // Physical Count
      totalAmount: { type: Number, required: true },
      denominations: [{
        denomination: { type: Number, required: true },
        quantity: { type: Number, required: true }
      }],
      
      // Meter Data (Snapshot at time of collection)
      meters: {
        billIn: { type: Number },
        ticketIn: { type: Number },
        totalIn: { type: Number }
      },
      
      // Variance
      expectedDrop: { type: Number },
      variance: { type: Number },
      
      notes: { type: String },
      collectedAt: { type: Date, default: Date.now }
    }],
    totalCollected: { type: Number, default: 0 },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

// Prevent multiple active sessions for same location/shift
VaultCollectionSessionSchema.index({ locationId: 1, vaultShiftId: 1, status: 1 });

export const VaultCollectionSession = mongoose.models.VaultCollectionSession || mongoose.model('VaultCollectionSession', VaultCollectionSessionSchema);
