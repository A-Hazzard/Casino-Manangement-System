import React from 'react';
import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/constants/animationVariants';
import { Button } from '@/components/ui/button';

type ExtendedFirmwareUpdateSectionProps = {
  currentFirmwareVersion: string;
};

const FirmwareUpdateSection: React.FC<ExtendedFirmwareUpdateSectionProps> = ({
  currentFirmwareVersion,
}) => {
  // If you want to allow changing firmware version, you can add state here
  // const [firmwareVersion, setFirmwareVersion] = useState<string>(currentFirmwareVersion);

  return (
    <motion.div variants={itemVariants}>
      <h3 className="mb-2 font-medium text-foreground">Firmware Update</h3>
      <div className="flex">
        <select
          className="mr-2 w-full rounded border border-border p-2"
          value={currentFirmwareVersion}
          // onChange={(e) => setFirmwareVersion(e.target.value)}
          disabled
        >
          <option value="Cloudy v1.0">Cloudy v1.0</option>
          <option value="Cloudy v1.0.4">Cloudy v1.0.4</option>
          <option value="Cloudy v1.0.4.1">Cloudy v1.0.4.1</option>
        </select>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className="ml-auto border border-border bg-muted text-foreground hover:bg-accent"
            disabled
          >
            ⟳
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className="ml-2 bg-buttonActive text-primary-foreground hover:bg-buttonActive/90"
            disabled
          >
            UPDATE
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FirmwareUpdateSection;
