import { model, models, Schema } from "mongoose";

const memberSchema = new Schema(
  {
    _id: { type: String, required: true },
    accountLocked: { type: Boolean, default: false },
    areaCode: { type: String },
    authType: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    currentSession: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
    freePlayAwardId: { type: Number, default: 0 },
    gamingLocation: { type: String, required: true },
    lastLogin: { type: Date },
    lastPwUpdatedAt: { type: Date, default: null },
    lastfplAwardAt: { type: Date },
    loggedIn: { type: Boolean, default: false },
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
    uaccount: { type: Number, default: 0 }, // Account balance
    ulock: { type: Number, default: 0 },
    upassFull: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
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
