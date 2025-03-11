import { Schema, model, models } from "mongoose"

const MeterSchema = new Schema({
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
})

MeterSchema.index({readAt: 1})
MeterSchema.index({location: 1})
MeterSchema.index({machine: 1})


export const Meter = models.Meter || model("meters", MeterSchema)
