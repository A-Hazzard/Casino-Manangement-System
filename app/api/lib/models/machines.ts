import { model, models, Schema } from "mongoose";

/**
 * Mongoose model for gaming machines, including all schema fields for meters, configuration, and history.
 */
export const machineSchema = new Schema(
  {
    _id: String,
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
    config: {
      enableRte: { type: Boolean },
      lockMachine: { type: Boolean },
      lockBvOnLogOut: { type: Boolean },
    },
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
      gamesWon: { type: Number },
    },
    operationsWhileIdle: {
      extendedMeters: { type: Date },
    },
    gameConfig: {
      accountingDenomination: { type: Number },
      additionalId: { type: String },
      gameOptions: { type: String },
      maxBet: { type: String },
      payTableId: { type: String },
      progressiveGroup: { type: String },
      theoreticalRtp: { type: Number },
    },
    collectionMeters: {
      metersIn: { type: Number },
      metersOut: { type: Number },
    },
    collectionTime: { type: Date },
    previousCollectionTime: { type: Date },
    collectionMetersHistory: [
      {
        _id: { type: String },
        metersIn: { type: Number },
        metersOut: { type: Number },
        prevMetersIn: { type: Number },
        prevMetersOut: { type: Number },
        timestamp: { type: Date },
        locationReportId: { type: String },
      },
    ],
    assetStatus: { type: String },
    cabinetType: { type: String },
    gamingBoard: { type: String },
    manuf: { type: String },
    smibBoard: { type: String },
    smibVersion: {
      firmware: { type: String },
      version: { type: String },
    },
    smibConfig: {
      mqtt: {
        mqttSecure: { type: Number },
        mqttQOS: { type: Number },
        mqttURI: { type: String },
        mqttSubTopic: { type: String },
        mqttPubTopic: { type: String },
        mqttCfgTopic: { type: String },
        mqttIdleTimeS: { type: Number },
      },
      net: {
        netMode: { type: Number },
        netStaSSID: { type: String },
        netStaPwd: { type: String },
        netStaChan: { type: Number },
      },
      coms: {
        comsAddr: { type: Number },
        comsMode: { type: Number },
        comsRateMs: { type: Number },
        comsRTE: { type: Number },
        comsGPC: { type: Number },
      },
    },
    billMeters: {
      dollar1: { type: Number },
      dollar2: { type: Number },
      dollar5: { type: Number },
      dollar10: { type: Number },
      dollar20: { type: Number },
      dollar50: { type: Number },
      dollar100: { type: Number },
      dollar500: { type: Number },
      dollar1000: { type: Number },
      dollar2000: { type: Number },
      dollar5000: { type: Number },
      dollarTotal: { type: Number },
      dollarTotalUnknown: { type: Number },
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
    isSasMachine: { type: Boolean },
    lastBillMeterAt: { type: Date },
    lastSasMeterAt: { type: Date },
  },
  { timestamps: true }
);

// Critical indexes for aggregation performance
machineSchema.index({ gamingLocation: 1, deletedAt: 1 }); // For location-based queries
machineSchema.index({ deletedAt: 1 }); // For active machines
machineSchema.index({ lastActivity: 1 }); // For online status queries
machineSchema.index({ isSasMachine: 1 }); // For SAS machine filtering

export const Machine = models["machines"] ?? model("machines", machineSchema);
