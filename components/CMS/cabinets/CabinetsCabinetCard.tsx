/**
 * Cabinets Cabinet Card Component
 *
 * Displays machine/cabinet information in a card format for mobile/smaller screens.
 *
 * Features:
 * - Asset number and status indicator
 * - SMIB ID with copy to clipboard
 * - Location name with navigation
 * - Financial metrics (Money In, Money Out, Jackpot, Gross)
 * - Action buttons (View, Edit, Delete)
 *
 * @module components/cabinets/CabinetsCabinetCard
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import CurrencyValueWithOverflow from '@/components/shared/ui/CurrencyValueWithOverflow';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { CabinetCardProps } from '@/lib/types/components';
import { formatCurrency } from '@/lib/utils';
import {
    getGrossColorClass,
    getMoneyInColorClass,
    getMoneyOutColorClass,
} from '@/lib/utils/financial';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Clock, ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function CabinetsCabinetCard(props: CabinetCardProps) {
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

  const handleViewClick = () => {
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

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  // Determine if cabinet is online (you may need to adjust this based on your data structure)
  const isOnline = props.online !== undefined ? props.online : (props.status === 'functional' || props.online === true);
  const lastOnlineText = props.offlineTimeLabel || (props.lastOnline
    ? formatDistanceToNow(new Date(props.lastOnline), {
        addSuffix: true,
      })
    : 'Never');
  const smbId = props.smbId || '';

  return (
    <div
      ref={cardRef}
      className="xs:p-2 relative mx-auto mb-4 w-full max-w-full rounded-lg border border-gray-100 bg-white p-2 shadow-sm transition-shadow hover:shadow-md sm:p-4"
    >
      {/* Header with Asset Number and Status Indicator */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-1 truncate pr-2">
          <button
            onClick={e => {
              e.stopPropagation();
              handleViewClick();
            }}
            className="cursor-pointer truncate text-left text-base font-semibold hover:text-blue-600 hover:underline"
            title="Click to view cabinet details"
          >
            {formatMachineDisplayNameWithBold(props)}
          </button>
          <motion.span
            className={`h-2 w-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            } ml-1 flex-shrink-0`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          ></motion.span>
        </div>
      </div>

      {/* SMIB ID and Details */}
      <div className="mb-3">
        <button
          onClick={e => {
            e.stopPropagation();
            if (smbId) {
              copyToClipboard(smbId, 'SMIB');
            }
          }}
          className={`mb-1 text-sm ${smbId ? 'cursor-pointer text-green-600 hover:text-blue-600 hover:underline' : 'text-gray-400'}`}
          title={smbId ? 'Click to copy SMIB' : 'No SMIB'}
          disabled={!smbId}
        >
          {smbId || 'N/A'}
        </button>
        {/* Location Name - Navigate to location details with icon */}
        <div className="mb-1 flex items-center gap-1.5">
          {props.locationId ? (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  router.push(`/locations/${props.locationId}`);
                }}
                className="cursor-pointer text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                title="Click to view location details"
              >
                {props.locationName || 'No Location'}
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  router.push(`/locations/${props.locationId}`);
                }}
                className="flex-shrink-0"
                title="View location details"
              >
                <ExternalLink className="h-3 w-3 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
              </button>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-900">
              {props.locationName || 'No Location'}
            </p>
          )}
        </div>
      </div>
      
      {/* Offline Status - Show when offline */}
      {!isOnline && (
        <div className="mb-3 flex flex-col gap-1 text-xs text-red-600 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{lastOnlineText === 'Never' ? 'Never Online' : `Offline ${lastOnlineText}`}</span>
          </div>
          {props.actualOfflineTime && props.actualOfflineTime !== lastOnlineText && (
            <div className="ml-[18px] text-[10px] opacity-70 italic text-gray-500">
              (Actual Offline Time: {props.actualOfflineTime})
            </div>
          )}
        </div>
      )}

      {/* Financial Data - List Layout */}
      <div className="border-t border-gray-200 pt-2 text-sm">
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Money In</span>
          <CurrencyValueWithOverflow
            value={props.moneyIn || 0}
            className={`font-medium ${getMoneyInColorClass()}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Money Out</span>
          <CurrencyValueWithOverflow
            value={props.moneyOut || 0}
            className={`font-medium ${getMoneyOutColorClass(props.moneyOut, props.moneyIn)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Jackpot</span>
          <CurrencyValueWithOverflow
            value={props.jackpot || 0}
            className="font-medium"
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Gross</span>
          <CurrencyValueWithOverflow
            value={props.gross || 0}
            className={`font-medium ${getGrossColorClass(props.gross)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={handleViewClick}
          variant="outline"
          size="sm"
          className="flex flex-1 items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </Button>
        {props.canEditMachines !== false && (
          <Button
            onClick={() => props.onEdit?.(props)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        )}
        {props.canDeleteMachines !== false && (
          <Button
            onClick={() => props.onDelete?.(props)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}

