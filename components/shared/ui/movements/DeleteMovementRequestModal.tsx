import { Button } from '@/components/shared/ui/button';
import { deleteMovementRequest } from '@/lib/helpers/movementRequests';
import { useMovementRequestActionsStore } from '@/lib/store/movementRequestActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import deleteIcon from '@/public/deleteIcon.svg';
import { Cross2Icon } from '@radix-ui/react-icons';
import Image from 'next/image';
import { useState } from 'react';

export default function DeleteMovementRequestModal({
  onDeleted,
}: {
  onDeleted: () => void;
}) {
  const { isDeleteModalOpen, selectedMovementRequest, closeDeleteModal } =
    useMovementRequestActionsStore();
  const { user: currentUser } = useUserStore();
  const userRoles = currentUser?.roles?.map(r => r?.toLowerCase()) || [];
  const isDeveloper = userRoles.includes('developer');
  
  const [loading, setLoading] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');

  if (!isDeleteModalOpen || !selectedMovementRequest) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteMovementRequest(selectedMovementRequest._id, isDeveloper ? deleteType : 'soft');
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
          
          {isDeveloper && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-lg bg-gray-50 p-4 border border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Developer Delete Options:</span>
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant={deleteType === 'soft' ? 'default' : 'outline'}
                  className={`flex-1 text-xs h-9 ${deleteType === 'soft' ? 'bg-amber-500 hover:bg-amber-600 border-none' : 'border-gray-200 text-gray-600'}`}
                  onClick={() => setDeleteType('soft')}
                >
                  SOFT DELETE
                </Button>
                <Button
                  type="button"
                  variant={deleteType === 'hard' ? 'default' : 'outline'}
                  className={`flex-1 text-xs h-9 ${deleteType === 'hard' ? 'bg-red-600 hover:bg-red-700 border-none' : 'border-gray-200 text-gray-600'}`}
                  onClick={() => setDeleteType('hard')}
                >
                  HARD DELETE
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 italic">
                {deleteType === 'soft' 
                  ? "Soft delete marks the record as deleted (retains in DB)." 
                  : "Hard delete PERMANENTLY removes the record from the database."}
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <Button
            onClick={handleDelete}
            className={`${deleteType === 'hard' && isDeveloper ? 'bg-red-700 hover:bg-red-800' : 'bg-destructive hover:bg-destructive/90'} text-white font-bold min-w-[120px]`}
            disabled={loading}
          >
            {loading ? 'Processing...' : deleteType === 'hard' && isDeveloper ? 'PERM DELETE' : 'YES, DELETE'}
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

