import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Info } from 'lucide-react';
import { formatLicenseeDate } from '@/lib/utils/licensee';
import type { Country } from '@/lib/types/country';

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
  countries: Country[];
  countriesLoading?: boolean;
};

export default function EditLicenseeModal({
  open,
  onClose,
  onSave,
  formState,
  setFormState,
  countries,
  countriesLoading = false,
}: EditLicenseeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
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
      alert('Name and country are required');
      return;
    }
    onSave();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-2xl font-bold">Edit Licensee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Name *</label>
            <input
              type="text"
              name="name"
              value={formState.name || ''}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Description
            </label>
            <textarea
              name="description"
              value={formState.description || ''}
              onChange={handleChange}
              className="min-h-[80px] w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter description..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Country *
            </label>
            <select
              name="country"
              value={formState.country || ''}
              onChange={handleChange}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              required
              disabled={countriesLoading || countries.length === 0}
            >
              <option value="">Select a country</option>
              {countries.length === 0 && !countriesLoading && (
                <option value="" disabled>
                  No countries available
                </option>
              )}
              {countriesLoading && (
                <option value="" disabled>
                  Loading countries...
                </option>
              )}
              {!countriesLoading &&
                countries.map(country => (
                  <option key={country._id} value={country._id}>
                    {country.name}
                  </option>
                ))}
            </select>
            {!countriesLoading && countries.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No countries found. Please add countries before updating a
                licensee.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold">
              Start Date
              <div className="group relative">
                <Info className="h-4 w-4 cursor-help text-gray-400" />
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Select the start date for this licensee
                </div>
              </div>
            </label>
            {formState.prevStartDate && (
              <div className="mb-1 text-xs text-gray-500">
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
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold">
              Expiry Date
              <div className="group relative">
                <Info className="h-4 w-4 cursor-help text-gray-400" />
                <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Select the expiry date for this licensee
                </div>
              </div>
            </label>
            {formState.prevExpiryDate && (
              <div className="mb-1 text-xs text-gray-500">
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
            className="w-full rounded bg-button py-2 font-bold text-white transition hover:bg-buttonActive"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
