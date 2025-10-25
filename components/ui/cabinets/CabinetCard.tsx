'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { CabinetCardProps } from '@/lib/types/cardProps';
import { motion } from 'framer-motion';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';

export default function CabinetCard(props: CabinetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef<CabinetCardProps | null>(null);
  const router = useRouter();

  // GSAP animation for card updates
  useEffect(() => {
    if (
      !prevPropsRef.current ||
      JSON.stringify(props) !== JSON.stringify(prevPropsRef.current)
    ) {
      // Store current props for future comparison
      prevPropsRef.current = { ...props };

      // Animate the card
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, scale: 0.95, y: 15 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.4,
            ease: 'back.out(1.5)',
          }
        );
      }
    }
  }, [props]);

  const handleCardClick = () => {
    const currentPath = window.location.pathname;

    // If we're already in a location-specific view, use that path structure
    if (currentPath.startsWith('/locations/')) {
      const locationId = props.locationId;
      router.push(`/locations/${locationId}/details/${props._id}`);
    } else {
      // Default to the cabinets/ route if we're not in a location view
      router.push(`/cabinets/${props._id}`);
    }
  };

  // Determine if cabinet is online (you may need to adjust this based on your data structure)
  const isOnline = props.status === 'functional' || props.online === true;

  return (
    <div
      ref={cardRef}
      className="xs:p-2 relative mx-auto mb-4 w-full max-w-full cursor-pointer rounded-lg border border-gray-100 bg-white p-2 shadow-sm transition-shadow hover:shadow-md sm:p-4"
      onClick={e => {
        // Only handle card click if not clicking action buttons
        if (!(e.target as HTMLElement).closest('.action-buttons')) {
          handleCardClick();
        }
      }}
    >
      {/* Header with Asset Number and Status Indicator */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="xs:text-xs flex flex-1 items-center gap-1 truncate pr-2 text-sm font-semibold sm:text-base">
          {props.assetNumber || '(No Asset #)'}
          <motion.span
            className={`h-2 w-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            } ml-1 flex-shrink-0`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.span>
        </h3>
        <button
          onClick={e => {
            e.stopPropagation();
            props.onEdit?.(props);
          }}
          className="flex-shrink-0 text-green-500"
        >
          <Image
            src={editIcon}
            alt="Edit"
            width={20}
            height={20}
            className="xs:w-4 xs:h-4 h-4 w-4 sm:h-5 sm:w-5"
          />
        </button>
      </div>

      {/* SMIB ID and Details */}
      <div className="mb-3">
        <p className="xs:text-xs truncate text-xs text-green-500 sm:text-sm">
          SMIB ID: {props.smbId || 'N/A'}
        </p>
        <p className="xs:text-xs truncate text-xs text-gray-600 sm:text-sm">
          {props.locationName || 'No Location'}
        </p>
        <p className="xs:text-xs truncate text-xs text-gray-600 sm:text-sm">
          {formatMachineDisplayNameWithBold({
            serialNumber: props.serialNumber,
            assetNumber: props.assetNumber,
            custom: { name: undefined }, // CabinetCard doesn't have customName prop
            game: props.game || props.installedGame,
            installedGame: props.installedGame,
          })}
        </p>
      </div>

      {/* Financial Data - Simple List Layout */}
      <div className="xs:text-xs text-xs sm:text-sm">
        <div className="flex justify-between py-1">
          <span className="flex-1 truncate pr-2">Money In</span>
          <span className="flex-shrink-0 text-right">
            {formatCurrency(props.moneyIn || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="flex-1 truncate pr-2">Money Out</span>
          <span className="flex-shrink-0 text-right">
            {formatCurrency(props.cancelledCredits || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="flex-1 truncate pr-2">Jackpot</span>
          <span className="flex-shrink-0 text-right">
            {formatCurrency(props.jackpot || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="flex-1 truncate pr-2">Gross</span>
          <span
            className={`flex-shrink-0 text-right ${
              (props.gross || 0) < 0 ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {formatCurrency(props.gross || 0)}
          </span>
        </div>
      </div>

      {/* Hidden delete button - only shown in edit mode or on hover */}
      <div className="action-buttons absolute bottom-2 right-2 hidden">
        <button
          onClick={e => {
            e.stopPropagation();
            props.onDelete?.(props);
          }}
          className="text-red-500"
        >
          <Image
            src={deleteIcon}
            alt="Delete"
            width={20}
            height={20}
            className="xs:w-4 xs:h-4 h-4 w-4 sm:h-5 sm:w-5"
          />
        </button>
      </div>
    </div>
  );
}
