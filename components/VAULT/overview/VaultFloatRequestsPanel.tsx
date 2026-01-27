/**
 * Vault Float Requests Panel Component
 *
 * Panel for Vault Manager to view and manage pending float requests.
 * Allows approving, denying, or editing float requests.
 *
 * @module components/VAULT/overview/VaultFloatRequestsPanel
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { FloatRequest, Denomination } from '@/shared/types/vault';
import { CheckCircle, X, Edit } from 'lucide-react';

type VaultFloatRequestsPanelProps = {
  floatRequests: FloatRequest[];
  onApprove: (
    requestId: string,
    approvedAmount?: number,
    approvedDenominations?: Denomination[]
  ) => Promise<void>;
  onDeny: (requestId: string, notes?: string) => Promise<void>;
  onEdit: (
    requestId: string,
    approvedAmount: number,
    approvedDenominations: Denomination[],
    notes?: string
  ) => Promise<void>;
  loading?: boolean;
};

export default function VaultFloatRequestsPanel({
  floatRequests,
  onApprove,
  onDeny,
  onEdit,
  loading = false,
}: VaultFloatRequestsPanelProps) {
  const { formatAmount } = useCurrencyFormat();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDenominations, setEditDenominations] = useState<Denomination[]>(
    []
  );
  const [editNotes, setEditNotes] = useState<string>('');

  const pendingRequests = floatRequests.filter(req => req.status === 'pending');

  const startEdit = (request: FloatRequest) => {
    setEditingId(request._id);
    setEditAmount(request.requestedAmount);
    setEditDenominations(request.requestedDenominations);
    setEditNotes(request.vmNotes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount(0);
    setEditDenominations([]);
    setEditNotes('');
  };

  const handleEditSubmit = async () => {
    if (!editingId) return;
    try {
      await onEdit(editingId, editAmount, editDenominations, editNotes);
      cancelEdit();
    } catch {
      // Error handled by parent
    }
  };

  if (pendingRequests.length === 0) {
    return (
      <Card className="rounded-lg bg-container shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Float Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-gray-500">
            No pending float requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg bg-container shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Float Requests ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.map(request => (
          <div key={request._id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  Cashier {request.cashierId} -{' '}
                  {request.type === 'increase' ? 'Increase' : 'Decrease'}
                </h4>
                <p className="text-sm text-gray-500">
                  Requested: {formatAmount(request.requestedAmount)}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(request.requestedAt).toLocaleString()}
                </p>
              </div>
              <Badge className="bg-orangeHighlight text-white">Pending</Badge>
            </div>

            {request.requestNotes && (
              <p className="rounded bg-gray-50 p-2 text-sm text-gray-700">
                {request.requestNotes}
              </p>
            )}

            {editingId === request._id ? (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Approved Amount
                  </label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    rows={2}
                    placeholder="Optional notes for the cashier"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleEditSubmit}
                    disabled={loading}
                    className="bg-button text-white hover:bg-button/90"
                  >
                    Save Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 border-t pt-3">
                <Button
                  size="sm"
                  onClick={() => onApprove(request._id)}
                  disabled={loading}
                  className="bg-button text-white hover:bg-button/90"
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  onClick={() => startEdit(request)}
                  disabled={loading}
                  variant="outline"
                >
                  <Edit className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => onDeny(request._id)}
                  disabled={loading}
                  variant="destructive"
                >
                  <X className="mr-1 h-4 w-4" />
                  Deny
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
