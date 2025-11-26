/**
 * SMIB Configuration Component
 * Component for managing SMIB (Smart Machine Interface Board) configuration.
 *
 * Features:
 * - Expandable/collapsible configuration section
 * - Communication mode selection (Ethernet/WiFi)
 * - Network settings (SSID, password, channel)
 * - Advanced settings
 * - Firmware update functionality
 * - Machine control buttons (restart, OTA, etc.)
 * - Configuration save/load
 * - Error handling
 * - Toast notifications
 * - Framer Motion animations
 *
 * @param cabinet - Cabinet object with SMIB configuration
 */
import {
  configContentVariants,
  itemVariants,
} from '@/lib/constants/animationVariants';
import type {
  GamingMachine as CabinetDetail,
  SmibConfig,
} from '@/shared/types/entities';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AdvancedSettings from './smibConfig/AdvancedSettings';
import CommunicationModeSection from './smibConfig/CommunicationModeSection';
import FirmwareUpdateSection from './smibConfig/FirmwareUpdateSection';
import MachineControlButtons from './smibConfig/MachineControlButtons';

type ExtendedSmibConfigurationProps = {
  cabinet: CabinetDetail | null;
};

export const SmibConfiguration: React.FC<ExtendedSmibConfigurationProps> = ({
  cabinet,
}) => {
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const [initialCommunicationMode, setInitialCommunicationMode] =
    useState('ethernet');
  const [currentSmibConfig, setCurrentSmibConfig] = useState<
    SmibConfig | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cabinet?.smibConfig) {
      setCurrentSmibConfig(cabinet.smibConfig);
      const modeFromConfig =
        cabinet.smibConfig?.net?.netMode === 1 ? 'wifi' : 'ethernet';
      setInitialCommunicationMode(modeFromConfig);
    } else {
      setCurrentSmibConfig(undefined);
      setInitialCommunicationMode('ethernet');
    }
  }, [cabinet]);

  const handleConfigSave = async (newConfigData: {
    communicationMode: string;
    netStaSSID?: string;
    netStaPassword?: string;
  }) => {
    if (!cabinet?._id) {
      toast.error('Cabinet ID is missing.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        smibConfig: {
          ...currentSmibConfig,
          net: {
            ...currentSmibConfig?.net,
            netMode: newConfigData.communicationMode === 'wifi' ? 1 : 0,
            netStaSSID: newConfigData.netStaSSID,
            netStaPwd: newConfigData.netStaPassword,
          },
        },
      };

      const response = await axios.post(
        `/api/cabinets/${cabinet._id}/smib-config`,
        payload
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || 'Failed to update SMIB configuration'
        );
      }
      toast.success('SMIB configuration updated successfully!');
      setCurrentSmibConfig(prevConfig => ({
        ...prevConfig,
        net: {
          ...prevConfig?.net,
          netMode: newConfigData.communicationMode === 'wifi' ? 1 : 0,
          netStaSSID: newConfigData.netStaSSID,
          netStaPwd: newConfigData.netStaPassword,
        },
      }));
      setInitialCommunicationMode(newConfigData.communicationMode);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSmibConfig = () => {
    setSmibConfigExpanded(!smibConfigExpanded);
  };

  // Don't render anything if there's no SMIB configuration data
  if (!cabinet?.smibConfig && !cabinet?.relayId && !cabinet?.smibBoard) {
    return null;
  }

  return (
    <motion.div
      className="mt-4 rounded-lg bg-container shadow-md shadow-purple-200"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="flex cursor-pointer items-center justify-between px-6 py-4"
        onClick={toggleSmibConfig}
      >
        <h2 className="text-xl font-semibold">SMIB Configuration</h2>
        <motion.div
          animate={{ rotate: smibConfigExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </motion.div>
      </div>

      <motion.div
        className="px-6 pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:justify-between md:gap-4">
          <div>
            <p className="text-sm text-grayHighlight">
              SMIB ID:{' '}
              {cabinet?.relayId || cabinet?.smibBoard || 'Not configured'}
            </p>
            <p className="mt-1 text-sm text-grayHighlight md:mt-0">
              Connected to WiFi network{' '}
              {cabinet?.smibConfig?.net?.netStaSSID || 'Not configured'}
            </p>
          </div>
          <div className="md:text-right">
            <p className="text-sm text-grayHighlight">
              Communication Mode:{' '}
              {cabinet?.smibConfig?.coms?.comsMode !== undefined
                ? cabinet?.smibConfig?.coms?.comsMode === 0
                  ? 'sas'
                  : cabinet?.smibConfig?.coms?.comsMode === 1
                    ? 'non sas'
                    : 'IGT'
                : 'Not configured'}
            </p>
            <p className="mt-1 text-sm text-grayHighlight md:mt-0">
              Running firmware{' '}
              {cabinet?.smibVersion?.firmware || 'Not configured'}
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {smibConfigExpanded && (
          <motion.div
            ref={configSectionRef}
            className="space-y-6 overflow-hidden border-t border-border px-6 pb-6 pt-4"
            variants={configContentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <CommunicationModeSection
              smibConfig={currentSmibConfig}
              initialCommunicationMode={initialCommunicationMode}
              onSave={handleConfigSave}
              isLoading={isLoading}
              error={error}
            />

            <FirmwareUpdateSection
              currentFirmwareVersion={cabinet?.smibVersion?.firmware || 'N/A'}
            />

            <MachineControlButtons />

            <AdvancedSettings
              settings={
                currentSmibConfig ? { smibConfig: currentSmibConfig } : {}
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SmibConfiguration;
