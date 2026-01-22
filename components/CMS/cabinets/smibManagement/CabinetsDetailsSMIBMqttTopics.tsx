/**
 * CabinetsDetailsSMIBMqttTopics Component
 * 
 * Handles MQTT topics configuration for SMIB devices.
 * 
 * @param props - Component props
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import editIcon from '@/public/editIcon.svg';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatDateWithOrdinal } from '@/lib/utils/date';

export type CabinetsDetailsSMIBMqttTopicsProps = {
  mqttPubTopic?: string;
  mqttCfgTopic?: string;
  mqttSubTopic?: string;
  mqttURI?: string;
  mqttHost?: string;
  mqttPort?: string;
  mqttTLS?: string;
  mqttUsername?: string;
  mqttPassword?: string;
  mqttIdleTimeout?: string;
  updatedAt?: Date;
  isEditMode: boolean;
  onToggleEdit: () => void;
  onUpdate: (data: {
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttURI?: string;
  }) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  isConnectedToMqtt?: boolean;
};

export function CabinetsDetailsSMIBMqttTopics({
  mqttPubTopic,
  mqttCfgTopic,
  mqttSubTopic,
  mqttURI,
  mqttHost,
  mqttPort,
  mqttTLS,
  mqttUsername,
  mqttPassword,
  mqttIdleTimeout,
  updatedAt,
  isEditMode,
  onToggleEdit,
  onUpdate,
  disabled = false,
  isLoading = false,
  isConnectedToMqtt: _isConnectedToMqtt = false,
}: CabinetsDetailsSMIBMqttTopicsProps) {
  const [formData, setFormData] = useState({
    mqttPubTopic: mqttPubTopic || '',
    mqttCfgTopic: mqttCfgTopic || '',
    mqttURI: mqttURI || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Update form data when props change
  useEffect(() => {
    setFormData({
      mqttPubTopic: mqttPubTopic || '',
      mqttCfgTopic: mqttCfgTopic || '',
      mqttURI: mqttURI || '',
    });
  }, [mqttPubTopic, mqttCfgTopic, mqttURI]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(formData);
      onToggleEdit(); // Exit edit mode on success
    } catch (error) {
      console.error('Failed to update MQTT topics:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      mqttPubTopic: mqttPubTopic || '',
      mqttCfgTopic: mqttCfgTopic || '',
      mqttURI: mqttURI || '',
    });
    onToggleEdit();
  };

  const formatLastConfigured = () => {
    if (!updatedAt) return 'Unknown';
    return formatDateWithOrdinal(new Date(updatedAt));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-bold text-gray-700">
            MQTT Topics
          </CardTitle>
          <div className="text-xs text-gray-500">
            Last configured: {formatLastConfigured()}
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
            {/* Connection Info Skeleton */}
            <div className="rounded-md bg-gray-50 p-3">
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-300"></div>
              <div className="space-y-1">
                <div className="h-3 w-full animate-pulse rounded bg-gray-300"></div>
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-300"></div>
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-300"></div>
                <div className="h-3 w-5/6 animate-pulse rounded bg-gray-300"></div>
              </div>
            </div>
            {/* Authentication Skeleton */}
            <div className="rounded-md bg-gray-50 p-3">
              <div className="mb-2 h-4 w-28 animate-pulse rounded bg-gray-300"></div>
              <div className="space-y-1">
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-300"></div>
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-300"></div>
              </div>
            </div>
            {/* Topics Skeleton */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 sm:col-start-2"></div>
            </div>
          </>
        ) : (
          <>
            {/* Connection Info (Read-only) */}
            <div className="rounded-md bg-gray-50 p-3">
              <div className="mb-2 text-sm font-semibold text-gray-600">
                Connection
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Host: {mqttHost || 'Not configured'}</div>
                <div>Port: {mqttPort || 'Not configured'}</div>
                <div>TLS: {mqttTLS || 'Not configured'}</div>
                <div>
                  Idle Timeout:{' '}
                  {mqttIdleTimeout
                    ? `${mqttIdleTimeout} seconds`
                    : 'Not configured'}
                </div>
              </div>
            </div>

            {/* Authentication (Read-only) */}
            {(mqttUsername || mqttPassword) && (
              <div className="rounded-md bg-gray-50 p-3">
                <div className="mb-2 text-sm font-semibold text-gray-600">
                  Authentication
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div>Username: {mqttUsername || 'Not configured'}</div>
                  <div>
                    Password: {mqttPassword ? '••••••••' : 'Not configured'}
                  </div>
                </div>
              </div>
            )}

            {/* Pub Topic */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="mqttPubTopic" className="text-sm text-gray-600">
                Publish Topic
              </Label>
              {isEditMode ? (
                <Input
                  id="mqttPubTopic"
                  value={formData.mqttPubTopic}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      mqttPubTopic: e.target.value,
                    }))
                  }
                  placeholder="Enter MQTT Pub Topic"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {mqttPubTopic || 'Not configured'}
                </div>
              )}
            </div>

            {/* Config Topic */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="mqttCfgTopic" className="text-sm text-gray-600">
                Config Topic
              </Label>
              {isEditMode ? (
                <Input
                  id="mqttCfgTopic"
                  value={formData.mqttCfgTopic}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      mqttCfgTopic: e.target.value,
                    }))
                  }
                  placeholder="Enter MQTT Config Topic"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="text-sm font-medium sm:col-start-2">
                  {mqttCfgTopic || 'Not configured'}
                </div>
              )}
            </div>

            {/* Sub Topic (Read-only) */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label className="text-sm text-gray-600">Subscribe Topic</Label>
              <div className="text-sm font-medium sm:col-start-2">
                {mqttSubTopic || 'Not configured'}
              </div>
            </div>

            {/* MQTT URI */}
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
              <Label htmlFor="mqttURI" className="text-sm text-gray-600">
                MQTT URI
              </Label>
              {isEditMode ? (
                <Input
                  id="mqttURI"
                  value={formData.mqttURI}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, mqttURI: e.target.value }))
                  }
                  placeholder="Enter MQTT URL"
                  className="placeholder-gray-400 focus:border-buttonActive focus:ring-1 focus:ring-buttonActive sm:col-start-2"
                />
              ) : (
                <div className="break-words text-sm font-medium sm:col-start-2">
                  {mqttURI || 'Not configured'}
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

