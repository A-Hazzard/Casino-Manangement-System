/**
 * Country Table Component
 * Desktop table view for displaying countries.
 *
 * Features:
 * - Country information display (name, alpha-2, alpha-3, ISO numeric, created date)
 * - Edit and delete actions
 * - Responsive design (desktop only)
 * - Date formatting
 *
 * @param countries - Array of country objects
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 */
import type { Country } from '@/lib/types/country';
import Image from 'next/image';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import { formatFullDate } from '@/lib/utils/dateFormatting';

type CountryTableProps = {
  countries: Country[];
  onEdit: (country: Country) => void;
  onDelete: (country: Country) => void;
};

export default function CountryTable({
  countries,
  onEdit,
  onDelete,
}: CountryTableProps) {
  return (
    <div className="mt-6 hidden overflow-x-auto lg:block">
      <table className="min-w-full rounded-lg bg-white shadow-md">
        <thead className="bg-button text-white">
          <tr>
            <th className="px-4 py-3 text-center text-sm font-semibold">
              NAME
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold">
              ALPHA 2
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold">
              ALPHA 3
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold">ISO</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">
              CREATED ON
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {countries.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-500">
                No countries found.
              </td>
            </tr>
          ) : (
            countries.map(country => (
              <tr
                key={country._id}
                className="border-b transition-colors last:border-b-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-700">
                  {country.name}
                </td>
                <td className="px-4 py-3 text-gray-700">{country.alpha2}</td>
                <td className="px-4 py-3 text-gray-700">{country.alpha3}</td>
                <td className="px-4 py-3 text-gray-700">
                  {country.isoNumeric}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatFullDate(country.createdAt)}
                </td>
                <td className="flex max-w-[120px] items-center justify-center gap-2 px-4 py-3">
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
                    className="max-h-[24px] max-w-[24px] cursor-pointer opacity-70 hover:opacity-100"
                    onClick={() => onDelete(country)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
