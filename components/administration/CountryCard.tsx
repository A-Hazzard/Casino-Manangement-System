import type { Country } from "@/lib/types/country";
import Image from "next/image";

// Import SVG icons for pre-rendering
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-500 text-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div
          className="font-bold text-base sm:text-lg truncate"
          title={country.name}
        >
          {country.name}
        </div>
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-3 mb-2">
          <span className="bg-black text-white text-xs font-semibold px-2 py-1 rounded">
            Alpha 2: {country.alpha2}
          </span>
          <span className="bg-black text-white text-xs font-semibold px-2 py-1 rounded">
            Alpha 3: {country.alpha3}
          </span>
          <span className="bg-black text-white text-xs font-semibold px-2 py-1 rounded">
            ISO: {country.isoNumeric}
          </span>
        </div>
        <div className="flex justify-end gap-3 items-center">
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
