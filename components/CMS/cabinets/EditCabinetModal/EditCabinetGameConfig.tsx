/**
 * Edit Cabinet Game Configuration Component
 *
 * Handles game-specific configuration fields.
 */
'use client';

import { Input } from '@/components/shared/ui/input';
import { Skeleton } from '@/components/shared/ui/skeleton';

type EditCabinetGameConfigProps = {
  formData: {
    gameConfig?: {
      theoreticalRtp?: number | string;
      maxBet?: string;
      payTableId?: string;
      additionalId?: string;
      gameOptions?: string;
      progressiveGroup?: string;
    };
  };
  cabinetDataLoading: boolean;
  onFormDataChange: (
    updates: Partial<EditCabinetGameConfigProps['formData']>
  ) => void;
};

export default function EditCabinetGameConfig({
  formData,
  cabinetDataLoading,
  onFormDataChange,
}: EditCabinetGameConfigProps) {
  // ============================================================================
  // Handlers
  // ============================================================================
  const handleConfigChange = (field: string, value: string) => {
    onFormDataChange({
      gameConfig: {
        ...formData.gameConfig,
        [field]: value,
      },
    });
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-2 text-sm font-medium text-buttonActive">
        Game Configuration
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Theoretical RTP %
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              value={formData.gameConfig?.theoreticalRtp || ''}
              onChange={e =>
                handleConfigChange('theoreticalRtp', e.target.value)
              }
              placeholder="e.g. 94.5"
              className="border-border bg-container"
            />
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Max Bet
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              value={formData.gameConfig?.maxBet || ''}
              onChange={e => handleConfigChange('maxBet', e.target.value)}
              placeholder="e.g. 1000"
              className="border-border bg-container"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Pay Table ID
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              value={formData.gameConfig?.payTableId || ''}
              onChange={e => handleConfigChange('payTableId', e.target.value)}
              placeholder="Enter Pay Table ID"
              className="border-border bg-container"
            />
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Additional ID
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              value={formData.gameConfig?.additionalId || ''}
              onChange={e => handleConfigChange('additionalId', e.target.value)}
              placeholder="Enter Additional ID"
              className="border-border bg-container"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Game Options
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              value={formData.gameConfig?.gameOptions || ''}
              onChange={e => handleConfigChange('gameOptions', e.target.value)}
              placeholder="Enter Game Options"
              className="border-border bg-container"
            />
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Progressive Group
          </label>
          {cabinetDataLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              value={formData.gameConfig?.progressiveGroup || ''}
              onChange={e =>
                handleConfigChange('progressiveGroup', e.target.value)
              }
              placeholder="Enter Progressive Group"
              className="border-border bg-container"
            />
          )}
        </div>
      </div>
    </div>
  );
}
