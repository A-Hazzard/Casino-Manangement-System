/**
 * Edit Cabinet Basic Information Component
 *
 * Handles basic cabinet information fields.
 *
 * Features:
 * - Serial Number
 * - Installed Game
 * - Game Type
 * - Manufacturer
 * - Cabinet Type
 * - Cronos Machine checkbox
 *
 * @module components/cabinets/EditCabinetModal/EditCabinetBasicInfo
 */
'use client';

import { Checkbox } from '@/components/shared/ui/checkbox';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Skeleton } from '@/components/shared/ui/skeleton';

type EditCabinetBasicInfoProps = {
  formData: {
    assetNumber: string;
    installedGame: string;
    gameType: string;
    manufacturer: string;
    cabinetType: string;
    isCronosMachine: boolean;
    accountingDenomination: string;
    otherGameType?: string;
    custom: { name: string };
  };
  cabinetDataLoading: boolean;
  manufacturersLoading: boolean;
  manufacturers: string[];
  serialNumberError: string;
  installedGameError: string;
  customNameError: string;
  isAddingManufacturer?: boolean;
  onFormDataChange: (
    updates: Partial<EditCabinetBasicInfoProps['formData']>
  ) => void;
  onUserModifiedFieldsChange: (field: string) => void;
  onAddManufacturerToggle?: (adding: boolean) => void;
  onSerialNumberBlur?: (value: string) => void;
  onCustomNameBlur?: (value: string) => void;
};

export default function EditCabinetBasicInfo({
  formData,
  cabinetDataLoading,
  manufacturersLoading,
  manufacturers,
  serialNumberError,
  installedGameError,
  customNameError,
  isAddingManufacturer = false,
  onFormDataChange,
  onUserModifiedFieldsChange,
  onAddManufacturerToggle,
  onSerialNumberBlur,
  onCustomNameBlur,
}: EditCabinetBasicInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-2 text-sm font-medium text-buttonActive">
        Basic Information
      </h3>
      {/* Serial Number & Installed Game */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Serial Number
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <Input
                id="assetNumber"
                name="assetNumber"
                value={formData.assetNumber}
                onChange={e =>
                  onFormDataChange({ assetNumber: e.target.value })
                }
                onBlur={e => onSerialNumberBlur?.(e.target.value)}
                placeholder="Enter serial number"
                className={`border-border bg-container ${
                  serialNumberError ? 'border-red-500' : ''
                }`}
              />
              {serialNumberError && (
                <p className="mt-1 text-xs text-red-500">{serialNumberError}</p>
              )}
            </>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Installed Game
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <Input
                id="installedGame"
                name="installedGame"
                value={formData.installedGame}
                onChange={e =>
                  onFormDataChange({ installedGame: e.target.value })
                }
                placeholder="Enter installed game name"
                className={`border-border bg-container ${
                  installedGameError ? 'border-red-500' : ''
                }`}
              />
              {installedGameError && (
                <p className="mt-1 text-xs text-red-500">
                  {installedGameError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Machine Custom Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-grayHighlight">
          Machine Custom Name
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
              onBlur={e => onCustomNameBlur?.(e.target.value)}
              placeholder="Enter custom machine name"
              className={`border-border bg-container ${
                customNameError ? 'border-red-500' : ''
              }`}
            />
            {customNameError && (
              <p className="mt-1 text-xs text-red-500">{customNameError}</p>
            )}
          </>
        )}
        <p className="mt-1 text-xs text-gray-500">
          A friendly name for this machine to display in reports
        </p>
      </div>

      {/* Game Type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-grayHighlight">
          Game Type
        </label>
        {cabinetDataLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={formData.gameType}
            onValueChange={value => {
              onUserModifiedFieldsChange('gameType');
              onFormDataChange({ gameType: value });
            }}
          >
            <SelectTrigger className="border-border bg-container">
              <SelectValue placeholder="Select Game Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slot">Slot</SelectItem>
              <SelectItem value="roulette">Roulette</SelectItem>
              <SelectItem value="pulse">Pulse</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        )}
        {formData.gameType === 'other' && (
          <div className="mt-2 text-sm">
            <Input
              id="otherGameType"
              name="otherGameType"
              value={formData.otherGameType || ''}
              onChange={e => {
                onUserModifiedFieldsChange('gameType');
                onFormDataChange({ otherGameType: e.target.value });
              }}
              placeholder="Enter custom game type"
              className="border-border bg-container"
            />
          </div>
        )}
      </div>

      {/* Manufacturer */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-grayHighlight">
            Manufacturer
          </label>
          <button
            type="button"
            onClick={() => onAddManufacturerToggle?.(!isAddingManufacturer)}
            className="text-xs text-buttonActive hover:underline"
          >
            {isAddingManufacturer ? 'Select from list' : '+ Add New'}
          </button>
        </div>
        {isAddingManufacturer ? (
          <Input
            placeholder="Enter manufacturer name"
            value={formData.manufacturer}
            onChange={e => {
              onUserModifiedFieldsChange('manufacturer');
              onFormDataChange({ manufacturer: e.target.value });
            }}
            className="h-10 border-border bg-container"
          />
        ) : manufacturersLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={formData.manufacturer}
            onValueChange={value => {
              if (value !== 'no-manufacturers') {
                onUserModifiedFieldsChange('manufacturer');
                onFormDataChange({ manufacturer: value });
              }
            }}
          >
            <SelectTrigger className="h-10 border-border bg-container">
              <SelectValue placeholder="Select Manufacturer" />
            </SelectTrigger>
            <SelectContent>
              {manufacturers.length > 0 ? (
                manufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-manufacturers" disabled>
                  No manufacturers found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Cabinet Type
          </label>
          <Select
            value={formData.cabinetType as string}
            onValueChange={value => onFormDataChange({ cabinetType: value })}
          >
            <SelectTrigger className="border-border bg-container">
              <SelectValue placeholder="Select Cabinet Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standing">Standing</SelectItem>
              <SelectItem value="Slant Top">Slant Top</SelectItem>
              <SelectItem value="Bar Top">Bar Top</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isCronosMachine"
            checked={Boolean(formData.isCronosMachine)}
            onCheckedChange={checked =>
              onFormDataChange({ isCronosMachine: Boolean(checked) })
            }
          />
          <label
            htmlFor="isCronosMachine"
            className="text-sm font-medium text-grayHighlight"
          >
            Cronos Machine
          </label>
        </div>
      </div>

      {formData.isCronosMachine && (
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Accounting Denomination (Cronos Only)
          </label>
          <Input
            id="accountingDenominationCronos"
            name="accountingDenomination"
            value={formData.accountingDenomination}
            onChange={e =>
              onFormDataChange({ accountingDenomination: e.target.value })
            }
            placeholder="Enter denomination"
            className="border-border bg-container"
          />
        </div>
      )}
    </div>
  );
}
