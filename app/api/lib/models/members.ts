import { model, models, Schema } from "mongoose";

const meterMovementSchema = new Schema(
  {
    coinIn: { type: Number, default: -1 },
    coinOut: { type: Number, default: -1 },
    jackpot: { type: Number, default: -1 },
    totalHandPaidCancelledCredits: { type: Number, default: -1 },
    totalCancelledCredits: { type: Number, default: -1 },
    gamesPlayed: { type: Number, default: -1 },
    gamesWon: { type: Number, default: -1 },
    currentCredits: { type: Number, default: -1 },
    totalWonCredits: { type: Number, default: -1 },
    drop: { type: Number, default: -1 },
  },
  { _id: false }
);

const billMeterMovementSchema = new Schema(
  {
    dollar1: { type: Number, default: -1 },
    dollar2: { type: Number, default: -1 },
    dollar5: { type: Number, default: -1 },
    dollar10: { type: Number, default: -1 },
    dollar20: { type: Number, default: -1 },
    dollar50: { type: Number, default: -1 },
    dollar100: { type: Number, default: -1 },
    dollar500: { type: Number, default: -1 },
    dollar1000: { type: Number, default: -1 },
    dollar2000: { type: Number, default: -1 },
    dollar5000: { type: Number, default: -1 },
    dollarTotal: { type: Number, default: -1 },
  },
  { _id: false }
);

const metersSchema = new Schema(
  {
    _id: { type: String },
    machine: { type: String },
    location: { type: String },
    movement: { type: meterMovementSchema, default: () => ({}) },
    coinIn: { type: Number, default: -1 },
    coinOut: { type: Number, default: -1 },
    jackpot: { type: Number, default: -1 },
    totalHandPaidCancelledCredits: { type: Number, default: -1 },
    totalCancelledCredits: { type: Number, default: -1 },
    gamesPlayed: { type: Number, default: -1 },
    gamesWon: { type: Number, default: -1 },
    currentCredits: { type: Number, default: -1 },
    totalWonCredits: { type: Number, default: -1 },
    drop: { type: Number, default: -1 },
    readAt: { type: Date },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const billMetersSchema = new Schema(
  {
    _id: { type: String },
    machineSession: { type: String, default: "" },
    machine: { type: String },
    location: { type: String },
    movement: { type: billMeterMovementSchema, default: () => ({}) },
    dollar1: { type: Number, default: -1 },
    dollar2: { type: Number, default: -1 },
    dollar5: { type: Number, default: -1 },
    dollar10: { type: Number, default: -1 },
    dollar20: { type: Number, default: -1 },
    dollar50: { type: Number, default: -1 },
    dollar100: { type: Number, default: -1 },
    dollar500: { type: Number, default: -1 },
    dollar1000: { type: Number, default: -1 },
    dollar2000: { type: Number, default: -1 },
    dollar5000: { type: Number, default: -1 },
    dollarTotal: { type: Number, default: -1 },
    readAt: { type: Date },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const locationMembershipSettingsSchema = new Schema(
  {
    locationLimit: { type: Number, default: 0 },
    freePlayAmount: { type: Number, default: 0 },
    enablePoints: { type: Boolean, default: false },
    enableFreePlays: { type: Boolean, default: false },
    pointsRatioMethod: { type: String, default: "" },
    pointMethodValue: { type: Number, default: 0 },
    gamesPlayedRatio: { type: Number, default: 0 },
    pointsMethodGameTypes: { type: [String], default: [] },
    freePlayGameTypes: { type: [String], default: [] },
    freePlayCreditsTimeout: { type: Number, default: 0 },
  },
  { _id: false }
);

const memberSchema = new Schema(
  {
    _id: { type: String, required: true },
    accountLocked: { type: Boolean, default: false },
    areaCode: { type: String },
    authType: { type: Number, default: 0 },
    avgBet: { type: Number, default: 0 },
    billsIn: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    currentSession: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
    endBillMeters: { type: billMetersSchema, default: null },
    endMeters: { type: metersSchema, default: null },
    endTime: { type: Date, default: null },
    freePlayAwardId: { type: Number, default: 0 },
    gameName: { type: String, default: "" },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamingLocation: { type: String, required: true },
    intermediateMeters: { type: metersSchema, default: null },
    lastLogin: { type: Date },
    lastPwUpdatedAt: { type: Date, default: null },
    lastfplAwardAt: { type: Date },
    locationMembershipSettings: { type: locationMembershipSettingsSchema, default: null },
    loggedIn: { type: Boolean, default: false },
    machineId: { type: String, default: "" },
    machineSerialNumber: { type: String, default: "" },
    memberId: { type: String, default: "" },
    nonRestricted: { type: Number, default: 0 },
    numFailedLoginAttempts: { type: Number, default: 0 },
    phoneNumber: { type: String },
    pin: { type: String, default: "0000" },
    points: { type: Number, default: 0 },
    profile: {
      indentification: {
        number: { type: String, default: "" },
        type: { type: String, default: "" },
      },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      gender: { type: String, default: "" },
      dob: { type: String, default: "" },
      email: { type: String },
      address: { type: String, default: "" },
      occupation: { type: String, default: "" },
    },
    relayId: { type: String, default: "" },
    restricted: { type: Number, default: 0 },
    smsCode: { type: Number },
    smsCodeTime: { type: Date },
    startBillMeters: { type: billMetersSchema, default: null },
    startMeters: { type: metersSchema, default: null },
    startTime: { type: Date, default: null },
    status: { type: String, default: "" },
    uaccount: { type: Number, default: 0 }, // Account balance
    ucardId: { type: String, default: "" },
    ulock: { type: Number, default: 0 },
    upassFull: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
    user: { type: String, default: "" },
    username: { type: String, required: true },
    utype: { type: Number, default: 0 },
    uvalid: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Indexes for better query performance
memberSchema.index({ gamingLocation: 1, deletedAt: 1 });
memberSchema.index({ username: 1 });
memberSchema.index({ "profile.email": 1 });
memberSchema.index({ deletedAt: 1 });

/**
 * Mongoose model for members, including profile information, account details, and gaming data.
 */
export const Member = models.Member || model("Member", memberSchema, "members");
