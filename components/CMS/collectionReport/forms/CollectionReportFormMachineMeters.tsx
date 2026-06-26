'use client';

import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Label } from '@/components/shared/ui/label';

type MachineMetersFormProps = {
  metersIn: string;
  metersOut: string;
  ramClear: boolean;
  ramClearMetersIn?: string;
  ramClearMetersOut?: string;
  prevIn?: string | number | null;
  prevOut?: string | number | null;
  onPrevInChange?: (value: string) => void;
  onPrevOutChange?: (value: string) => void;
  onMetersInChange: (value: string) => void;
  onMetersOutChange: (value: string) => void;
  onRamClearChange: (checked: boolean) => void;
  onRamClearMetersInChange?: (value: string) => void;
  onRamClearMetersOutChange?: (value: string) => void;
  disabled?: boolean;
  showValidation?: boolean;
  onDisabledClick?: () => void;
  className?: string;
  isWow?: boolean;
  includeJackpot?: boolean;
  jackpot?: number;
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
  onPrevInChange,
  onPrevOutChange,
  disabled = false,
  showValidation = true,
  onDisabledClick,
  className = '',
  isWow = false,
  includeJackpot = false,
  jackpot = 0,
}: MachineMetersFormProps) {
  // ============================================================================
  // Computed
  // ============================================================================
  const inputsEnabled = !disabled;

  const formatMeterValue = (value: string | number | null | undefined) =>
    value !== '' && value !== null && value !== undefined
      ? Number(value).toLocaleString()
      : '--';

  // WOW machines: meters are synced automatically and shown read-only.
  if (isWow) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3">
          <p className="mb-2 text-[11px] font-medium italic text-purple-700">
            WOW machine — meters are synced automatically and cannot be edited.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-xs font-medium text-gray-600">
                Meter In:
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {formatMeterValue(metersIn)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-xs font-medium text-gray-600">
                Meter Out:
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {formatMeterValue(metersOut)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-xs font-medium text-gray-600">
                Prev In:
              </span>
              <span className="text-xs font-semibold text-gray-600">
                {formatMeterValue(prevIn)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-xs font-medium text-gray-600">
                Prev Out:
              </span>
              <span className="text-xs font-semibold text-gray-600">
                {formatMeterValue(prevOut)}
              </span>
            </div>
          </div>
          {includeJackpot && jackpot !== undefined && jackpot > 0 && (
            <div className="mt-2 rounded border border-purple-100 bg-purple-50 p-2.5 text-[10px] text-purple-700 space-y-1 leading-normal">
              <div className="flex items-center gap-1 font-bold">
                <span>✨ Jackpot Included (+{Number(jackpot).toLocaleString()})</span>
              </div>
              <p>
                Base Meter Out: <strong>{metersOut && Number(metersOut) > jackpot ? (Number(metersOut) - jackpot).toLocaleString() : '--'}</strong><br />
                Jackpot Amount: <strong>+{Number(jackpot).toLocaleString()}</strong><br />
                Total (Included): <strong>{metersOut ? Number(metersOut).toLocaleString() : '--'}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Validation checks
  // When RAM clear is checked the current meters are post-reset readings (expected to be lower)
  const metersInTooLow =
    showValidation &&
    !ramClear &&
    metersIn &&
    prevIn !== null &&
    prevIn !== undefined &&
    Number(metersIn) < Number(prevIn);

  const metersOutTooLow =
    showValidation &&
    !ramClear &&
    metersOut &&
    prevOut !== null &&
    prevOut !== undefined &&
    Number(metersOut) < Number(prevOut);

  const ramClearMetersInTooLow =
    showValidation &&
    ramClear &&
    ramClearMetersIn &&
    prevIn !== null &&
    prevIn !== undefined &&
    Number(ramClearMetersIn) < Number(prevIn);

  const ramClearMetersOutTooLow =
    showValidation &&
    ramClear &&
    ramClearMetersOut &&
    prevOut !== null &&
    prevOut !== undefined &&
    Number(ramClearMetersOut) < Number(prevOut);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Meters In and Meters Out - Side by Side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Meters In */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium">
            Meters In: <span className="ml-1 text-red-500">*</span>
            <CalculationHelp
              title="Meters In"
              formula="Current In - Previous In"
              description="Calculates the total credits or cash inserted into the machine since the last collection."
            />
          </label>
          <input
            type="text"
            placeholder="0"
            value={metersIn}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onMetersInChange(val);
              }
            }}
            onClick={!inputsEnabled ? onDisabledClick : undefined}
            disabled={disabled}
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <div className="mt-1 flex items-center gap-2">
            <label className="whitespace-nowrap text-xs text-gray-500">
              Prev In:
            </label>
            <input
              type="text"
              value={prevIn || ''}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onPrevInChange?.(val);
                }
              }}
              disabled={disabled}
              className="w-full rounded border bg-gray-50 p-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {metersInTooLow && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
              <p className="text-xs text-red-600">
                Warning: Meters In ({metersIn}) should be greater than or equal
                to Previous Meters In ({prevIn})
              </p>
            </div>
          )}
        </div>

        {/* Meters Out */}
        <div>
          <label className="mb-1 flex items-center text-sm font-medium">
            Meters Out: <span className="ml-1 text-red-500">*</span>
            <CalculationHelp
              title="Meters Out"
              formula="Current Out - Previous Out"
              description="Calculates the total payouts or credits won by players since the last collection."
            />
          </label>
          <input
            type="text"
            placeholder="0"
            value={metersOut}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                onMetersOutChange(val);
              }
            }}
            onClick={!inputsEnabled ? onDisabledClick : undefined}
            disabled={disabled}
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <div className="mt-1 flex items-center gap-2">
            <label className="whitespace-nowrap text-xs text-gray-500">
              Prev Out:
            </label>
            <input
              type="text"
              value={prevOut || ''}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onPrevOutChange?.(val);
                }
              }}
              disabled={disabled}
              className="w-full rounded border bg-gray-50 p-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {metersOutTooLow && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
              <p className="text-xs text-red-600">
                Warning: Meters Out ({metersOut}) should be greater than or
                equal to Previous Meters Out ({prevOut})
              </p>
            </div>
          )}
          {includeJackpot && jackpot !== undefined && jackpot > 0 && (
            <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 p-2.5 text-xs text-purple-800 space-y-1 leading-normal">
              <div className="flex items-center gap-1 font-bold">
                <span>✨ Jackpot Included (+{Number(jackpot).toLocaleString()})</span>
              </div>
              <p className="text-[10px] text-purple-700 leading-normal">
                Base Meter Out: <strong>{metersOut && Number(metersOut) > jackpot ? (Number(metersOut) - jackpot).toLocaleString() : '--'}</strong><br />
                Jackpot Amount: <strong>+{Number(jackpot).toLocaleString()}</strong><br />
                Total (Included): <strong>{metersOut ? Number(metersOut).toLocaleString() : '--'}</strong>
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
          className="cursor-pointer text-sm font-medium"
        >
          RAM Clear
          <CalculationHelp
            title="RAM Clear"
            formula="(RAM_Clear_Meters - Previous_Meters) + Current_Meters"
            description="Used when machine meters are reset to zero. This formula ensures no data is lost during the reset."
          />
        </Label>
      </div>

      {/* RAM Clear Meters - Side by Side (only shown if RAM Clear is checked) */}
      {ramClear && onRamClearMetersInChange && onRamClearMetersOutChange && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              RAM Clear Meters In: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="0"
              value={ramClearMetersIn}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onRamClearMetersInChange(val);
                }
              }}
              disabled={disabled}
              className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Meters before RAM clear
            </p>
            {ramClearMetersInTooLow && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: RAM Clear Meters In ({ramClearMetersIn}) must be
                  greater than or equal to Previous Meters In ({prevIn})
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              RAM Clear Meters Out: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="0"
              value={ramClearMetersOut}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onRamClearMetersOutChange(val);
                }
              }}
              disabled={disabled}
              className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Meters before RAM clear
            </p>
            {ramClearMetersOutTooLow && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: RAM Clear Meters Out ({ramClearMetersOut}) must be
                  greater than or equal to Previous Meters Out ({prevOut})
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
