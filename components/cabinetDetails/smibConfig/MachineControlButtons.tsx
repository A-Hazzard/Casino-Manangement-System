import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { itemVariants } from '@/lib/constants/animationVariants';

const MachineControlButtons: React.FC = () => {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-wrap gap-2 md:gap-4"
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          className="w-full border-lighterBlueHighlight text-lighterBlueHighlight hover:bg-accent md:w-auto"
        >
          RESTART
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          className="w-full border-orangeHighlight text-orangeHighlight hover:bg-accent md:w-auto"
        >
          UNLOCK MACHINE
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          className="w-full border-destructive text-destructive hover:bg-accent md:w-auto"
        >
          LOCK MACHINE
        </Button>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mt-4 flex w-full items-center"
      >
        <input type="checkbox" id="applyToAll" className="mr-2" />
        <label htmlFor="applyToAll" className="text-sm">
          Apply to all SMIBs at this location
        </label>
      </motion.div>
    </motion.div>
  );
};

export default MachineControlButtons;
