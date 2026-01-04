/**
 * Edit Cabinet Collection Settings Component
 *
 * Handles collection settings fields.
 *
 * Features:
 * - Collection Report Multiplier
 * - Last Collection Time
 * - Last Meters In
 * - Last Meters Out
 *
 * @module components/cabinets/EditCabinetModal/EditCabinetCollectionSettings
 */
'use client';

import { Input } from '@/components/ui/input';
import { ModernCalendar } from '@/components/ui/ModernCalendar';

type EditCabinetCollectionSettingsProps = {
  formData: {
    collectionSettings?: {
      multiplier?: string;
      lastCollectionTime?: string;
      lastMetersIn?: string;
      lastMetersOut?: string;
    };
    collectionMultiplier?: string;
  };
  collectionTime: Date;
  collectionMultiplierError: string;
  onFormDataChange: (updates: Partial<EditCabinetCollectionSettingsProps['formData']>) => void;
  onCollectionTimeChange: (date: Date) => void;
  onCollectionMultiplierErrorChange: (error: string) => void;
};

export default function EditCabinetCollectionSettings({
  formData,
  collectionTime,
  collectionMultiplierError,
  onFormDataChange,
  onCollectionTimeChange,
  onCollectionMultiplierErrorChange,
}: EditCabinetCollectionSettingsProps) {
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-buttonActive">Collection Settings</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Collection Report Multiplier
          </label>
          <Input
            value={formData.collectionSettings?.multiplier || ''}
            onChange={e => {
              onCollectionMultiplierErrorChange('');
              onFormDataChange({
                collectionMultiplier: e.target.value,
                collectionSettings: {
                  ...formData.collectionSettings,
                  multiplier: e.target.value,
                },
              });
            }}
            placeholder="Enter multiplier"
            className={`border-border bg-container ${
              collectionMultiplierError ? 'border-red-500' : ''
            }`}
          />
          {collectionMultiplierError && (
            <p className="mt-1 text-xs text-red-500">
              {collectionMultiplierError}
            </p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Last Collection Time
          </label>
          <ModernCalendar
            date={{ from: collectionTime, to: collectionTime }}
            onSelect={(range: { from?: Date; to?: Date } | undefined) => {
              const date = range?.from;
              if (!date) return;
              onCollectionTimeChange(date);
              onFormDataChange({
                collectionSettings: {
                  ...formData.collectionSettings,
                  lastCollectionTime: date.toISOString(),
                },
              });
            }}
            enableTimeInputs={true}
            mode="single"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Last Meters In
          </label>
          <Input
            value={formData.collectionSettings?.lastMetersIn || ''}
            onChange={e =>
              onFormDataChange({
                collectionSettings: {
                  ...formData.collectionSettings,
                  lastMetersIn: e.target.value,
                },
              })
            }
            placeholder="Enter last meters in"
            className="border-border bg-container"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Last Meters Out
          </label>
          <Input
            value={formData.collectionSettings?.lastMetersOut || ''}
            onChange={e =>
              onFormDataChange({
                collectionSettings: {
                  ...formData.collectionSettings,
                  lastMetersOut: e.target.value,
                },
              })
            }
            placeholder="Enter last meters out"
            className="border-border bg-container"
          />
        </div>
      </div>
    </div>
  );
}
