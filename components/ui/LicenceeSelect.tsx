import { licenceeSelectProps } from '@/lib/types/componentProps';
import { licenceeOptions } from '@/lib/constants/uiConstants';
import { licenceeOption } from '@/lib/types';

export default function LicenceeSelect({
  selected,
  onChange,
  disabled = false,
}: licenceeSelectProps) {
  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={`block w-auto rounded-md border border-gray-300 bg-white py-1 pl-2 pr-8 text-sm transition duration-150 ease-in-out focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {licenceeOptions.map((option: licenceeOption) => (
        <option key={option.value || 'all'} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
