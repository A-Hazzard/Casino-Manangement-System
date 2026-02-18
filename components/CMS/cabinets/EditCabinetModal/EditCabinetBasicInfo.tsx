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
  };
  cabinetDataLoading: boolean;
  manufacturersLoading: boolean;
  manufacturers: string[];
  serialNumberError: string;
  installedGameError: string;
  onFormDataChange: (updates: Partial<EditCabinetBasicInfoProps['formData']>) => void;
  onUserModifiedFieldsChange: (field: string) => void;
};

export default function EditCabinetBasicInfo({
  formData,
  cabinetDataLoading,
  manufacturersLoading,
  manufacturers,
  serialNumberError,
  installedGameError,
  onFormDataChange,
  onUserModifiedFieldsChange,
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
                onChange={e => onFormDataChange({ assetNumber: e.target.value })}
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
                onChange={e => onFormDataChange({ installedGame: e.target.value })}
                placeholder="Enter installed game name"
                className={`border-border bg-container ${
                  installedGameError ? 'border-red-500' : ''
                }`}
              />
              {installedGameError && (
                <p className="mt-1 text-xs text-red-500">{installedGameError}</p>
              )}
            </>
          )}
        </div>
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
        <label className="mb-2 block text-sm font-medium text-grayHighlight">
          Manufacturer
        </label>
        {manufacturersLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={formData.manufacturer}
            onValueChange={value => {
              // Prevent setting the disabled "no-manufacturers" value
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

