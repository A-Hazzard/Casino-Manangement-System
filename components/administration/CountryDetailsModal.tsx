import type { CountryDetailsModalProps } from '@/lib/types/components';

export default function CountryDetailsModal({
  isOpen,
  onClose,
  country,
}: CountryDetailsModalProps) {
  if (!isOpen || !country) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <button
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-2xl font-bold">Country Details</h2>
        <div className="space-y-2">
          <div>
            <span className="font-semibold">Name:</span> {country.name}
          </div>
          <div>
            <span className="font-semibold">Alpha 2:</span> {country.alpha2}
          </div>
          <div>
            <span className="font-semibold">Alpha 3:</span> {country.alpha3}
          </div>
          <div>
            <span className="font-semibold">ISO:</span> {country.isoNumeric}
          </div>
        </div>
      </div>
    </div>
  );
}
