import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { itemVariants } from '@/lib/constants/animationVariants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  WifiIcon,
  EthernetPortIcon as EthernetIcon,
  SaveIcon,
  Loader2Icon,
} from 'lucide-react';
import type { SmibConfig } from '@/shared/types/entities';

type ExtendedCommunicationModeSectionProps = {
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

const CommunicationModeSection: React.FC<
  ExtendedCommunicationModeSectionProps
> = ({ smibConfig, initialCommunicationMode, onSave, isLoading, error }) => {
  const [currentMode, setCurrentMode] = useState(initialCommunicationMode);
  const [ssid, setSsid] = useState(smibConfig?.net?.netStaSSID || '');
  const [password, setPassword] = useState(smibConfig?.net?.netStaPwd || '');

  // useEffect to update local state if smibConfig or initialCommunicationMode changes from parent
  React.useEffect(() => {
    setCurrentMode(initialCommunicationMode);
    setSsid(smibConfig?.net?.netStaSSID || '');
    setPassword(smibConfig?.net?.netStaPwd || '');
  }, [initialCommunicationMode, smibConfig]);

  const handleSave = () => {
    onSave({
      communicationMode: currentMode,
      netStaSSID: currentMode === 'wifi' ? ssid : undefined,
      netStaPassword: currentMode === 'wifi' ? password : undefined,
    });
  };

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <h4 className="text-lg font-medium">Communication Mode</h4>
      <div className="mb-4 flex space-x-2">
        <Button
          variant={currentMode === 'ethernet' ? 'default' : 'outline'}
          onClick={() => setCurrentMode('ethernet')}
          className={`flex-1 ${
            currentMode === 'ethernet'
              ? 'bg-buttonActive hover:bg-buttonActive/90'
              : 'text-textPrimary border-border hover:bg-muted'
          }`}
          disabled={isLoading}
        >
          <EthernetIcon className="mr-2 h-5 w-5" /> Ethernet
        </Button>
        <Button
          variant={currentMode === 'wifi' ? 'default' : 'outline'}
          onClick={() => setCurrentMode('wifi')}
          className={`flex-1 ${
            currentMode === 'wifi'
              ? 'bg-buttonActive hover:bg-buttonActive/90'
              : 'text-textPrimary border-border hover:bg-muted'
          }`}
          disabled={isLoading}
        >
          <WifiIcon className="mr-2 h-5 w-5" /> WiFi
        </Button>
      </div>

      {currentMode === 'wifi' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 border-t border-border pt-4"
        >
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ssid">Staff WiFi Name (SSID)</Label>
              <Input
                id="ssid"
                value={ssid}
                onChange={e => setSsid(e.target.value)}
                disabled={isLoading}
                placeholder="Enter SSID"
                className="text-textPrimary bg-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Staff WiFi Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Enter Password"
                className="text-textPrimary bg-input"
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
            <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <SaveIcon className="mr-2 h-5 w-5" />
          )}{' '}
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
};

export default CommunicationModeSection;
