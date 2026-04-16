/**
 * Collection Settings Content Component
 * 
 * Handles editing of machine-level collection settings.
 * Allows updating last collection meters, time, and collector denomination.
 */

import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { toast } from 'sonner';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

type CollectionSettingsContentProps = {
  cabinet: Cabinet;
};

export const CollectionSettingsContent: FC<CollectionSettingsContentProps> = ({
  cabinet,
}) => {
  const [isEditCollection, setIsEditCollection] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [collectionMetersIn, setCollectionMetersIn] = useState<string>('0');
  const [collectionMetersOut, setCollectionMetersOut] = useState<string>('0');
  const [collectionTime, setCollectionTime] = useState<Date>(new Date());
  const [collectorDenomination, setCollectorDenomination] =
    useState<string>('1');

  // Initialize collection settings from cabinet data
  useEffect(() => {
    if (cabinet.collectionMeters) {
      setCollectionMetersIn(String(cabinet.collectionMeters.metersIn || 0));
      setCollectionMetersOut(String(cabinet.collectionMeters.metersOut || 0));
    }
    if (cabinet.collectionTime) {
      const lastColTime = new Date(cabinet.collectionTime as string | Date);
      setCollectionTime(lastColTime);
    }
    if (cabinet.collectorDenomination) {
      setCollectorDenomination(String(cabinet.collectorDenomination));
    }
  }, [cabinet]);

  // Handle collection settings save
  const handleSaveCollectionSettings = async () => {
    if (!isEditCollection) {
      setIsEditCollection(true);
      return;
    }

    if (!collectionTime) {
      toast.error('Please select last collection time and save again.');
      return;
    }

    setIsUpdatingCollection(true);
    try {
      // Update cabinet data
      const updateData = {
        collectionMeters: {
          metersIn: parseInt(collectionMetersIn) || 0,
          metersOut: parseInt(collectionMetersOut) || 0,
        },
        collectionTime: collectionTime.toISOString(),
        collectorDenomination: parseFloat(collectorDenomination) || 1,
      };

      // Make API call to update cabinet
      const response = await fetch(`/api/cabinets/${cabinet._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection settings');
      }

      setIsEditCollection(false);
      toast.success('Collection settings updated successfully!');
    } catch (error) {
      console.error('Error saving collection settings:', error);
      toast.error('Failed to save collection settings');
    } finally {
      setIsUpdatingCollection(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-800">
          Collection Settings
        </h3>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Last Meters In */}
          <div className="space-y-2">
            <Label
              htmlFor="metersIn"
              className="text-sm font-medium text-gray-700"
            >
              Last Meters In
            </Label>
            <Input
              id="metersIn"
              type="number"
              value={collectionMetersIn}
              onChange={e => setCollectionMetersIn(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Last Meters Out */}
          <div className="space-y-2">
            <Label
              htmlFor="metersOut"
              className="text-sm font-medium text-gray-700"
            >
              Last Meters Out
            </Label>
            <Input
              id="metersOut"
              type="number"
              value={collectionMetersOut}
              onChange={e => setCollectionMetersOut(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Last Collection Time */}
          <div className="space-y-2">
            <Label
              htmlFor="collectionTime"
              className="text-sm font-medium text-gray-700"
            >
              Last Collection Time
            </Label>
            <ModernCalendar
              date={{ from: collectionTime, to: collectionTime }}
              onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                const date = range?.from;
                if (date) {
                  setCollectionTime(date);
                }
              }}
              enableTimeInputs={true}
              mode="single"
              disabled={!isEditCollection}
            />
          </div>

          {/* Collector Denomination */}
          <div className="space-y-2">
            <Label
              htmlFor="denomination"
              className="text-sm font-medium text-gray-700"
            >
              Collector Denomination
            </Label>
            <Input
              id="denomination"
              type="number"
              step="0.01"
              value={collectorDenomination}
              onChange={e => setCollectorDenomination(e.target.value)}
              disabled={!isEditCollection}
              className="w-full"
              placeholder="1.00"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveCollectionSettings}
            disabled={isUpdatingCollection}
            className="bg-buttonActive px-6 py-2 text-white hover:bg-buttonActive/90"
          >
            {isUpdatingCollection ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </div>
            ) : isEditCollection ? (
              'Save'
            ) : (
              'Edit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
