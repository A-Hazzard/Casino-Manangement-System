'use client';

import React, { useEffect, useRef } from 'react';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import gsap from 'gsap';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { CabinetCardProps } from '@/lib/types/cardProps';
import { motion } from 'framer-motion';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CabinetCard(props: CabinetCardProps) {
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef<CabinetCardProps | null>(null);
  const router = useRouter();
  const params = useParams();
  const locationId = params.slug as string; // Get locationId from params

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
    if (props._id) {
      // Ensure locationId is available, fallback if needed
      const targetLocationId = locationId || props.locationId;
      if (targetLocationId) {
        router.push(`/locations/${targetLocationId}/details/${props._id}`);
      } else {
        if (!locationId) {
          // Log error for debugging in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Location ID not found for navigation.');
          }
          return;
        }
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const cabinetData = {
      _id: props._id,
      assetNumber: props.assetNumber || '',
      serialNumber: props.serialNumber || '',
      game: props.game || '',
      locationId: props.locationId || '',
      locationName: props.locationName || '',
      smbId: props.smbId || '',
      relayId: props.smbId || '',
      moneyIn: props.moneyIn || 0,
      moneyOut: props.moneyOut || 0,
      gross: props.gross || 0,
      jackpot: props.jackpot || 0,
      lastOnline: props.lastOnline,
      installedGame: props.game || '',
      accountingDenomination: '1',
      collectionMultiplier: '1',
      status: props.status || 'functional',
      assetStatus: props.status || 'functional',
      gameType: 'slot',
      isCronosMachine: false,
      cabinetType: 'Standing',
      gamingLocation: props.locationId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      custom: { name: props.serialNumber || props._id || 'Unknown' },
    };
    openEditModal(cabinetData);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const cabinetData = {
      _id: props._id,
      assetNumber: props.assetNumber || '',
      serialNumber: props.serialNumber || '',
      game: props.game || '',
      locationId: props.locationId || '',
      locationName: props.locationName || '',
      smbId: props.smbId || '',
      relayId: props.smbId || '',
      moneyIn: props.moneyIn || 0,
      moneyOut: props.moneyOut || 0,
      gross: props.gross || 0,
      jackpot: props.jackpot || 0,
      lastOnline: props.lastOnline,
      installedGame: props.game || '',
      accountingDenomination: '1',
      collectionMultiplier: '1',
      status: props.status || 'functional',
      assetStatus: props.status || 'functional',
      gameType: 'slot',
      isCronosMachine: false,
      cabinetType: 'Standing',
      gamingLocation: props.locationId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      custom: { name: props.serialNumber || props._id || 'Unknown' },
    };
    openDeleteModal(cabinetData);
  };

  // Determine if cabinet is online
  const isOnline = props.status === 'functional' || props.online === true;

  return (
    <div
      ref={cardRef}
      className="relative mx-auto mb-4 w-full rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Header with Asset Number and Status Indicator */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1 text-base font-semibold">
          {props.assetNumber || '(No Asset #)'}
          <motion.span
            className={`h-2 w-2 rounded-full ${
              isOnline ? 'bg-button' : 'bg-destructive'
            } ml-1`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.span>
        </h3>
      </div>

      {/* SMIB ID and Location */}
      <div className="mb-3">
        <p className="text-sm text-button">SMIB ID: {props.smbId || 'N/A'}</p>
        <p className="text-sm font-bold text-grayHighlight">
          {props.locationName || 'Unknown Location'}
        </p>
      </div>

      {/* Financial Data - Simple List Layout */}
      <div className="text-sm">
        <div className="flex justify-between py-1">
          <span>Wager</span>
          <span className="break-words text-right">
            {formatCurrency(props.moneyIn || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span>Cancelled Credits</span>
          <span className="break-words text-right">
            {formatCurrency(props.moneyOut || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span>Jackpot</span>
          <span className="break-words text-right">
            {formatCurrency(props.jackpot || 0)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span>Gross</span>
          <span
            className={`break-words text-right ${
              (props.gross || 0) < 0 ? 'text-destructive' : 'text-button'
            }`}
          >
            {formatCurrency(props.gross || 0)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
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
          onClick={handleEditClick}
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Button>
        <Button
          onClick={handleDeleteClick}
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
