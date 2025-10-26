'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import editIcon from '@/public/editIcon.svg';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type NetworkConfigSectionProps = {
  networkSSID?: string;
  networkPassword?: string;
  networkChannel?: string;
  networkMode?: number; // 0 = ethernet, 1 = wifi
  isEditMode: boolean;
  onToggleEdit: () => void;
  onUpdate: (data: {
    networkSSID?: string;
    networkPassword?: string;
    networkChannel?: string;
  }) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  isConnectedToMqtt?: boolean;
};

export function NetworkConfigSection({
  networkSSID,
  networkPassword,
  networkChannel,
  networkMode,
  isEditMode,
  onToggleEdit,
  onUpdate,
  disabled = false,
  isLoading = false,
  isConnectedToMqtt = false,
}: NetworkConfigSectionProps) {
  const [formData, setFormData] = useState({
    networkSSID: networkSSID || '',
    networkPassword: networkPassword || '',
    networkChannel: networkChannel || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Update form data when props change
  useEffect(() => {
    setFormData({
      networkSSID: networkSSID || '',
      networkPassword: networkPassword || '',
      networkChannel: networkChannel || '',
    });
  }, [networkSSID, networkPassword, networkChannel]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(formData);
      onToggleEdit(); // Exit edit mode on success
    } catch (error) {
      console.error('Failed to update network config:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      networkSSID: networkSSID || '',
      networkPassword: networkPassword || '',
      networkChannel: networkChannel || '',
    });
    onToggleEdit();
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-bold text-gray-700">
            Network / WiFi
          </CardTitle>
          {/* SMIB Online/Offline Status */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isConnectedToMqtt
                  ? 'animate-pulse bg-green-500'
                  : 'bg-red-500'
              }`}
            ></div>
            <span
              className={`text-sm font-medium ${
                isConnectedToMqtt ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isConnectedToMqtt ? 'SMIB Online' : 'SMIB Offline'}
            </span>
          </div>
        </div>
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
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
          </>
        ) : (
          <>
            {/* Network Mode */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label className="text-sm text-gray-600">Mode</Label>
              <div className="text-sm font-medium sm:col-start-2">
                {networkMode !== undefined ? networkMode : 'Not configured'}
              </div>
            </div>

            {/* SSID */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="networkSSID" className="text-sm text-gray-600">
                SSID
              </Label>
              {isEditMode ? (
                <Input
                  id="networkSSID"
                  value={formData.networkSSID}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      networkSSID: e.target.value,
                    }))
                  }
                  placeholder="Enter network SSID"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {networkSSID || 'Not configured'}
                </div>
              )}
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="networkPassword" className="text-sm text-gray-600">
                Password
              </Label>
              {isEditMode ? (
                <Input
                  id="networkPassword"
                  type="password"
                  value={formData.networkPassword}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      networkPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter network password"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {networkPassword ? '••••••••' : 'Not configured'}
                </div>
              )}
            </div>

            {/* Channel */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="networkChannel" className="text-sm text-gray-600">
                Channel
              </Label>
              {isEditMode ? (
                <Input
                  id="networkChannel"
                  value={formData.networkChannel}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      networkChannel: e.target.value,
                    }))
                  }
                  placeholder="Enter channel"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {networkChannel || 'Not configured'}
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

