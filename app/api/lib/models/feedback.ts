import mongoose, { model, Schema } from 'mongoose';

const FeedbackSchema = new Schema(
  {
    _id: { type: String, required: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value: string) {
          return /\S+@\S+\.\S+/.test(value);
        },
        message: 'Please provide a valid email address.',
      },
    },
    category: {
      type: String,
      required: true,
      enum: ['bug', 'suggestion', 'general-review', 'feature-request', 'performance', 'ui-ux', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Feedback description must be at least 10 characters'],
      maxlength: [5000, 'Feedback description cannot exceed 5000 characters'],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
    archived: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: String,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    username: {
      type: String,
      trim: true,
      default: null,
    },
    userId: {
      type: String,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'feedback',
  }
);

// Create indexes
FeedbackSchema.index({ email: 1 });
FeedbackSchema.index({ submittedAt: -1 });
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ category: 1 });
FeedbackSchema.index({ archived: 1 });

// Generate _id before saving
FeedbackSchema.pre('save', function (next) {
  if (!this._id) {
    this._id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

export const FeedbackModel =
  mongoose.models.Feedback || model('Feedback', FeedbackSchema);





