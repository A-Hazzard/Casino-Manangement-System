/**
 * Feedback Types
 */

export type Feedback = {
  _id: string;
  email: string;
  category:
    | 'bug'
    | 'suggestion'
    | 'general-review'
    | 'feature-request'
    | 'performance'
    | 'ui-ux'
    | 'other';
  description: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  archived: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  licenceeId?: string | null;
  licenceeName?: string | null;
  username?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FeedbackResponse = {
  success: boolean;
  data: Feedback[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
};

export const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug Report',
  suggestion: '💡 Suggestion',
  'general-review': '⭐ General Review',
  'feature-request': '✨ Feature Request',
  performance: '⚡ Performance',
  'ui-ux': '🎨 UI/UX',
  other: '📝 Other',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const STATUS_HEADER: Record<string, { bg: string; text: string; badge: string }> = {
  pending:  { bg: 'bg-amber-500',   text: 'text-white', badge: 'bg-amber-400/30 text-white border-amber-300/40' },
  reviewed: { bg: 'bg-blue-600',    text: 'text-white', badge: 'bg-blue-500/30 text-white border-blue-400/40' },
  resolved: { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-500/30 text-white border-emerald-400/40' },
  archived: { bg: 'bg-gray-500',    text: 'text-white', badge: 'bg-gray-400/30 text-white border-gray-300/40' },
};

export const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return '?';
};
