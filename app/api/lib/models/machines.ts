import { model, models, Schema } from 'mongoose'

export const machineSchema = new Schema(
  {
    billValidator: {
      balance: { type: Number },
      notes: [
        {
          _id: { type: String },
          denomination: { type: Number },
          quantity: { type: Number },
        },
      ],
    },
    lockBvOnLogOut: { type: Boolean },
    playableBalance: { type: Number },
    machineId: { type: String },
    relayId: { type: String },
    deletedAt: { type: Date },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
    gamingLocation: { type: String },
    game: { type: String },
    Custom: {
      name: { type: String },
    },
    lastActivity: { type: Date },
    sasMeters: {
      drop: { type: Number },
      totalCancelledCredits: { type: Number },
      gamesPlayed: { type: Number },
      moneyOut: { type: Number },
      slotDoorOpened: { type: Number },
      powerReset: { type: Number },
      totalHandPaidCancelledCredits: { type: Number },
      coinIn: { type: Number },
      coinOut: { type: Number },
      totalWonCredits: { type: Number },
      jackpot: { type: Number },
      currentCredits: { type: Number },
    },
    gameConfig: {
      accountingDenomination: { type: Number },
    },
    orig: {
      meters: {
        coinIn: { type: String },
        coinOut: { type: String },
        drop: { type: String },
        jackpot: { type: String },
        gamesPlayed: { type: String },
        moneyOut: { type: String },
        slotDoorOpened: { type: String },
        powerReset: { type: String },
      },
      deletedAt: { type: Number },
    },
    manufacturer: { type: String },
    serialNumber: { type: String },
    gameNumber: { type: String },
    protocols: [
      {
        protocol: { type: String },
        version: { type: String },
      },
    ],
    numberOfEnabledGames: { type: Number },
    enabledGameNumbers: [{ type: String }],
    noOfGames: { type: Number },
    viewingAccountDenomination: [
      {
        asOf: { type: Date },
        denomination: { type: Number },
        meters: [{ type: String }],
        user: {
          role: { type: String },
        },
      },
    ],
    isSunBoxDevice: { type: Boolean },
    sessionHistory: [
      {
        gamingLocation: { type: String },
        date: { type: Date },
        reason: { type: String },
        performedBy: { type: String },
        _id: { type: String },
      },
    ],
    currentSession: { type: String },
    viewingAccountDenominationHistory: [
      {
        asOf: { type: Date },
        denomination: { type: Number },
        meters: [{ type: String }],
        user: {
          role: { type: String },
        },
      },
    ],
    selectedDenomination: {
      drop: { type: Number },
      totalCancelledCredits: { type: Number },
    },
  },
  { timestamps: true }
)

export const Machine = models.Machine || model("machines", machineSchema)

