import React from "react";
import { motion } from "framer-motion";
import { itemVariants } from "@/lib/constants/animationVariants";
import type { SmibConfig } from "@/lib/types/cabinets";

type ExtendedAdvancedSettingsProps = {
  settings: { smibConfig?: Record<string, unknown> };
};

const AdvancedSettings: React.FC<ExtendedAdvancedSettingsProps> = ({
  settings /*, onSettingChange, onSave, isLoading, error*/,
}) => {
  const net = 
    (settings?.smibConfig &&
      (settings.smibConfig as SmibConfig).net) ||
    {};
  return (
    <>
      <motion.div
        variants={itemVariants}
        className="border-t border-border pt-6"
      >
        <h3 className="font-medium mb-4 text-foreground">Network/WiFi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
          <div className="flex">
            <span className="text-sm font-medium text-grayHighlight w-24">
              Name:
            </span>
            <span className="text-sm truncate">
              {net.netStaSSID || "Dynamic 1 - Staff Wifi"}
            </span>
          </div>
          <div className="flex">
            <span className="text-sm font-medium text-grayHighlight w-24">
              Password:
            </span>
            <span className="text-sm">{net.netStaPwd || "wordsapp!23"}</span>
          </div>
          <div className="flex">
            <span className="text-sm font-medium text-grayHighlight w-24">
              Channel:
            </span>
            <span className="text-sm">{net.netStaChan || "1"}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="border-t border-border pt-6"
      >
        <h3 className="font-medium mb-4 text-foreground">MQTT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-2">Connection</h4>
            <div className="space-y-1">
              <div className="flex">
                <span className="text-sm text-grayHighlight w-24">Host:</span>
                <span className="text-sm"></span>
              </div>
              <div className="flex">
                <span className="text-sm text-grayHighlight w-24">Port:</span>
                <span className="text-sm"></span>
              </div>
              <div className="flex">
                <span className="text-sm text-grayHighlight w-24">
                  Use TLS:
                </span>
                <span className="text-sm">No</span>
              </div>
              <div className="flex">
                <span className="text-sm text-grayHighlight w-24">
                  Idle Timeout:
                </span>
                <span className="text-sm">30 seconds</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Authentication</h4>
            <div className="space-y-1">
              <div className="flex">
                <span className="text-sm text-grayHighlight w-24">
                  Username:
                </span>
                <span className="text-sm"></span>
              </div>
              <div className="flex">
                <span className="text-sm text-grayHighlight w-24">
                  Password:
                </span>
                <span className="text-sm"></span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="border-t border-border pt-6"
      >
        <h3 className="font-medium mb-4 text-foreground">COMS</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex">
            <span className="text-sm text-grayHighlight w-24">Address:</span>
            <span className="text-sm">1ms</span>
          </div>
          <div className="flex">
            <span className="text-sm text-grayHighlight w-24">
              Polling Rate:
            </span>
            <span className="text-sm">200ms</span>
          </div>
          <div className="flex">
            <span className="text-sm text-grayHighlight w-24">RTE:</span>
            <span className="text-sm">Disabled</span>
          </div>
          <div className="flex">
            <span className="text-sm text-grayHighlight w-24">GPC:</span>
            <span className="text-sm">0</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="border-t border-border pt-6"
      >
        <h3 className="font-medium mb-4 text-foreground">Fingerprint</h3>
        <div className="flex">
          <span className="text-sm text-grayHighlight w-24">Probes:</span>
          <span className="text-sm"></span>
        </div>
      </motion.div>
    </>
  );
};

export default AdvancedSettings;
