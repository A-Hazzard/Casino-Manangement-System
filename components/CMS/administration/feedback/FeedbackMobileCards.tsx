/**
 * Feedback Mobile Cards Component
 */

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { format } from 'date-fns';
import { Eye, RotateCcw, Trash2 } from 'lucide-react';
import { CATEGORY_LABELS, Feedback, STATUS_COLORS } from './FeedbackTypes';

type FeedbackMobileCardsProps = {
  feedback: Feedback[];
  onViewDetails: (item: Feedback) => void;
  onRestoreClick: (item: Feedback) => void;
  onDeleteClick: (item: Feedback) => void;
  isUpdating: boolean;
  isDeleting: boolean;
};

export default function FeedbackMobileCards({
  feedback,
  onViewDetails,
  onRestoreClick,
  onDeleteClick,
  isUpdating,
  isDeleting,
}: FeedbackMobileCardsProps) {
  return (
    <div className="block space-y-4 md:hidden">
      {feedback.map(item => (
        <div
          key={item._id}
          className="overflow-hidden rounded-lg border bg-white shadow-sm"
        >
          <div className="border-b bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="truncate font-medium text-gray-900">
                  {item.email}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {format(new Date(item.submittedAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.archived && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRestoreClick(item)}
                    disabled={isUpdating}
                    className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                    title="Restore feedback"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(item)}
                  className="h-8 w-8 p-0"
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteClick(item)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  title="Delete feedback"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                {CATEGORY_LABELS[item.category] || item.category}
              </Badge>
              <Badge
                variant="outline"
                className={STATUS_COLORS[item.status] || ''}
              >
                {item.status.charAt(0).toUpperCase() +
                  item.status.slice(1)}
              </Badge>
              {item.archived && (
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                  Archived
                </Badge>
              )}
            </div>
            {(item.firstName || item.lastName || item.licenceeName) && (
              <div className="mb-2 space-y-1 text-xs text-gray-500">
                {(item.firstName || item.lastName) && (
                  <p><span className="font-medium text-gray-600">Name:</span> {[item.firstName, item.lastName].filter(Boolean).join(' ')}</p>
                )}
                {item.licenceeName && (
                  <p className="break-words"><span className="font-medium text-gray-600">Licencee:</span> {item.licenceeName}</p>
                )}
              </div>
            )}
            <p className="line-clamp-2 text-sm text-gray-600">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
