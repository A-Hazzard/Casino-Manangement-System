import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import type { CabinetDetail, SmibConfig } from "@/lib/types/cabinets";
import {
  configContentVariants,
  itemVariants,
} from "@/lib/constants/animationVariants";
import CommunicationModeSection from "./smibConfig/CommunicationModeSection";
import FirmwareUpdateSection from "./smibConfig/FirmwareUpdateSection";
import MachineControlButtons from "./smibConfig/MachineControlButtons";
import AdvancedSettings from "./smibConfig/AdvancedSettings";
import { toast } from "sonner";

type SmibConfigurationProps = {
  cabinet: CabinetDetail | null;
  // loading: boolean; // Removed as unused
  // error: string | null; // Removed as unused
};

export const SmibConfiguration: React.FC<SmibConfigurationProps> = ({
  cabinet,
  // loading, // Removed as unused
  // error, // Removed as unused
}) => {
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const [initialCommunicationMode, setInitialCommunicationMode] =
    useState("ethernet");
  const [currentSmibConfig, setCurrentSmibConfig] = useState<
    SmibConfig | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cabinet?.smibConfig) {
      setCurrentSmibConfig(cabinet.smibConfig);
      const modeFromConfig =
        cabinet.smibConfig?.net?.netMode === 1 ? "wifi" : "ethernet";
      setInitialCommunicationMode(modeFromConfig);
    } else {
      setCurrentSmibConfig(undefined);
      setInitialCommunicationMode("ethernet");
    }
  }, [cabinet]);

  const handleConfigSave = async (newConfigData: {
    communicationMode: string;
    netStaSSID?: string;
    netStaPassword?: string;
  }) => {
    if (!cabinet?._id) {
      toast.error("Cabinet ID is missing.");
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
            netMode: newConfigData.communicationMode === "wifi" ? 1 : 0,
            netStaSSID: newConfigData.netStaSSID,
            netStaPwd: newConfigData.netStaPassword,
          },
        },
      };

      const response = await fetch(`/api/cabinets/${cabinet._id}/smib-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update SMIB configuration."
        );
      }
      toast.success("SMIB configuration updated successfully!");
      setCurrentSmibConfig((prevConfig) => ({
        ...prevConfig,
        net: {
          ...prevConfig?.net,
          netMode: newConfigData.communicationMode === "wifi" ? 1 : 0,
          netStaSSID: newConfigData.netStaSSID,
          netStaPwd: newConfigData.netStaPassword,
        },
      }));
      setInitialCommunicationMode(newConfigData.communicationMode);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSmibConfig = () => {
    setSmibConfigExpanded(!smibConfigExpanded);
  };

  return (
    <motion.div
      className="mt-4 bg-container rounded-lg shadow-md shadow-purple-200"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="px-6 py-4 flex justify-between items-center cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 md:justify-between gap-2 md:gap-4">
          <div>
            <p className="text-sm text-grayHighlight">
              SMIB ID:{" "}
              {cabinet?.relayId || cabinet?.smibBoard || "e831cdfa8464"}
            </p>
            <p className="text-sm text-grayHighlight mt-1 md:mt-0">
              Connected to WiFi network{" "}
              {cabinet?.smibConfig?.net?.netStaSSID || "Dynamic 1 - Staff Wifi"}
            </p>
          </div>
          <div className="md:text-right">
            <p className="text-sm text-grayHighlight">
              Communication Mode:{" "}
              {cabinet?.smibConfig?.coms?.comsMode !== undefined
                ? cabinet?.smibConfig?.coms?.comsMode === 0
                  ? "sas"
                  : cabinet?.smibConfig?.coms?.comsMode === 1
                  ? "non sas"
                  : "IGT"
                : "undefined"}
            </p>
            <p className="text-sm text-grayHighlight mt-1 md:mt-0">
              Running firmware{" "}
              {cabinet?.smibVersion?.firmware || "FAC_v1-0-4(v1-0-4)"}
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {smibConfigExpanded && (
          <motion.div
            ref={configSectionRef}
            className="px-6 pb-6 space-y-6 border-t border-border pt-4 overflow-hidden"
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
              currentFirmwareVersion={cabinet?.smibVersion?.firmware || "N/A"}
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
