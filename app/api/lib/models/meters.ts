import { Schema, model, models } from "mongoose";

const MeterSchema = new Schema({
  _id: String,
  machine: { type: Schema.Types.ObjectId, ref: "Machine", required: true },
  location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  locationSession: { type: Schema.Types.ObjectId, ref: "LocationSession" },
  readAt: { type: Date, required: true },
  movement: {
    drop: Number,
    totalCancelledCredits: Number,
    gamesPlayed: Number,
    jackpot: Number,
    coinIn: Number,
    coinOut: Number,
  },
  viewingAccountDenomination: {
    drop: Number,
    totalCancelledCredits: Number,
    jackpot: Number,
  },
  coinIn: { type: Number },
  coinOut: { type: Number },
  totalCancelledCredits: { type: Number },
  totalHandPaidCancelledCredits: { type: Number },
  totalWonCredits: { type: Number },
  drop: { type: Number },
  jackpot: { type: Number },
  currentCredits: { type: Number },
  gamesPlayed: { type: Number },
  gamesWon: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/**
 * Mongoose model for meter readings, including references to machines and locations, and all meter fields.
 * Exported as 'Meter' for use in API routes and data access layers.
 */
const Meter = models.Meter || model("Meter", MeterSchema);
export { Meter };