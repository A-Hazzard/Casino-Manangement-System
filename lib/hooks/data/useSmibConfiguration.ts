/**
 * Custom hook for managing SMIB configuration state and logic
 * Extracts complex SMIB configuration logic from the Cabinet Details page
 */

import { useState, useCallback } from "react";
import { GamingMachine as CabinetDetail } from "@/shared/types/entities";

interface UseSmibConfigurationReturn {
  smibConfigExpanded: boolean;
  communicationMode: string;
  firmwareVersion: string;
  toggleSmibConfig: () => void;
  setCommunicationModeFromData: (data: CabinetDetail) => void;
  setFirmwareVersionFromData: (data: CabinetDetail) => void;
}

export function useSmibConfiguration(): UseSmibConfigurationReturn {
  const [smibConfigExpanded, setSmibConfigExpanded] = useState(false);
  const [communicationMode, setCommunicationMode] = useState<string>("sas");
  const [firmwareVersion, setFirmwareVersion] = useState<string>("Cloudy v1.0.4");

  const toggleSmibConfig = useCallback(() => {
    setSmibConfigExpanded(!smibConfigExpanded);
  }, [smibConfigExpanded]);

  const setCommunicationModeFromData = useCallback((data: CabinetDetail) => {
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibConfig &&
      typeof data.smibConfig === "object" &&
      "coms" in data.smibConfig
    ) {
      const mode = data.smibConfig.coms?.comsMode;
      if (mode !== undefined) {
        setCommunicationMode(
          mode === 0 ? "sas" : mode === 1 ? "non sas" : "IGT"
        );
      }
    }
  }, []);

  const setFirmwareVersionFromData = useCallback((data: CabinetDetail) => {
    if (
      typeof data === "object" &&
      data !== null &&
      data.smibVersion &&
      typeof data.smibVersion === "object" &&
      "firmware" in data.smibVersion
    ) {
      const firmware = data.smibVersion.firmware;
      if (typeof firmware === "string") {
        if (firmware.includes("v1-0-4-1")) {
          setFirmwareVersion("Cloudy v1.0.4.1");
        } else if (firmware.includes("v1-0-4")) {
          setFirmwareVersion("Cloudy v1.0.4");
        } else {
          setFirmwareVersion("Cloudy v1.0");
        }
      }
    }
  }, []);

  return {
    smibConfigExpanded,
    communicationMode,
    firmwareVersion,
    toggleSmibConfig,
    setCommunicationModeFromData,
    setFirmwareVersionFromData,
  };
}
