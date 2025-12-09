import { useState } from 'react';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import { Button } from '@/components/ui/button';
import { Cross2Icon } from '@radix-ui/react-icons';
import Image from 'next/image';
import { deleteMovementRequest } from '@/lib/helpers/movementRequests';
import deleteIcon from '@/public/deleteIcon.svg';

export default function DeleteMovementRequestModal({
  onDeleted,
}: {
  onDeleted: () => void;
}) {
  const { isDeleteModalOpen, selectedMovementRequest, closeDeleteModal } =
    useMovementRequestActionsStore();
  const [loading, setLoading] = useState(false);

  if (!isDeleteModalOpen || !selectedMovementRequest) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteMovementRequest(selectedMovementRequest._id);
      onDeleted();
      closeDeleteModal();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-destructive">Confirm Delete</h2>
          <Button onClick={closeDeleteModal} variant="ghost" size="icon">
            <Cross2Icon className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-4 text-center text-foreground">
          <div className="mb-4 flex justify-center">
            <Image src={deleteIcon} alt="Delete" width={64} height={64} />
          </div>
          <p className="text-lg font-semibold">
            Are you sure you want to delete this movement request?
          </p>
          <p className="text-sm text-muted-foreground">
            Creator: <strong>{selectedMovementRequest.createdBy}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Cabinet: <strong>{selectedMovementRequest.cabinetIn}</strong>
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <Button
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Yes, Delete It'}
          </Button>
          <Button
            onClick={closeDeleteModal}
            className="bg-muted text-muted-foreground"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
