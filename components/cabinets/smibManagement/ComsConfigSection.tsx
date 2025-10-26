'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import editIcon from '@/public/editIcon.svg';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type ComsConfigSectionProps = {
  comsMode?: string;
  comsAddr?: string;
  comsRateMs?: string;
  comsRTE?: string;
  comsGPC?: string;
  isEditMode: boolean;
  onToggleEdit: () => void;
  onUpdate: (data: {
    comsMode?: string;
    comsAddr?: string;
    comsRateMs?: string;
    comsRTE?: string;
    comsGPC?: string;
  }) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
};

export function ComsConfigSection({
  comsMode,
  comsAddr,
  comsRateMs,
  comsRTE,
  comsGPC,
  isEditMode,
  onToggleEdit,
  onUpdate,
  disabled = false,
  isLoading = false,
}: ComsConfigSectionProps) {
  const [formData, setFormData] = useState({
    comsMode: comsMode || '',
    comsAddr: comsAddr || '',
    comsRateMs: comsRateMs || '',
    comsRTE: comsRTE || '',
    comsGPC: comsGPC || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Update form data when props change
  useEffect(() => {
    setFormData({
      comsMode: comsMode || '',
      comsAddr: comsAddr || '',
      comsRateMs: comsRateMs || '',
      comsRTE: comsRTE || '',
      comsGPC: comsGPC || '',
    });
  }, [comsMode, comsAddr, comsRateMs, comsRTE, comsGPC]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(formData);
      onToggleEdit(); // Exit edit mode on success
    } catch (error) {
      console.error('Failed to update COMS config:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      comsMode: comsMode || '',
      comsAddr: comsAddr || '',
      comsRateMs: comsRateMs || '',
      comsRTE: comsRTE || '',
      comsGPC: comsGPC || '',
    });
    onToggleEdit();
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-bold text-gray-700">
          COMS Configuration
        </CardTitle>
        {!isEditMode && !disabled && (
          <button
            onClick={onToggleEdit}
            className="cursor-pointer transition-opacity hover:opacity-70"
            type="button"
          >
            <Image
              src={editIcon}
              alt="Edit"
              width={20}
              height={20}
              className="h-5 w-5"
            />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          /* Skeleton loader while fetching */
          <>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
          </>
        ) : (
          <>
            {/* Mode */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="comsMode" className="text-sm text-gray-600">
                Mode
              </Label>
              {isEditMode ? (
                <Input
                  id="comsMode"
                  value={formData.comsMode}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, comsMode: e.target.value }))
                  }
                  placeholder="Enter mode (0=SAS, 1=Non-SAS, 2=IGT)"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {comsMode || 'Not configured'}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="comsAddr" className="text-sm text-gray-600">
                Address
              </Label>
              {isEditMode ? (
                <Input
                  id="comsAddr"
                  value={formData.comsAddr}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, comsAddr: e.target.value }))
                  }
                  placeholder="Enter address"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {comsAddr || 'Not configured'}
                </div>
              )}
            </div>

            {/* Rate (ms) */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="comsRateMs" className="text-sm text-gray-600">
                Rate (ms)
              </Label>
              {isEditMode ? (
                <Input
                  id="comsRateMs"
                  value={formData.comsRateMs}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      comsRateMs: e.target.value,
                    }))
                  }
                  placeholder="Enter rate in milliseconds"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {comsRateMs || 'Not configured'}
                </div>
              )}
            </div>

            {/* RTE */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="comsRTE" className="text-sm text-gray-600">
                RTE
              </Label>
              {isEditMode ? (
                <Input
                  id="comsRTE"
                  value={formData.comsRTE}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, comsRTE: e.target.value }))
                  }
                  placeholder="Enter RTE"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {comsRTE || 'Not configured'}
                </div>
              )}
            </div>

            {/* GPC */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="comsGPC" className="text-sm text-gray-600">
                GPC
              </Label>
              {isEditMode ? (
                <Input
                  id="comsGPC"
                  value={formData.comsGPC}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, comsGPC: e.target.value }))
                  }
                  placeholder="Enter GPC"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {comsGPC || 'Not configured'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Update/Cancel Buttons */}
        {isEditMode && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-button text-white hover:bg-button/90"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isUpdating}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
