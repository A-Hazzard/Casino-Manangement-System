import mongoose, { model, Schema } from 'mongoose';

const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /\S+@\S+\.\S+/;
const ALLOWED_GENDERS = ['male', 'female', 'other'] as const;

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const alphabeticValidator = {
  validator(value: string | null | undefined) {
    if (isBlank(value)) return true;
    const trimmed = value!.trim();
    if (EMAIL_REGEX.test(trimmed)) {
      return false;
    }
    return NAME_REGEX.test(trimmed);
  },
  message:
    '{PATH} may only contain letters and spaces and cannot resemble an email address.',
};

const genderValidator = {
  validator(value: string | null | undefined) {
    if (isBlank(value)) return true;
    const normalized = value!.trim().toLowerCase();
    return (ALLOWED_GENDERS as readonly string[]).includes(normalized);
  },
  message: `{PATH} must be one of: ${ALLOWED_GENDERS.join(', ')}.`,
};

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    roles: [{ type: String }],
    permissions: [{ type: String }],
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    rel: {
      licencee: [{ type: String }],
    },
    profile: {
      firstName: {
        type: String,
        trim: true,
        ...alphabeticValidator,
      },
      lastName: {
        type: String,
        trim: true,
        ...alphabeticValidator,
      },
      middleName: {
        type: String,
        trim: true,
        ...alphabeticValidator,
      },
      otherName: {
        type: String,
        trim: true,
        ...alphabeticValidator,
      },
      gender: {
        type: String,
        trim: true,
        lowercase: true,
        ...genderValidator,
      },
      address: {
        street: { type: String, trim: true },
        town: { type: String, trim: true },
        region: { type: String, trim: true },
        country: { type: String, trim: true },
        postalCode: { type: String, trim: true },
      },
      identification: {
        dateOfBirth: { type: Date },
        idType: {
          type: String,
          trim: true,
          ...alphabeticValidator,
        },
        idNumber: { type: String, trim: true },
        notes: { type: String, trim: true },
      },
      phoneNumber: { type: String, trim: true },
      notes: { type: String, trim: true },
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
    passwordUpdatedAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.path('profile.firstName').set(normalizeString);
UserSchema.path('profile.lastName').set(normalizeString);
UserSchema.path('profile.middleName').set(normalizeString);
UserSchema.path('profile.otherName').set(normalizeString);
UserSchema.path('profile.gender').set((value: unknown) =>
  normalizeString(value)?.toLowerCase()
);
UserSchema.path('profile.identification.idType').set(normalizeString);
UserSchema.path('profile.identification.idNumber').set(normalizeString);
UserSchema.path('profile.identification.notes').set(normalizeString);
UserSchema.path('profile.phoneNumber').set(normalizeString);
UserSchema.path('profile.notes').set(normalizeString);

const UserModel = mongoose.models?.users || model('users', UserSchema);

/**
 * Mongoose model for users, including authentication, profile, and roles.
 */

export default UserModel;
