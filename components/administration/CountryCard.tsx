import type { Country } from '@/lib/types/country';
import Image from 'next/image';

// Import SVG icons for pre-rendering
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';

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
        <div className="mb-2 flex flex-wrap gap-3">
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
        <div className="flex items-center justify-end gap-3">
          <Image
            src={editIcon}
            alt="Edit"
            width={22}
            height={22}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onEdit(country)}
          />
          <Image
            src={deleteIcon}
            alt="Delete"
            width={22}
            height={22}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onDelete(country)}
          />
        </div>
      </div>
    </div>
  );
}
