import React from "react";

interface ChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({ label, onRemove, className }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-medium mr-2 mb-2 ${
      className || ""
    }`}
  >
    {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="ml-2 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full"
        aria-label={`Remove ${label}`}
      >
        <svg
          className="w-4 h-4"
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
