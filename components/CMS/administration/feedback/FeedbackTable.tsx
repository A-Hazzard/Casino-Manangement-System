/**
 * Feedback Table Component
 */

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { format } from 'date-fns';
import { Eye, RotateCcw, Trash2 } from 'lucide-react';
import { CATEGORY_LABELS, Feedback, STATUS_COLORS } from './FeedbackTypes';

type FeedbackTableProps = {
  feedback: Feedback[];
  onViewDetails: (item: Feedback) => void;
  onRestoreClick: (item: Feedback) => void;
  onDeleteClick: (item: Feedback) => void;
  isUpdating: boolean;
  isDeleting: boolean;
};

export default function FeedbackTable({
  feedback,
  onViewDetails,
  onRestoreClick,
  onDeleteClick,
  isUpdating,
  isDeleting,
}: FeedbackTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Licencee</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {feedback.map(item => (
          <TableRow key={item._id}>
            <TableCell className="font-medium">{item.email}</TableCell>
            <TableCell className="text-gray-700">
              {[item.firstName, item.lastName].filter(Boolean).join(' ') || (
                <span className="text-gray-400">—</span>
              )}
            </TableCell>
            <TableCell className="max-w-[180px] text-gray-700">
              <span className="block break-words leading-snug">
                {item.licenceeName || <span className="text-gray-400">—</span>}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {CATEGORY_LABELS[item.category] || item.category}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={STATUS_COLORS[item.status] || ''}
              >
                {item.status.charAt(0).toUpperCase() +
                  item.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>
              {format(new Date(item.submittedAt), 'MMM dd, yyyy HH:mm')}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
