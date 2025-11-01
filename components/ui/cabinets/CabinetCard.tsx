'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { CabinetCardProps } from '@/lib/types/cardProps';
import { motion } from 'framer-motion';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      className="xs:p-2 relative mx-auto mb-4 w-full max-w-full rounded-lg border border-gray-100 bg-white p-2 shadow-sm transition-shadow hover:shadow-md sm:p-4"
    >
      {/* Header with Asset Number and Status Indicator */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex flex-1 items-center gap-1 truncate pr-2 text-base font-semibold">
          {props.assetNumber || props.serialNumber || '(No Asset #)'}
          <motion.span
            className={`h-2 w-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            } ml-1 flex-shrink-0`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.span>
        </h3>
      </div>

      {/* SMIB ID and Details */}
      <div className="mb-3">
        <p className="mb-1 text-sm text-green-600">
          {props.smbId || 'N/A'}
        </p>
        <p className="mb-1 text-sm font-medium text-gray-900">
          {props.locationName || 'No Location'}
        </p>
        <p className="text-sm text-gray-600">
          {(() => {
            const assetNum = props.assetNumber || props.serialNumber || '';
            const game = props.game || props.installedGame || '';
            if (game) {
              return `${assetNum} (${game})`;
            }
            return assetNum || 'Unknown';
          })()}
        </p>
      </div>

      {/* Financial Data - List Layout */}
      <div className="border-t border-gray-200 pt-2 text-sm">
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Money In</span>
          <span className="font-medium">
            {formatCurrency(props.moneyIn || 0)}
          </span>
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Money Out</span>
          <span className="font-medium">
            {formatCurrency(props.moneyOut || 0)}
          </span>
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Jackpot</span>
          <span className="font-medium">
            {formatCurrency(props.jackpot || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Gross</span>
          <span
            className={`font-medium ${
              (props.gross || 0) < 0 ? 'text-red-500' : 'text-green-600'
            }`}
          >
            {formatCurrency(props.gross || 0)}
          </span>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => handleCardClick()}
          variant="outline"
          size="sm"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View Details</span>
        </Button>
        <Button
          onClick={() => props.onEdit?.(props)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Button>
        <Button
          onClick={() => props.onDelete?.(props)}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
}
