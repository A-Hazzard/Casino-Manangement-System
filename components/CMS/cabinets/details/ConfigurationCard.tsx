/**
 * Configuration Card Component
 * 
 * Displays and allows editing of machine configuration fields.
 * Supports currency, percentage, and date/time inputs.
 */

import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { MachineDocument } from '@/shared/types/entities';

type ConfigurationCardProps = {
  title: string;
  bgColor: string;
  machine: MachineDocument | null;
  field?: string;
  displayValue?: string;
  inputType?: 'currency' | 'percentage' | 'date';
  onSave: (value: number) => Promise<void>;
};

export const ConfigurationCard: FC<ConfigurationCardProps> = ({
  title,
  bgColor,
  machine,
  field,
  displayValue,
  inputType = 'currency',
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string>(
    displayValue || field
      ? String(
          field ? ((machine as Record<string, unknown>)?.[field] ?? '') : ''
        )
      : ''
  );
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: field
      ? new Date(
          String((machine as Record<string, unknown>)?.[field] || Date.now())
        )
      : undefined,
    to: field
      ? new Date(
          String((machine as Record<string, unknown>)?.[field] || Date.now())
        )
      : undefined,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      if (inputType === 'date' && field) {
        const fieldValue = (machine as Record<string, unknown>)?.[field];
        if (fieldValue) {
          const date = new Date(String(fieldValue));
          setDateRange({ from: date, to: date });
          setInputValue(date.toLocaleString());
        }
      } else if (displayValue !== undefined) {
        setInputValue(displayValue.replace(/[^0-9.]/g, ''));
      } else if (field) {
        setInputValue(
          String((machine as Record<string, unknown>)?.[field] ?? '')
        );
      }
    }
  }, [machine, isEditing, field, displayValue, inputType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (inputType === 'date') {
        await onSave(dateRange.from ? dateRange.from.getTime() : Date.now());
      } else {
        await onSave(parseFloat(inputValue) || 0);
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const currentValue =
    inputType === 'date' && dateRange.from
      ? dateRange.from.toLocaleString()
      : inputType === 'currency'
        ? `$${parseFloat(inputValue || '0').toFixed(2)}`
        : inputType === 'percentage'
          ? `${inputValue}%`
          : inputValue;

  return (
    <div className="flex w-72 max-w-full flex-col overflow-hidden rounded-lg shadow">
      <div className={`flex items-center justify-center ${bgColor} p-3`}>
        <span className="w-full text-center text-base font-semibold text-white">
          {title}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 bg-white p-4">
        {isEditing ? (
          <>
            {inputType === 'date' ? (
              <div className="w-full max-w-[250px]">
                <ModernCalendar
                  date={dateRange}
                  onSelect={range => {
                    if (range?.from) {
                      setDateRange({ from: range.from, to: range.from });
                    }
                  }}
                  enableTimeInputs={true}
                  mode="single"
                />
                {dateRange.from && (
                  <p className="mt-2 text-center text-sm text-gray-600">
                    Selected: {dateRange.from.toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <Input
                type="number"
                step={inputType === 'percentage' ? '1' : '0.01'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="w-full text-center"
                placeholder={inputType === 'currency' ? '0.00' : '0'}
              />
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-buttonActive text-white hover:bg-buttonActive/90"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-base font-medium text-gray-800">
              {currentValue || 'Not set'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="mt-1"
            >
              Edit
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
