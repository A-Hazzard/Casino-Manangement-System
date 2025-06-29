import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { getNames } from "country-list";
import { Info } from "lucide-react";
import { formatLicenseeDate } from "@/lib/utils/licensee";

type EditLicenseeModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formState: {
    _id?: string;
    name?: string;
    description?: string;
    country?: string;
    startDate?: Date | string;
    expiryDate?: Date | string;
    prevStartDate?: Date | string;
    prevExpiryDate?: Date | string;
  };
  setFormState: (data: {
    _id?: string;
    name?: string;
    description?: string;
    country?: string;
    startDate?: Date | string;
    expiryDate?: Date | string;
    prevStartDate?: Date | string;
    prevExpiryDate?: Date | string;
  }) => void;
};

export default function EditLicenseeModal({
  open,
  onClose,
  onSave,
  formState,
  setFormState,
}: EditLicenseeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const countryNames = getNames();

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [open]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormState({ [e.target.name]: e.target.value });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormState({ startDate: date });
  };

  const handleExpiryDateChange = (date: Date | undefined) => {
    setFormState({ expiryDate: date });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.country) {
      alert("Name and country are required");
      return;
    }
    onSave();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4">Edit Licensee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formState.name || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formState.description || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              placeholder="Enter description..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Country *
            </label>
            <select
              name="country"
              value={formState.country || ""}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select a country</option>
              {countryNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              Start Date
              <div className="relative group">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  Select the start date for this licensee
                </div>
              </div>
            </label>
            {formState.prevStartDate && (
              <div className="text-xs text-gray-500 mb-1">
                Previous: {formatLicenseeDate(formState.prevStartDate)}
              </div>
            )}
            <DateTimePicker
              date={
                formState.startDate ? new Date(formState.startDate) : undefined
              }
              setDate={handleStartDateChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
              Expiry Date
              <div className="relative group">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  Select the expiry date for this licensee
                </div>
              </div>
            </label>
            {formState.prevExpiryDate && (
              <div className="text-xs text-gray-500 mb-1">
                Previous: {formatLicenseeDate(formState.prevExpiryDate)}
              </div>
            )}
            <DateTimePicker
              date={
                formState.expiryDate
                  ? new Date(formState.expiryDate)
                  : undefined
              }
              setDate={handleExpiryDateChange}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-button hover:bg-buttonActive text-white font-bold py-2 rounded transition"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
