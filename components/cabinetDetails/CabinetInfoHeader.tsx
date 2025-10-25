import React from 'react';
import { motion } from 'framer-motion';
import { Pencil2Icon } from '@radix-ui/react-icons';
import { Skeleton } from '@/components/ui/skeleton';

type ExtendedCabinetInfoHeaderProps = {
  title: string;
  isLoading: boolean;
  isOnline?: boolean;
};

const CabinetInfoHeader: React.FC<ExtendedCabinetInfoHeaderProps> = ({
  title,
  isLoading,
  isOnline,
}) => {
  return (
    <motion.div
      className="relative mb-6 mt-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex w-full flex-col justify-between md:flex-row md:items-start">
        <div className="mb-4 md:mb-0 md:w-3/4">
          <h1 className="flex items-center text-2xl font-bold">
            Name: {title}
            <motion.button
              className="ml-2 p-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Pencil2Icon className="h-5 w-5 text-button" />
            </motion.button>
          </h1>

          <p className="mt-2 text-grayHighlight">
            Manufacturer:{' '}
            {isLoading ? (
              <Skeleton className="inline-block h-4 w-32" />
            ) : (
              'Some Manufacturer'
            )}
          </p>
          <p className="mt-1 text-grayHighlight">
            Game Type:{' '}
            {isLoading ? (
              <Skeleton className="inline-block h-4 w-24" />
            ) : (
              'None'
            )}
          </p>
          <p className="mt-1">
            <span className="text-button">{title}</span>
          </p>
        </div>

        {/* Online status for desktop */}
        {isOnline !== undefined && (
          <div className="hidden items-center justify-end md:flex md:w-1/4 md:pr-4">
            <motion.div
              className={`mr-2 h-3 w-3 rounded-full ${
                isOnline ? 'bg-button' : 'bg-destructive'
              }`}
              animate={
                isOnline
                  ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                isOnline ? { repeat: Infinity, duration: 2 } : { duration: 0.3 }
              }
            />
            <span
              className={(isOnline
                ? 'font-bold text-button'
                : 'font-bold text-destructive'
              ).trim()}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CabinetInfoHeader;
