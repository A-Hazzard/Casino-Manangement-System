import mongoose, { Schema } from 'mongoose';

export interface ISessionEntry {
  machineId: string;
  machineName?: string;
  source: 'manual' | 'meter';
  totalAmount: number;
  denominations: {
    denomination: number;
    quantity: number;
  }[];
  meters?: {
    billIn?: number;
    ticketIn?: number;
    totalIn?: number;
  };
  expectedDrop?: number;
  variance?: number;
  notes?: string;
  isEndOfDay: boolean;
  collectedAt: Date;
}

export interface IVaultCollectionSession extends mongoose.Document {
  locationId: string;
  vaultShiftId: string;
  type: 'machine_collection' | 'soft_count';
  status: 'active' | 'completed' | 'cancelled';
  isEndOfDay: boolean;
  startedBy: string;
  entries: ISessionEntry[];
  totalCollected: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VaultCollectionSessionSchema = new Schema<IVaultCollectionSession>(
  {
    locationId: { type: String, required: true },
    vaultShiftId: { type: String, required: true },
    type: {
      type: String,
      enum: ['machine_collection', 'soft_count'],
      default: 'soft_count'
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    isEndOfDay: { type: Boolean, default: false },
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
      isEndOfDay: { type: Boolean, default: false },
      collectedAt: { type: Date, default: Date.now }
    }],
    totalCollected: { type: Number, default: 0 },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

// Prevent multiple active sessions for same location/shift
VaultCollectionSessionSchema.index({ locationId: 1, vaultShiftId: 1, status: 1 });

export const VaultCollectionSession = mongoose.models.VaultCollectionSession || mongoose.model<IVaultCollectionSession>('VaultCollectionSession', VaultCollectionSessionSchema);
