/**
 * Country Card Component
 * Mobile card view for displaying country information.
 *
 * Features:
 * - Country information display
 * - Action buttons (edit, delete)
 * - Responsive design (mobile only)
 *
 * @param props - Component props
 */
'use client';

import type { Country } from '@/lib/types/country';
import deleteIcon from '@/public/deleteIcon.svg';
import editIcon from '@/public/editIcon.svg';
import Image from 'next/image';

type AdministrationCountryCardProps = {
  country: Country;
  onEdit: (country: Country) => void;
  onDelete: (country: Country) => void;
};

function AdministrationCountryCard({
  country,
  onEdit,
  onDelete,
}: AdministrationCountryCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      {/* Country Name */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{country.name}</h3>
        <div className="flex items-center gap-3">
          <Image
            src={editIcon}
            alt="Edit"
            width={20}
            height={20}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onEdit(country)}
          />
          <Image
            src={deleteIcon}
            alt="Delete"
            width={20}
            height={20}
            className="cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => onDelete(country)}
          />
        </div>
      </div>

    </div>
  );
}

export default AdministrationCountryCard;
