import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { Country } from "@/lib/types/country";

interface EditCountryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formState: Partial<Omit<Country, "createdAt" | "updatedAt">>;
  setFormState: (
    data: Partial<Omit<Country, "createdAt" | "updatedAt">>
  ) => void;
}

export default function EditCountryModal({
  open,
  onClose,
  onSave,
  formState,
  setFormState,
}: EditCountryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formState.name ||
      !formState.alpha2 ||
      !formState.alpha3 ||
      !formState.isoNumeric
    ) {
      alert("All fields are required");
      return;
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4">Edit Country</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={formState.name || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">
                Alpha 2
              </label>
              <input
                type="text"
                name="alpha2"
                value={formState.alpha2 || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={2}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">
                Alpha 3
              </label>
              <input
                type="text"
                name="alpha3"
                value={formState.alpha3 || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={3}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">ISO</label>
              <input
                type="text"
                name="isoNumeric"
                value={formState.isoNumeric || ""}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={3}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-button hover:bg-button text-white font-bold py-2 rounded transition"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
