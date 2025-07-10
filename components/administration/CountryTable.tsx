import type { Country } from "@/lib/types/country";
import Image from "next/image";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

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
    <div className="overflow-x-auto hidden lg:block mt-6">
      <table className="min-w-full bg-white rounded-lg shadow-md">
        <thead className="bg-button text-white">
          <tr>
            <th className="py-3 px-4 text-left font-semibold text-sm">NAME</th>
            <th className="py-3 px-4 text-left font-semibold text-sm">
              ALPHA 2
            </th>
            <th className="py-3 px-4 text-left font-semibold text-sm">
              ALPHA 3
            </th>
            <th className="py-3 px-4 text-left font-semibold text-sm">ISO</th>
            <th className="py-3 px-4 text-left font-semibold text-sm">
              CREATED ON
            </th>
            <th className="py-3 px-4 text-center font-semibold text-sm">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          {countries.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-500 py-6">
                No countries found.
              </td>
            </tr>
          ) : (
            countries.map((country) => (
              <tr
                key={country._id}
                className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-gray-700">
                  {country.name}
                </td>
                <td className="py-3 px-4 text-gray-700">{country.alpha2}</td>
                <td className="py-3 px-4 text-gray-700">{country.alpha3}</td>
                <td className="py-3 px-4 text-gray-700">
                  {country.isoNumeric}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {country.createdAt
                    ? new Date(country.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-3 px-4 flex gap-2 items-center justify-center max-w-[120px]">
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
                    className="cursor-pointer opacity-70 hover:opacity-100 max-w-[24px] max-h-[24px]"
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
