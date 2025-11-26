/**
 * Country Card Component
 * Mobile-friendly card view for displaying country information.
 *
 * Features:
 * - Country information display (name, alpha-2, alpha-3, ISO numeric)
 * - Edit and delete action buttons
 * - Responsive design (mobile only)
 *
 * @param country - Country object to display
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 */
import type { Country } from '@/lib/types/country';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CountryCardProps = {
  country: Country;
  onEdit: (country: Country) => void;
  onDelete: (country: Country) => void;
};

export default function CountryCard({
  country,
  onEdit,
  onDelete,
}: CountryCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-2 bg-blue-500 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div
          className="truncate text-base font-bold sm:text-lg"
          title={country.name}
        >
          {country.name}
        </div>
      </div>
      <div className="p-3">
        <div className="mb-3 flex flex-wrap gap-3">
          <span className="rounded bg-black px-2 py-1 text-xs font-semibold text-white">
            Alpha 2: {country.alpha2}
          </span>
          <span className="rounded bg-black px-2 py-1 text-xs font-semibold text-white">
            Alpha 3: {country.alpha3}
          </span>
          <span className="rounded bg-black px-2 py-1 text-xs font-semibold text-white">
            ISO: {country.isoNumeric}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
          <Button
            onClick={() => onEdit(country)}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
          <Button
            onClick={() => onDelete(country)}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
