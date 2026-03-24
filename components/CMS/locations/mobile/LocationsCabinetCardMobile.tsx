'use client';

import { Button } from '@/components/shared/ui/button';
import CurrencyValueWithOverflow from '@/components/shared/ui/CurrencyValueWithOverflow';
import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import { formatCurrency } from '@/lib/utils';
import {
  getGrossColorClass,
  getMoneyInColorClass,
} from '@/lib/utils/financial';
import { formatDistanceToNow } from 'date-fns';
import gsap from 'gsap';
import { Clock, Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useEffect, useRef } from 'react';

type LocationsCabinetCardMobileProps = {
  cabinet: ExtendedCabinetDetail;
  router: AppRouterInstance;
  onEdit: (cabinet: ExtendedCabinetDetail) => void;
  onDelete: (cabinet: ExtendedCabinetDetail) => void;
  canEditMachines?: boolean;
  canDeleteMachines?: boolean;
  copyToClipboard: (text: string, label: string) => void;
};

/**
 * Mobile card view for a cabinet in the location details page.
 */
export default function LocationsCabinetCardMobile({
  cabinet,
  router,
  onEdit,
  onDelete,
  canEditMachines = true,
  canDeleteMachines = true,
  copyToClipboard,
}: LocationsCabinetCardMobileProps) {
  const statusRef = useRef<HTMLSpanElement>(null);

  /**
   * Animates online status indicator with pulsing effect.
   * Only animates when cabinet is online.
   */
  useEffect(() => {
    // Only animate if cabinet is online and ref is available
    if (cabinet.isOnline && statusRef.current) {
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      tl.to(statusRef.current, {
        scale: 1.3,
        opacity: 0.7,
        duration: 1,
        ease: 'power1.inOut',
      }).to(statusRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: 'power1.inOut',
      });
      return () => {
        tl.kill();
      };
    }
    return undefined;
  }, [cabinet.isOnline]);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="max-w-[60%] truncate font-semibold">
          {formatMachineDisplayNameWithBold(cabinet)}
        </div>
        <span
          ref={statusRef}
          className={`inline-flex h-3 w-3 items-center justify-center rounded-full ${
            cabinet.isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={cabinet.isOnline ? 'Online' : 'Offline'}
        ></span>
      </div>

      {/* Offline Status - Show when offline */}
      {!cabinet.isOnline && (
        <div className="mb-3 flex flex-col gap-1 text-xs font-medium text-red-600">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>
              {cabinet.offlineTimeLabel
                ? cabinet.offlineTimeLabel === 'Never'
                  ? 'Never Online'
                  : `Offline ${cabinet.offlineTimeLabel}`
                : cabinet.lastOnline
                  ? `Offline ${formatDistanceToNow(new Date(cabinet.lastOnline), { addSuffix: true })}`
                  : 'Never Online'}
            </span>
          </div>
          {cabinet.actualOfflineTime &&
            cabinet.actualOfflineTime !==
              (cabinet.offlineTimeLabel ||
                (cabinet.lastOnline
                  ? formatDistanceToNow(new Date(cabinet.lastOnline), {
                      addSuffix: true,
                    })
                  : 'Never')) && (
              <div className="ml-[18px] text-[10px] italic text-gray-500 opacity-70">
                (Actual Offline Time: {cabinet.actualOfflineTime})
              </div>
            )}
        </div>
      )}
      <p className="mb-1 text-sm text-gray-600">
        Game: {/* Show game name or placeholder if not provided */}
        {cabinet.game || cabinet.installedGame ? (
          cabinet.game || cabinet.installedGame
        ) : (
          <span className="text-red-600">(game name not provided)</span>
        )}
      </p>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-sm text-gray-600">SMIB:</span>
        <button
          onClick={e => {
            e.stopPropagation();
            const smibId =
              cabinet.relayId || cabinet.smibBoard || cabinet.smbId;
            // Copy SMIB ID to clipboard when clicked
            if (smibId) {
              copyToClipboard(smibId, 'SMIB');
            }
          }}
          className={`flex items-center gap-1 whitespace-normal break-words text-sm ${
            cabinet.relayId || cabinet.smibBoard || cabinet.smbId
              ? 'cursor-pointer text-gray-600 hover:text-blue-600 hover:underline'
              : 'text-gray-400'
          }`}
          title={
            cabinet.relayId || cabinet.smibBoard || cabinet.smbId
              ? 'Click to copy SMIB'
              : 'No SMIB'
          }
          disabled={!cabinet.relayId && !cabinet.smibBoard && !cabinet.smbId}
        >
          <span>
            {cabinet.relayId || cabinet.smibBoard || cabinet.smbId || 'N/A'}
          </span>
          {/* Show copy icon only if SMIB ID exists */}
          {(cabinet.relayId || cabinet.smibBoard || cabinet.smbId) && (
            <Copy className="h-3 w-3 flex-shrink-0" />
          )}
        </button>
      </div>

      {/* Network Badge */}
      {cabinet.network && (
        <div className="mb-1">
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
            {cabinet.network}
          </span>
        </div>
      )}
      <div className="mt-2 border-t border-gray-200 pt-2">
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money In:</span>
          <CurrencyValueWithOverflow
            value={cabinet.moneyIn || 0}
            className={`text-xs font-medium ${getMoneyInColorClass()}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money Out:</span>
          <MoneyOutCell
            moneyOut={cabinet.moneyOut || 0}
            moneyIn={cabinet.moneyIn || 0}
            jackpot={cabinet.jackpot || 0}
            displayValue={formatCurrency(cabinet.moneyOut || 0)}
            className="text-xs"
            includeJackpot={!!cabinet.includeJackpot}
            showInfoIcon={true}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Jackpot:</span>
          <CurrencyValueWithOverflow
            value={cabinet.jackpot || 0}
            className="text-xs font-medium"
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Gross:</span>
          <CurrencyValueWithOverflow
            value={cabinet.gross || 0}
            className={`text-xs font-medium ${getGrossColorClass(cabinet.gross)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => router.push(`/cabinets/${cabinet._id}`)}
          variant="outline"
          size="sm"
          className="flex flex-1 items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </Button>
        {/* Show Edit button only if user can edit machines */}
        {canEditMachines && (
          <Button
            onClick={() => onEdit(cabinet)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        )}
        {/* Show Delete button only if user can delete machines */}
        {canDeleteMachines && (
          <Button
            onClick={() => onDelete(cabinet)}
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
