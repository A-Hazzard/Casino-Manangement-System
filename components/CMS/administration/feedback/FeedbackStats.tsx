/**
 * Feedback Stats Component
 */

import { Feedback } from './FeedbackTypes';

type FeedbackStatsProps = {
  allFeedback: Feedback[];
  filteredFeedback: Feedback[];
};

export default function FeedbackStats({ allFeedback }: FeedbackStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-500">
          Total Feedback
        </div>
        <div className="mt-1 text-2xl font-bold">{allFeedback.length}</div>
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-500">Pending</div>
        <div className="mt-1 text-2xl font-bold text-yellow-600">
          {allFeedback.filter(f => f.status === 'pending').length}
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-500">Reviewed</div>
        <div className="mt-1 text-2xl font-bold text-blue-600">
          {allFeedback.filter(f => f.status === 'reviewed').length}
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-500">Resolved</div>
        <div className="mt-1 text-2xl font-bold text-green-600">
          {allFeedback.filter(f => f.status === 'resolved').length}
        </div>
      </div>
    </div>
  );
}
