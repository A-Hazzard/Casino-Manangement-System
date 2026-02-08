/**
 * Shift Review Panel Component
 *
 * Panel for Vault Manager to review and resolve pending review cashier shifts.
 * Allows editing balance, adding audit comments, and force-closing.
 *
 * @module components/VAULT/overview/ShiftReviewPanel
 */

'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { UnbalancedShiftInfo } from '@/shared/types/vault';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

type ShiftReviewPanelProps = {
  pendingShifts: UnbalancedShiftInfo[];
  onResolve: (
    shiftId: string,
    finalBalance: number,
    auditComment: string
  ) => Promise<void>;
  loading?: boolean;
};

export default function ShiftReviewPanel({
  pendingShifts,
  onResolve,
  loading = false,
}: ShiftReviewPanelProps) {
  const { formatAmount } = useCurrencyFormat();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [finalBalance, setFinalBalance] = useState<string>('');
  const [auditComment, setAuditComment] = useState<string>('');

  const startResolve = (shift: UnbalancedShiftInfo) => {
    setResolvingId(shift.shiftId);
    setFinalBalance(shift.expectedBalance.toString());
    setAuditComment('');
  };

  const cancelResolve = () => {
    setResolvingId(null);
    setFinalBalance('');
    setAuditComment('');
  };

  const handleResolve = async () => {
    if (!resolvingId) return;
    const balance = parseFloat(finalBalance);
    if (isNaN(balance) || balance < 0) {
      alert('Please enter a valid final balance');
      return;
    }
    if (!auditComment.trim()) {
      alert('Please provide an audit comment');
      return;
    }
    try {
      await onResolve(resolvingId, balance, auditComment.trim());
      cancelResolve();
    } catch {
      // Error handled by parent
    }
  };

  if (pendingShifts.length === 0) {
    return (
      <Card className="rounded-lg bg-container shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Shift Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-gray-500">
            No shifts pending review
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="shift-review-panel" className="rounded-lg bg-container shadow-md scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <AlertTriangle className="h-5 w-5 text-orangeHighlight" />
          Shift Reviews ({pendingShifts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingShifts.map(shift => (
          <div
            key={shift.shiftId}
            className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {shift.cashierName} - Shift {shift.shiftId}
                </h4>
                <p className="text-sm text-gray-600">
                  Closed: {new Date(shift.closedAt).toLocaleString()}
                </p>
              </div>
              <Badge className="bg-orangeHighlight text-white">
                Pending Review
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Expected:</span>
                <span className="ml-2 text-gray-900">
                  {formatAmount(shift.expectedBalance)}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Entered:</span>
                <span className="ml-2 text-gray-900">
                  {formatAmount(shift.enteredBalance)}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <span className="font-medium text-gray-700">Discrepancy:</span>
              <span
                className={`ml-2 font-semibold ${
                  shift.discrepancy > 0
                    ? 'text-red-600'
                    : shift.discrepancy < 0
                      ? 'text-green-600'
                      : 'text-gray-600'
                }`}
              >
                {shift.discrepancy > 0 ? '+' : ''}
                {formatAmount(shift.discrepancy)}
              </span>
            </div>

            {resolvingId === shift.shiftId ? (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Final Balance
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalBalance}
                    onChange={e => setFinalBalance(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Audit Comment *
                  </Label>
                  <Textarea
                    value={auditComment}
                    onChange={e => setAuditComment(e.target.value)}
                    placeholder="Required: Explain the discrepancy resolution"
                    className="mt-1"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleResolve}
                    disabled={loading || !auditComment.trim()}
                    className="bg-button text-white hover:bg-button/90"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Force Close
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelResolve}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => startResolve(shift)}
                disabled={loading}
                className="bg-button text-white hover:bg-button/90"
              >
                Review & Resolve
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
