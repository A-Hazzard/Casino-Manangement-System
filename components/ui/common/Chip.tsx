import React from 'react';
import type { ChipProps } from '@/lib/types/components';

const Chip: React.FC<ChipProps> = ({ label, onRemove, className }) => (
  <span
    className={`mb-2 mr-2 inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white ${
      className || ''
    }`}
  >
    {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="ml-2 rounded-full text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label={`Remove ${label}`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    )}
  </span>
);

export default Chip;
