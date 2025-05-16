import mongoose, { model, Schema } from "mongoose";

const UserSchema = new Schema(
  {
    _id: String,
    isEnabled: { type: Boolean, default: true },
    roles: [{ type: String }],
    username: { type: String, required: true },
    emailAddress: { type: String, required: true, unique: true },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      gender: { type: String },
    },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

const UserModel = mongoose.models.users || model("users", UserSchema);

/**
 * Mongoose model for users, including authentication, profile, and roles.
 */

export default UserModel;
