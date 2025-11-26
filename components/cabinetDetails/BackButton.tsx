/**
 * Back Button Component
 * Navigation button to go back to location details page.
 *
 * Features:
 * - Back navigation to location
 * - Location name display
 * - Framer Motion animations (when mounted)
 * - Responsive styling
 *
 * @param locationName - Name of the location to navigate back to
 * @param handleBackToLocation - Callback to navigate back
 * @param hasMounted - Whether component has mounted (for animations)
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@radix-ui/react-icons';

type ExtendedBackButtonProps = {
  locationName: string;
  handleBackToLocation: () => void;
  hasMounted?: boolean;
};

export const BackButton: React.FC<ExtendedBackButtonProps> = ({
  locationName,
  handleBackToLocation,
  hasMounted = false,
}) => {
  const buttonContent = (
    <Button
      onClick={handleBackToLocation}
      variant="outline"
      className="flex items-center border-buttonActive bg-white text-buttonActive transition-colors duration-300 hover:bg-buttonActive hover:text-white"
      size="sm"
    >
      <ArrowLeftIcon className="mr-2 h-4 w-4" />
      Back to {locationName || 'Location'}
    </Button>
  );

  if (hasMounted) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-2 mt-4"
      >
        {buttonContent}
      </motion.div>
    );
  }

  return <div className="mb-2 mt-4">{buttonContent}</div>;
};

export default BackButton;
