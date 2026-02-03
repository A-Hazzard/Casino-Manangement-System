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

// Add missing fields based on provided JSON
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
          // Username cannot look like an email
          if (EMAIL_REGEX.test(value)) return false;
          // Username cannot look like a phone number (10+ digits)
          if (/^\d{10,}$/.test(value)) return false;
          // Username can contain letters, numbers, spaces, hyphens, and apostrophes
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
    assignedLocations: [{ type: String }], // Array of location IDs user has access to
    assignedLicensees: [{ type: String }], // Array of licensee IDs user has access to
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
              // Street can have letters, numbers, spaces, commas, and full stops
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
              // Town can have letters, numbers, spaces, commas, and full stops
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
              // Region can have letters, numbers, spaces, commas, and full stops
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
              // Country can only have letters and spaces
              return /^[A-Za-z\s]+$/.test(trimmed);
            },
            message:
              'Country must be at least 3 characters and may only contain letters and spaces.',
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
    profilePicture: { type: String, default: null }, // default null for missing entries
    password: { type: String, required: true },
    tempPassword: { type: String, default: null }, // Plain text temporary password for new cashiers
    passwordUpdatedAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    tempPasswordChanged: { type: Boolean, default: false },
    deletedAt: { type: Schema.Types.Mixed, default: null }, // allow for { $date: { $numberLong: "-1" } }
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    __v: { type: Number, select: false, default: 0 }, // add missing __v field, default to 0, hide by default
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

/**
 * Mongoose model for users, including authentication, profile, and roles.
 */

export default UserModel;
