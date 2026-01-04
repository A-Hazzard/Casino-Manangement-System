/**
 * Edit Cabinet Location & Configuration Component
 *
 * Handles location and configuration fields.
 *
 * Features:
 * - Accounting Denomination
 * - Location selection
 * - SMIB Board
 * - Status
 * - Custom Name (conditional)
 *
 * @module components/cabinets/EditCabinetModal/EditCabinetLocationConfig
 */
'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type EditCabinetLocationConfigProps = {
  formData: {
    accountingDenomination: string;
    locationId: string;
    smbId: string;
    status: string;
    custom?: { name?: string };
  };
  locations: Array<{ id: string; name: string; sasEnabled: boolean }>;
  cabinetDataLoading: boolean;
  locationsLoading: boolean;
  accountingDenominationError: string;
  locationError: string;
  relayIdError: string;
  hasValidSerialNumber: boolean;
  onFormDataChange: (updates: Partial<EditCabinetLocationConfigProps['formData']>) => void;
  onLocationErrorChange: (error: string) => void;
};

export default function EditCabinetLocationConfig({
  formData,
  locations,
  cabinetDataLoading,
  locationsLoading,
  accountingDenominationError,
  locationError,
  relayIdError,
  hasValidSerialNumber,
  onFormDataChange,
  onLocationErrorChange,
}: EditCabinetLocationConfigProps) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-2 text-sm font-medium text-buttonActive">
        Location & Configuration
      </h3>
      {/* Accounting Denomination */}
      <div>
        <label className="mb-2 block text-sm font-medium text-grayHighlight">
          Accounting Denomination
        </label>
        {cabinetDataLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <Input
              id="accountingDenomination"
              name="accountingDenomination"
              value={formData.accountingDenomination}
              onChange={e =>
                onFormDataChange({ accountingDenomination: e.target.value })
              }
              placeholder="Enter denomination"
              className={`border-border bg-container ${
                accountingDenominationError ? 'border-red-500' : ''
              }`}
            />
            {accountingDenominationError && (
              <p className="mt-1 text-xs text-red-500">
                {accountingDenominationError}
              </p>
            )}
          </>
        )}
      </div>

      {/* Location & SMIB Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Location
          </label>
          {locationsLoading || cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={formData.locationId || undefined}
              onValueChange={locationId => {
                onLocationErrorChange('');
                onFormDataChange({ locationId: locationId });
              }}
            >
              <SelectTrigger
                className={`w-full border-border bg-container ${
                  locationError ? 'border-red-500' : ''
                }`}
              >
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter(location => location.id && location.id.trim() !== '')
                  .map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            SMIB Board
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <Input
                id="smbId"
                name="smbId"
                value={formData.smbId}
                onChange={e => onFormDataChange({ smbId: e.target.value })}
                placeholder="Enter SMIB Board"
                className={`border-border bg-container ${
                  relayIdError ? 'border-red-500' : ''
                }`}
                maxLength={12}
              />
              {relayIdError && (
                <p className="mt-1 text-xs text-red-500">{relayIdError}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Field */}
      <div>
        <label className="mb-2 block text-sm font-medium text-grayHighlight">
          Status
        </label>
        <Select
          value={formData.status as string}
          onValueChange={value => onFormDataChange({ status: value })}
        >
          <SelectTrigger className="border-border bg-container">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="non_functional">Non Functional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Name Field - Only show if no valid serial number */}
      {!hasValidSerialNumber && (
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Custom Name <span className="text-red-500">*</span>
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <Input
                id="customName"
                name="customName"
                value={formData.custom?.name || ''}
                onChange={e =>
                  onFormDataChange({
                    custom: {
                      ...formData.custom,
                      name: e.target.value,
                    },
                  })
                }
                placeholder="Enter custom name for this machine"
                className="border-border bg-container"
              />
              <p className="mt-1 text-xs text-gray-500">
                Since this machine doesn&apos;t have a valid serial number, you
                can set a custom name to identify it.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
