'use client';


type MachineNotesInputProps = {
  notes: string;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * CollectionReportFormMachineNotes Component
 * Reusable notes textarea for machine-specific notes
 */
export default function CollectionReportFormMachineNotes({
  notes,
  onNotesChange,
  disabled = false,
  placeholder = 'Machine-specific notes...',
  className = '',
}: MachineNotesInputProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">
        Notes (for this machine)
      </label>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        disabled={disabled}
        className="h-20 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        placeholder={placeholder}
      />
    </div>
  );
};


