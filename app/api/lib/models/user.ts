import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        isEnabled: { type: Boolean, default: true },
        roles: { type: [String], default: [] },
        permissions: { type: [String], default: [] },
        username: { type: String, required: true },
        emailAddress: { type: String, required: true},
        profile: {
            firstName: { type: String },
            lastName: { type: String },
            gender: { type: String },
        },
        password: { type: String, required: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

UserSchema.index({ emailAddress: 1}, { unique: true })

export default mongoose.models.User || mongoose.model("users", UserSchema);
