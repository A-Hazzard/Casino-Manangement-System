import { model, models, Schema } from "mongoose";

export const machineSchema = new Schema({
  _id: String,
  billValidator: {
    balance: Number,
    notes: [{ _id: String, denomination: Number, quantity: Number }]
  },
  config: {
    enableRte: Boolean,
    lockMachine: Boolean,
    lockBvOnLogOut: Boolean
  },
  playableBalance: Number,
  custom: { name: String },
  balances: { cashable: Number },
  curProcess: { name: String, next: String },
  tasks: {
    type: new Schema({
      pendingHandpay: {
        name: String,
        steps: [{ name: String }],
        currentStepIndex: Number,
        retryAttempts: Number
      }
    }, { _id: false, strict: false }),
    default: undefined
  },
  origSerialNumber: String,
  machineId: String,
  relayId: String,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date,
  __v: Number,
  gamingLocation: String,
  game: String,
  lastActivity: Date,
  sasMeters: {
    drop: Number,
    totalCancelledCredits: Number,
    gamesPlayed: Number,
    moneyOut: Number,
    slotDoorOpened: Number,
    powerReset: Number,
    totalHandPaidCancelledCredits: Number,
    coinIn: Number,
    coinOut: Number,
    totalWonCredits: Number,
    jackpot: Number,
    currentCredits: Number,
    gamesWon: Number
  },
  operationsWhileIdle: { extendedMeters: Date },
  gameConfig: {
    accountingDenomination: Number,
    additionalId: String,
    gameOptions: String,
    maxBet: String,
    payTableId: String,
    progressiveGroup: String,
    theoreticalRtp: Number
  },
  collectionMeters: { metersIn: Number, metersOut: Number },
  collectionTime: Date,
  previousCollectionTime: Date,
  collectionMetersHistory: [
    {
      _id: String,
      metersIn: Number,
      metersOut: Number,
      prevMetersIn: Number,
      prevMetersOut: Number,
      timestamp: Date,
      locationReportId: String
    }
  ],
  assetStatus: String,
  cabinetType: String,
  gamingBoard: String,
  manuf: String,
  smibBoard: String,
  smibVersion: { firmware: String, version: String },
  smibConfig: {
    mqtt: {
      mqttSecure: Number,
      mqttQOS: Number,
      mqttURI: String,
      mqttSubTopic: String,
      mqttPubTopic: String,
      mqttCfgTopic: String,
      mqttIdleTimeS: Number
    },
    net: {
      netMode: Number,
      netStaSSID: String,
      netStaPwd: String,
      netStaChan: Number
    },
    coms: {
      comsAddr: Number,
      comsMode: Number,
      comsRateMs: Number,
      comsRTE: Number,
      comsGPC: Number
    }
  },
  billMeters: {
    dollar1: Number,
    dollar2: Number,
    dollar5: Number,
    dollar10: Number,
    dollar20: Number,
    dollar50: Number,
    dollar100: Number,
    dollar500: Number,
    dollar1000: Number,
    dollar2000: Number,
    dollar5000: Number,
    dollarTotal: Number,
    dollarTotalUnknown: Number
  },
  orig: {
    meters: {
      coinIn: String,
      coinOut: String,
      drop: String,
      jackpot: String,
      gamesPlayed: String,
      moneyOut: String,
      slotDoorOpened: String,
      powerReset: String
    },
    deletedAt: Number
  },
  manufacturer: String,
  serialNumber: String,
  gameNumber: String,
  protocols: [{ protocol: String, version: String }],
  numberOfEnabledGames: Number,
  enabledGameNumbers: [String],
  noOfGames: Number,
  viewingAccountDenomination: [
    {
      asOf: Date,
      denomination: Number,
      meters: [String],
      user: { role: String }
    }
  ],
  isSunBoxDevice: Boolean,
  sessionHistory: [
    {
      gamingLocation: String,
      date: Date,
      reason: String,
      performedBy: String,
      _id: String
    }
  ],
  currentSession: String,
  viewingAccountDenominationHistory: [
    {
      asOf: Date,
      denomination: Number,
      meters: [String],
      user: { role: String }
    }
  ],
  selectedDenomination: { drop: Number, totalCancelledCredits: Number },
  isSasMachine: Boolean,
  lastBillMeterAt: Date,
  lastSasMeterAt: Date,
  machineType: String,
  machineStatus: String,
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  maintenanceHistory: [
    { date: Date, description: String, performedBy: String }
  ]
}, { timestamps: true });

machineSchema.index({ gamingLocation: 1, deletedAt: 1 });
machineSchema.index({ deletedAt: 1 });
machineSchema.index({ lastActivity: 1 });
machineSchema.index({ isSasMachine: 1 });
machineSchema.index({ serialNumber: 1 });
machineSchema.index({ lastSasMeterAt: -1 });

export const Machine = models["machines"] ?? model("machines", machineSchema);
