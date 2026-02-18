/**
 * Country Table Component
 * Desktop table view for displaying countries with actions.
 *
 * Features:
 * - Country information display (name, codes, ISO numeric)
 * - Action icons (edit, delete)
 * - Responsive design (desktop only)
 *
 * @param props - Component props
 */
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import type { Country } from '@/lib/types/country';
import deleteIcon from '@/public/deleteIcon.svg';
import editIcon from '@/public/editIcon.svg';
import Image from 'next/image';

type AdministrationCountryTableProps = {
  countries: Country[];
  onEdit: (country: Country) => void;
  onDelete: (country: Country) => void;
};

function AdministrationCountryTable({
  countries,
  onEdit,
  onDelete,
}: AdministrationCountryTableProps) {
  return (
    <div className="hidden lg:block">
      <Table className="rounded-lg bg-white shadow-md">
        <TableHeader>
          <TableRow className="bg-button hover:bg-button">
            <TableHead className="font-semibold text-white">NAME</TableHead>
            <TableHead centered className="font-semibold text-white">
              ACTIONS
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {countries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="py-6 text-center text-gray-500">
                No countries found.
              </TableCell>
            </TableRow>
          ) : (
            countries.map(country => (
              <TableRow
                key={country._id}
                className="transition-colors hover:bg-gray-50"
              >
                <TableCell className="font-medium text-gray-700">
                  {country.name}
                </TableCell>
                <TableCell centered>
                  <div className="flex items-center justify-center gap-3">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default AdministrationCountryTable;
