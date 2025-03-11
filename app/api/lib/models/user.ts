import mongoose, { Schema, Model, model } from 'mongoose';
import { User } from '@/app/api/lib/types/auth';

const UserSchema = new Schema<User>(
    {
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

const UserModel = mongoose.models.users || model<User>('users', UserSchema);

export default UserModel;
