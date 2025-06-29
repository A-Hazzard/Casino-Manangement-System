import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

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
      className="flex items-center bg-white border-buttonActive text-buttonActive hover:bg-buttonActive hover:text-white transition-colors duration-300"
      size="sm"
    >
      <ArrowLeftIcon className="mr-2 h-4 w-4" />
      Back to {locationName || "Location"}
    </Button>
  );

  if (hasMounted) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4 mb-2"
      >
        {buttonContent}
      </motion.div>
    );
  }

  return <div className="mt-4 mb-2">{buttonContent}</div>;
};

export default BackButton;
