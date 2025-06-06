import React, { useEffect, useState } from "react";
import { useMovementRequestActionsStore } from "@/lib/store/movementRequestActionsStore";
import { MovementRequest } from "@/lib/types/movementRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cross2Icon } from "@radix-ui/react-icons";
import { updateMovementRequest } from "@/lib/helpers/movementRequests";

export default function EditMovementRequestModal({
  onSaved,
}: {
  onSaved: () => void;
}) {
  const { isEditModalOpen, selectedMovementRequest, closeEditModal } =
    useMovementRequestActionsStore();
  const [formData, setFormData] = useState<MovementRequest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditModalOpen && selectedMovementRequest) {
      setFormData(selectedMovementRequest);
    }
  }, [isEditModalOpen, selectedMovementRequest]);

  if (!isEditModalOpen || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSave = async () => {
    if (!formData) return;
    setLoading(true);
    try {
      await updateMovementRequest(formData);
      onSaved();
      closeEditModal();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Movement Request</h2>
          <Button onClick={closeEditModal} variant="ghost" size="icon">
            <Cross2Icon className="w-5 h-5" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="createdBy"
              className="block text-sm font-medium mb-1"
            >
              Creator
            </label>
            <Input
              id="createdBy"
              name="createdBy"
              value={formData.createdBy}
              onChange={handleChange}
            />
          </div>
          <div>
            <label
              htmlFor="locationFrom"
              className="block text-sm font-medium mb-1"
            >
              Location From
            </label>
            <Input
              id="locationFrom"
              name="locationFrom"
              value={formData.locationFrom}
              onChange={handleChange}
            />
          </div>
          <div>
            <label
              htmlFor="locationTo"
              className="block text-sm font-medium mb-1"
            >
              Location To
            </label>
            <Input
              id="locationTo"
              name="locationTo"
              value={formData.locationTo}
              onChange={handleChange}
            />
          </div>
          <div>
            <label
              htmlFor="cabinetIn"
              className="block text-sm font-medium mb-1"
            >
              Cabinet In
            </label>
            <Input
              id="cabinetIn"
              name="cabinetIn"
              value={formData.cabinetIn}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              Status
            </label>
            <Input
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-button text-white"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button onClick={closeEditModal} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
