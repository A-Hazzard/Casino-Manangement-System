import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { Licensee } from "@/lib/types/licensee";

type DeleteLicenseeModalProps = {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  licensee: Licensee | null;
};

export default function DeleteLicenseeModal({
  open,
  onClose,
  onDelete,
  licensee,
}: DeleteLicenseeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  if (!open || !licensee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative"
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Delete Licensee</h2>
        <p className="text-gray-700 mb-6 text-center">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{licensee.name}</span>?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
