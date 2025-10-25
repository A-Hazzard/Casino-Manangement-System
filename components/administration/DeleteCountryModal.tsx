import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DeleteCountryModalProps } from '@/lib/types/components';

export default function DeleteCountryModal({
  isOpen,
  onClose,
  country,
  onDelete,
}: DeleteCountryModalProps) {
  if (!country) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Country</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center text-gray-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{country.name}</span>?
          </p>
        </div>
        <DialogFooter className="flex justify-center gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
