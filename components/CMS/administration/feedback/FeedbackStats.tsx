/**
 * Feedback Stats Component
 */

import { Feedback } from './FeedbackTypes';

type FeedbackStatsProps = {
  allFeedback: Feedback[];
  filteredFeedback: Feedback[];
};

export default function FeedbackStats({ allFeedback }: FeedbackStatsProps) {
  const pending = allFeedback.filter(f => f.status === 'pending').length;
  const reviewed = allFeedback.filter(f => f.status === 'reviewed').length;
  const resolved = allFeedback.filter(f => f.status === 'resolved').length;

  return (
    <>
      {/* Mobile: 2 combined cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-500">Total Feedback</div>
              <div className="mt-1 text-2xl font-bold">{allFeedback.length}</div>
            </div>
            <div className="min-w-0 flex-1 border-l pl-4">
              <div className="text-sm font-medium text-gray-500">Pending</div>
              <div className="mt-1 text-2xl font-bold text-yellow-600">{pending}</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-500">Reviewed</div>
              <div className="mt-1 text-2xl font-bold text-blue-600">{reviewed}</div>
            </div>
            <div className="min-w-0 flex-1 border-l pl-4">
              <div className="text-sm font-medium text-gray-500">Resolved</div>
              <div className="mt-1 text-2xl font-bold text-green-600">{resolved}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: 4 individual cards */}
      <div className="hidden gap-4 md:grid md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Total Feedback</div>
          <div className="mt-1 text-2xl font-bold">{allFeedback.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">{pending}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Reviewed</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{reviewed}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Resolved</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{resolved}</div>
        </div>
      </div>
    </>
  );
}
