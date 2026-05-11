import mongoose, { model, Schema } from 'mongoose';

const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /\S+@\S+\.\S+/;
const ALLOWED_GENDERS = ['male', 'female', 'other'] as const;
const ALLOWED_ROLES = [
  'developer',
  'admin',
  'manager',
  'location admin',
  'vault-manager',
  'cashier',
  'technician',
  'collector',
  'reviewer',
] as const;

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

const roleValidator = {
  validator(value: string) {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return (ALLOWED_ROLES as readonly string[]).includes(normalized);
  },
  message: `{PATH} must be one of: ${ALLOWED_ROLES.join(', ')}.`,
};

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    roles: [
      {
        type: String,
        enum: ALLOWED_ROLES,
        validate: [roleValidator],
      },
    ],
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      validate: {
        validator: function (value: string) {
          if (EMAIL_REGEX.test(value)) return false;

          if (/^\d{10,}$/.test(value)) return false;

          return /^[A-Za-z0-9\s'-]+$/.test(value);
        },
        message:
          'Username may only contain letters, numbers, spaces, hyphens, and apostrophes, and cannot look like an email or phone number.',
      },
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      validate: {
        validator: function (value: string) {
          return EMAIL_REGEX.test(value);
        },
        message: 'Email address must be a valid email format.',
      },
    },
    assignedLocations: [{ type: String }],
    assignedLicencees: [{ type: String }],
    moneyInMultiplier: { type: Number, default: null },
    moneyOutAndJackpotMultiplier: { type: Number, default: null },
    profile: {
      firstName: {
        type: String,
        trim: true,
        minlength: [3, 'First name must be at least 3 characters'],
        ...alphabeticValidator,
      },
      lastName: {
        type: String,
        trim: true,
        minlength: [3, 'Last name must be at least 3 characters'],
        ...alphabeticValidator,
      },
      gender: {
        type: String,
        trim: true,
        lowercase: true,
        ...genderValidator,
      },
      address: {
        street: {
          type: String,
          trim: true,
          validate: {
            validator: function (value: string | null | undefined) {
              if (isBlank(value)) return true;

              return /^[A-Za-z0-9\s,\.]+$/.test(value!.trim());
            },
            message:
              'Street address may only contain letters, numbers, spaces, commas, and full stops.',
          },
        },
        town: {
          type: String,
          trim: true,
          validate: {
            validator: function (value: string | null | undefined) {
              if (isBlank(value)) return true;
              const trimmed = value!.trim();
              if (trimmed.length < 3) return false;

              return /^[A-Za-z0-9\s,\.]+$/.test(trimmed);
            },
            message:
              'Town must be at least 3 characters and may only contain letters, numbers, spaces, commas, and full stops.',
          },
        },
        region: {
          type: String,
          trim: true,
          validate: {
            validator: function (value: string | null | undefined) {
              if (isBlank(value)) return true;
              const trimmed = value!.trim();
              if (trimmed.length < 3) return false;

              return /^[A-Za-z0-9\s,\.]+$/.test(trimmed);
            },
            message:
              'Region must be at least 3 characters and may only contain letters, numbers, spaces, commas, and full stops.',
          },
        },
        country: {
          type: String,
          trim: true,
          validate: {
            validator: function (value: string | null | undefined) {
              if (isBlank(value)) return true;
              const trimmed = value!.trim();
              if (trimmed.length < 3) return false;

              return /^[A-Za-z\s&]+$/.test(trimmed);
            },
            message:
              'Country must be at least 3 characters and may only contain letters, spaces, and ampersands (&).',
          },
        },
        postalCode: { type: String, trim: true },
      },
      identification: {
        dateOfBirth: {
          type: Date,
          validate: {
            validator: function (value: Date | null | undefined) {
              if (!value) return true;
              const date = value instanceof Date ? value : new Date(value);
              if (isNaN(date.getTime())) return false;
              return date <= new Date();
            },
            message:
              'Date of birth must be a valid date and cannot be in the future.',
          },
        },
        idType: {
          type: String,
          trim: true,
          validate: {
            validator: function (value: string | null | undefined) {
              if (isBlank(value)) return true;
              const trimmed = value!.trim();
              if (trimmed.length < 3) return false;
              return NAME_REGEX.test(trimmed);
            },
            message:
              'ID type must be at least 3 characters and may only contain letters and spaces.',
          },
        },
        idNumber: {
          type: String,
          trim: true,
          validate: {
            validator: function (value: string | null | undefined) {
              if (isBlank(value)) return true;
              return value!.trim().length >= 3;
            },
            message: 'ID number must be at least 3 characters.',
          },
        },
        notes: { type: String, trim: true },
      },
      phoneNumber: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    profilePicture: { type: String, default: null },
    password: { type: String, required: true },
    previousPassword: { type: String, default: null },
    previousPasswords: [{ type: String }],
    tempPassword: { type: String, default: null },
    passwordUpdatedAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    tempPasswordChanged: { type: Boolean, default: false },
    requiresPasswordUpdate: { type: Boolean, default: false },
    deletedAt: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
    totpRecoveryToken: { type: String, default: null },
    totpRecoveryExpires: { type: Date, default: null },
    totpTempSecret: { type: String, default: null },
    __v: { type: Number, select: false, default: 0 },
  },
  { timestamps: true }
);

UserSchema.path('profile.firstName').set(normalizeString);
UserSchema.path('profile.lastName').set(normalizeString);
UserSchema.path('profile.gender').set((value: unknown) =>
  normalizeString(value)?.toLowerCase()
);
UserSchema.path('profile.identification.idType').set(normalizeString);
UserSchema.path('profile.identification.idNumber').set(normalizeString);
UserSchema.path('profile.identification.notes').set(normalizeString);
UserSchema.path('profile.phoneNumber').set(normalizeString);
UserSchema.path('profile.notes').set(normalizeString);

const UserModel = mongoose.models?.users || model('users', UserSchema);

export default UserModel;
