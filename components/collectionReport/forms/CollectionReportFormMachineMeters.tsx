'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type MachineMetersFormProps = {
  metersIn: string;
  metersOut: string;
  ramClear: boolean;
  ramClearMetersIn?: string;
  ramClearMetersOut?: string;
  prevIn?: number | null;
  prevOut?: number | null;
  onMetersInChange: (value: string) => void;
  onMetersOutChange: (value: string) => void;
  onRamClearChange: (checked: boolean) => void;
  onRamClearMetersInChange?: (value: string) => void;
  onRamClearMetersOutChange?: (value: string) => void;
  disabled?: boolean;
  showValidation?: boolean;
  onDisabledClick?: () => void;
  className?: string;
};

/**
 * CollectionReportFormMachineMeters Component
 * Reusable form for entering machine meter readings
 * Used in collection report creation and editing modals
 */
export default function CollectionReportFormMachineMeters({
  metersIn,
  metersOut,
  ramClear,
  ramClearMetersIn = '',
  ramClearMetersOut = '',
  prevIn,
  prevOut,
  onMetersInChange,
  onMetersOutChange,
  onRamClearChange,
  onRamClearMetersInChange,
  onRamClearMetersOutChange,
  disabled = false,
  showValidation = true,
  onDisabledClick,
  className = '',
}: MachineMetersFormProps) {
  const inputsEnabled = !disabled;

  // Validation checks
  const metersInTooLow =
    showValidation &&
    metersIn &&
    prevIn !== null &&
    prevIn !== undefined &&
    Number(metersIn) < prevIn;

  const metersOutTooLow =
    showValidation &&
    metersOut &&
    prevOut !== null &&
    prevOut !== undefined &&
    Number(metersOut) < prevOut;

  const ramClearMetersInTooLow =
    showValidation &&
    ramClear &&
    ramClearMetersIn &&
    prevIn !== null &&
    prevIn !== undefined &&
    Number(ramClearMetersIn) < prevIn;

  const ramClearMetersOutTooLow =
    showValidation &&
    ramClear &&
    ramClearMetersOut &&
    prevOut !== null &&
    prevOut !== undefined &&
    Number(ramClearMetersOut) < prevOut;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Meters In and Meters Out - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meters In */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Meters In: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="0"
            value={metersIn}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onMetersInChange(val);
              }
            }}
            onClick={!inputsEnabled ? onDisabledClick : undefined}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Prev In: {prevIn !== null && prevIn !== undefined ? prevIn : 0}
          </p>
          {metersInTooLow && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-xs">
                Warning: Meters In ({metersIn}) should be greater than or equal
                to Previous Meters In ({prevIn})
              </p>
            </div>
          )}
        </div>

        {/* Meters Out */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Meters Out: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="0"
            value={metersOut}
            onChange={(e) => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onMetersOutChange(val);
              }
            }}
            onClick={!inputsEnabled ? onDisabledClick : undefined}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Prev Out: {prevOut !== null && prevOut !== undefined ? prevOut : 0}
          </p>
          {metersOutTooLow && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-xs">
                Warning: Meters Out ({metersOut}) should be greater than or
                equal to Previous Meters Out ({prevOut})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RAM Clear Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="ramClear"
          checked={ramClear}
          onCheckedChange={onRamClearChange}
          disabled={disabled}
        />
        <Label
          htmlFor="ramClear"
          className="text-sm font-medium cursor-pointer"
        >
          RAM Clear
        </Label>
      </div>

      {/* RAM Clear Meters - Side by Side (only shown if RAM Clear is checked) */}
      {ramClear && onRamClearMetersInChange && onRamClearMetersOutChange && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">
              RAM Clear Meters In: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="0"
              value={ramClearMetersIn}
              onChange={(e) => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onRamClearMetersInChange(val);
                }
              }}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Meters before RAM clear
            </p>
            {ramClearMetersInTooLow && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-xs">
                  Warning: RAM Clear Meters In ({ramClearMetersIn}) should be
                  greater than or equal to Previous Meters In ({prevIn})
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              RAM Clear Meters Out: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="0"
              value={ramClearMetersOut}
              onChange={(e) => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onRamClearMetersOutChange(val);
                }
              }}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Meters before RAM clear
            </p>
            {ramClearMetersOutTooLow && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-xs">
                  Warning: RAM Clear Meters Out ({ramClearMetersOut}) should be
                  greater than or equal to Previous Meters Out ({prevOut})
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

