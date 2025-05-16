import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { itemVariants } from "@/lib/constants/animationVariants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WifiIcon,
  EthernetPortIcon as EthernetIcon,
  SaveIcon,
  Loader2Icon,
} from "lucide-react";
import type { SmibConfig } from "@/lib/types/cabinets";

type CommunicationModeSectionProps = {
  smibConfig?: SmibConfig;
  initialCommunicationMode: string;
  onSave: (newConfig: {
    communicationMode: string;
    netStaSSID?: string;
    netStaPassword?: string;
  }) => void;
  isLoading: boolean;
  error: string | null;
};

const CommunicationModeSection: React.FC<CommunicationModeSectionProps> = ({
  smibConfig,
  initialCommunicationMode,
  onSave,
  isLoading,
  error,
}) => {
  const [currentMode, setCurrentMode] = useState(initialCommunicationMode);
  const [ssid, setSsid] = useState(smibConfig?.net?.netStaSSID || "");
  const [password, setPassword] = useState(smibConfig?.net?.netStaPwd || "");

  // useEffect to update local state if smibConfig or initialCommunicationMode changes from parent
  React.useEffect(() => {
    setCurrentMode(initialCommunicationMode);
    setSsid(smibConfig?.net?.netStaSSID || "");
    setPassword(smibConfig?.net?.netStaPwd || "");
  }, [initialCommunicationMode, smibConfig]);

  const handleSave = () => {
    onSave({
      communicationMode: currentMode,
      netStaSSID: currentMode === "wifi" ? ssid : undefined,
      netStaPassword: currentMode === "wifi" ? password : undefined,
    });
  };

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <h4 className="text-lg font-medium">Communication Mode</h4>
      <div className="flex space-x-2 mb-4">
        <Button
          variant={currentMode === "ethernet" ? "default" : "outline"}
          onClick={() => setCurrentMode("ethernet")}
          className={`flex-1 ${
            currentMode === "ethernet"
              ? "bg-buttonActive hover:bg-buttonActive/90"
              : "border-border text-textPrimary hover:bg-muted"
          }`}
          disabled={isLoading}
        >
          <EthernetIcon className="w-5 h-5 mr-2" /> Ethernet
        </Button>
        <Button
          variant={currentMode === "wifi" ? "default" : "outline"}
          onClick={() => setCurrentMode("wifi")}
          className={`flex-1 ${
            currentMode === "wifi"
              ? "bg-buttonActive hover:bg-buttonActive/90"
              : "border-border text-textPrimary hover:bg-muted"
          }`}
          disabled={isLoading}
        >
          <WifiIcon className="w-5 h-5 mr-2" /> WiFi
        </Button>
      </div>

      {currentMode === "wifi" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 pt-4 border-t border-border"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Label htmlFor="ssid">Staff WiFi Name (SSID)</Label>
              <Input
                id="ssid"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                disabled={isLoading}
                placeholder="Enter SSID"
                className="bg-input text-textPrimary"
              />
            </div>
            <div>
              <Label htmlFor="password">Staff WiFi Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Enter Password"
                className="bg-input text-textPrimary"
              />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end space-x-3">
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-button text-white hover:bg-buttonActive"
        >
          {isLoading ? (
            <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <SaveIcon className="w-5 h-5 mr-2" />
          )}{" "}
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
};

export default CommunicationModeSection;
