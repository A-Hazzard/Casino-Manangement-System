import mongoose, { model, Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    roles: [{ type: String }],
    permissions: [{ type: String }],
    username: { type: String, required: true },
    emailAddress: { type: String, required: true, unique: true },
    rel: {
      licencee: [{ type: String }],
    },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      middleName: { type: String },
      otherName: { type: String },
      gender: { type: String },
      address: {
        street: { type: String },
        town: { type: String },
        region: { type: String },
        country: { type: String },
        postalCode: { type: String },
      },
      contact: {
        phone: { type: String },
        mobile: { type: String },
        email: { type: String },
      },
      identification: {
        dateOfBirth: { type: String },
        idType: { type: String },
        idNumber: { type: String },
        notes: { type: String },
      },
      notes: { type: String },
      photo: { type: String },
    },
    profilePicture: { type: String },
    resourcePermissions: {
      type: Map,
      of: new Schema(
        {
          entity: { type: String },
          resources: [{ type: String }],
        },
        { _id: false }
      ),
    },
    password: { type: String, required: true },
    sessionVersion: { type: Number, default: 1 },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

const UserModel = mongoose.models?.users || model('users', UserSchema);

/**
 * Mongoose model for users, including authentication, profile, and roles.
 */

export default UserModel;
