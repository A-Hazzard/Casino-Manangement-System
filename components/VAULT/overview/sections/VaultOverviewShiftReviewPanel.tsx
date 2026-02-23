
'use client';

import DebugSection from '@/components/shared/debug/DebugSection';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/ui/tooltip';
import CashierActivityLogModal from '@/components/VAULT/admin/modals/CashierActivityLogModal';
import CashierShiftHistoryModal from '@/components/VAULT/admin/modals/CashierShiftHistoryModal';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicensee } from '@/lib/hooks/vault/useVaultLicensee';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import { getDenominationValues, getInitialDenominationRecord } from '@/lib/utils/vault/denominations';
import type { Denomination, UnbalancedShiftInfo } from '@/shared/types/vault';
import { AlertTriangle, BarChart3, CheckCircle, ChevronLeft, ChevronRight, Filter, History as HistoryIcon, Info, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type VaultOverviewShiftReviewPanelProps = {
  pendingShifts: UnbalancedShiftInfo[];
  vaultInventory?: Denomination[];
  onResolve: (
    shiftId: string,
    finalBalance: number,
    auditComment: string,
    denominations?: Denomination[]
  ) => Promise<void>;
  onReject: (
    shiftId: string,
    reason: string
  ) => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
  readOnly?: boolean;
};

export default function VaultOverviewShiftReviewPanel({
  pendingShifts,
  vaultInventory = [],
  onResolve,
  onReject,
  onRefresh,
  loading = false,
  readOnly = false,
}: VaultOverviewShiftReviewPanelProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenseeId: selectedLicencee } = useVaultLicensee();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [finalBalance, setFinalBalance] = useState<string>('');
  const [auditComment, setAuditComment] = useState<string>('');
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [shiftDenominations, setShiftDenominations] = useState<Record<string, number>>({});

  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set());

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<'all' | 'variance' | 'no-variance'>('all');

  // Modals for Logs
  const [selectedCashierForLogs, setSelectedCashierForLogs] = useState<{ _id: string; username: string; profile?: { firstName: string; lastName: string } } | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Helper to format time only (Trinidad time, UTC-4)
  const formatTimeOnly = (dateStr: string | Date) => {
    return safeFormatDate(dateStr, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Port_of_Spain' // Trinidad UTC-4
    });
  };

  // Filter Shifts
  const filteredShifts = pendingShifts.filter(shift => {
    // Name Search
    const matchesSearch = shift.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Variance Filter
    let matchesVariance = true;
    if (varianceFilter === 'variance') {
      matchesVariance = Math.abs(shift.discrepancy) > 0.01;
    } else if (varianceFilter === 'no-variance') {
      matchesVariance = Math.abs(shift.discrepancy) <= 0.01;
    }
    
    return matchesSearch && matchesVariance;
  });

  // Carousel State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    // Use a small buffer (e.g. 10px) to handle rounding errors
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [pendingShifts, filteredShifts]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 350 + 16; // Card width + gap
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  const shiftTotal = Object.entries(shiftDenominations).reduce(
    (sum, [denom, qty]) => sum + Number(denom) * qty,
    0
  );

  const startResolve = (shift: UnbalancedShiftInfo) => {
    setResolvingId(shift.shiftId);
    setIsRejecting(false);
    setIsEditingBreakdown(false);
    setFinalBalance(shift.expectedBalance.toString());
    
    // Initialize denominations from shift data if available
    const denoms = getInitialDenominationRecord(selectedLicencee);
    if (shift.enteredDenominations) {
        shift.enteredDenominations.forEach(d => {
            if (denoms[d.denomination.toString()] !== undefined) {
               denoms[d.denomination.toString()] = d.quantity;
            }
        });
    }
    setShiftDenominations(denoms);
    setAuditComment('');
    
    // Auto-expand when resolving
    const newSet = new Set(expandedShifts);
    newSet.add(shift.shiftId);
    setExpandedShifts(newSet);
  };

  const cancelResolve = () => {
    setResolvingId(null);
    setIsRejecting(false);
    setIsEditingBreakdown(false);
    setFinalBalance('');
    setShiftDenominations(getInitialDenominationRecord(selectedLicencee));
    setAuditComment('');
  };

  const currentShortageCheck = useMemo(() => {
    if (!resolvingId || !isEditingBreakdown) return { hasShortage: false, shortages: [] };

    const shortages = Object.entries(shiftDenominations)
      .filter(([_, qty]) => qty > 0)
      .map(([denom, qty]) => ({ denomination: Number(denom), quantity: qty }))
      .filter(req => {
        const stock = vaultInventory.find(v => Number(v.denomination) === Number(req.denomination))?.quantity || 0;
        return Number(req.quantity) > Number(stock);
      });

    return { hasShortage: shortages.length > 0, shortages };
  }, [resolvingId, isEditingBreakdown, shiftDenominations, vaultInventory]);

  const { hasShortage } = currentShortageCheck;

  const getSuggestedRejectionReason = (shift: UnbalancedShiftInfo) => {
    const { discrepancy } = shift;
    const absDisc = Math.abs(discrepancy);
    
    if (absDisc === 0) return 'Carefully re-count your physical cash and please resubmit.';
    
    const direction = discrepancy > 0 ? 'over' : 'short';
    let message = `Your count is $${absDisc.toFixed(2)} ${direction}. `;
    
    const commonDenoms = getDenominationValues(selectedLicencee);
    const matchingDenom = commonDenoms.find(d => Math.abs(absDisc - d) < 0.01);
    
    if (matchingDenom) {
      message += `It looks like you might have miscounted a $${matchingDenom} bill. `;
    }
    
    message += 'Carefully re-count your physical cash and please resubmit.';
    return message;
  };

  const handleReject = async () => {
    if (!resolvingId) return;
    try {
      await onReject(resolvingId, auditComment.trim());
      cancelResolve();
    } catch {
      // Error handled by parent
    }
  };

  const startRejection = (shift: UnbalancedShiftInfo) => {
    setIsRejecting(true);
    setAuditComment(getSuggestedRejectionReason(shift));
  };

  const handleResolve = async () => {
    if (!resolvingId) return;
    const balance = parseFloat(finalBalance);
    if (isNaN(balance) || balance < 0) {
      alert('Please enter a valid final balance');
      return;
    }

    const denoms = isEditingBreakdown 
        ? Object.entries(shiftDenominations)
            .filter(([_, qty]) => qty > 0)
            .map(([val, qty]) => ({ denomination: Number(val) as Denomination['denomination'], quantity: qty }))
        : undefined;

    try {
      await onResolve(resolvingId, balance, auditComment.trim(), denoms);
      cancelResolve();
    } catch {
      // Error handled by parent
    }
  };

  if (pendingShifts.length === 0) {
    return (
      <Card className="rounded-lg bg-container shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Shift Reviews
          </CardTitle>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-orange-100/50 p-1 rounded-lg border border-orange-200 opacity-50 grayscale pointer-events-none">
                <Filter className="h-3.5 w-3.5 text-orange-600 ml-1" />
                <select className="bg-transparent text-[11px] font-bold text-orange-700 outline-none cursor-pointer" disabled>
                  <option>No Variance</option>
                </select>
              </div>
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRefresh}
                className="h-8 px-2 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-gray-500">
            No shifts pending review
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="shift-review-panel" className="rounded-lg bg-container shadow-md scroll-mt-20 overflow-hidden">
      <CardHeader className="flex flex-col space-y-4 pb-2 px-6 pt-6">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-orangeHighlight" />
              Shift Reviews ({pendingShifts.length})
            </CardTitle>
            <DebugSection title="Pending Shifts Data" data={pendingShifts} />
          </div>
          <div className="flex items-center gap-3">
            {/* Variance Filter Button Group */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
              {[
                { value: 'all', label: 'All', icon: Filter },
                { value: 'variance', label: 'Variance', icon: AlertTriangle },
                { value: 'no-variance', label: 'Perfect', icon: CheckCircle }
              ].map((item) => {
                const isSelected = varianceFilter === item.value;
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    onClick={() => setVarianceFilter(item.value as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all",
                      isSelected 
                        ? "bg-white text-orangeHighlight shadow-sm border border-gray-200" 
                        : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-orangeHighlight" : "text-gray-400")} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRefresh}
                className="h-9 px-3 text-blue-600 hover:bg-blue-50 rounded-xl font-bold"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>
        
        {/* Search - Only show if 4 or more shifts */}
        {pendingShifts.length >= 4 && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search by cashier..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-9 px-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      
      <div className="relative group px-6 pb-6">
        {/* Navigation Buttons */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100 hidden sm:block backdrop-blur-sm"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        
        {showRightArrow && (
           <button
             onClick={() => scroll('right')}
             className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100 hidden sm:block backdrop-blur-sm"
             aria-label="Scroll right"
           >
             <ChevronRight className="h-6 w-6" />
           </button>
        )}

        <CardContent 
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto p-1 custom-scrollbar snap-x snap-mandatory scroll-smooth -ml-1 items-start"
        >
          {filteredShifts.length === 0 ? (
             <div className="w-full py-8 text-center text-gray-500 italic">
               No shifts match your search criteria.
             </div>
          ) : (
             filteredShifts.map((shift) => {
            return (
            <div
              key={shift.shiftId}
              className="flex-shrink-0 min-w-[350px] max-w-[350px] space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4 snap-center relative transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-gray-900">
                    {shift.cashierName}
                  </h4>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tight">
                    Closed: {formatTimeOnly(shift.closedAt)}
                  </p>
                </div>
                <Badge className="bg-orangeHighlight text-white font-bold px-3">
                  Review Required
                </Badge>
              </div>

              <TooltipProvider>
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Expected</span>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-center">
                          The balance the system expects based on starting amount, payouts, and adjustments.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm font-black text-gray-900">
                      {formatAmount(shift.expectedBalance)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Entered</span>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-center">
                          The actual physical cash count submitted by the cashier at the end of their shift.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm font-black text-gray-900">
                      {formatAmount(shift.enteredBalance)}
                    </span>
                  </div>
                </div>

                {/* Details Section - Always Visible */}
                <div className="animate-in fade-in zoom-in-95 duration-200">
                    <div className="mt-2 pt-3 border-t border-orange-200">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Discrepancy</span>
                        <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Info className="h-3 w-3 cursor-help opacity-70 hover:opacity-100 transition-opacity" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-center">
                            The difference between the system's expected balance and the cashier's physical count.
                        </TooltipContent>
                        </Tooltip>
                    </div>
                    <span
                        className={`text-base font-black ${
                        shift.discrepancy > 0
                            ? 'text-red-600'
                            : shift.discrepancy < 0
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                    >
                        {shift.discrepancy > 0 ? '+' : ''}
                        {formatAmount(shift.discrepancy)}
                    </span>
                    </div>

                    {/* Denomination Breakdown */}
                    {shift.enteredDenominations && shift.enteredDenominations.length > 0 && (
                    <div className="mt-4 bg-white/60 rounded-md p-3 border border-orange-100">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cashier Count Breakdown</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {shift.enteredDenominations
                            .filter(d => d.quantity > 0)
                            .sort((a, b) => b.denomination - a.denomination)
                            .map((d, i) => (
                            <div key={i} className="flex flex-col items-center bg-white rounded border border-gray-100 py-1 shadow-sm">
                            <span className="text-[10px] text-gray-400 font-bold">${d.denomination}</span>
                            <span className="text-sm font-black text-gray-900">{d.quantity}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                    )}

                    {/* Quick Access Logs */}
                    <div className="flex gap-2 mt-4">
                      {!readOnly && resolvingId !== shift.shiftId && (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-[10px] uppercase font-bold bg-orangeHighlight/10 border-orangeHighlight/20 text-orangeHighlight hover:bg-orangeHighlight/20 gap-1.5"
                          onClick={() => startResolve(shift)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Review
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-[10px] uppercase font-bold border-orange-200 text-orange-700 hover:bg-orange-100 gap-1.5"
                        onClick={() => {
                          setSelectedCashierForLogs({
                            _id: shift.cashierId,
                            username: shift.cashierName,
                            profile: { firstName: shift.cashierName, lastName: '' }
                          });
                          setIsHistoryModalOpen(true);
                        }}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        History
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-[10px] uppercase font-bold border-orange-200 text-orange-700 hover:bg-orange-100 gap-1.5"
                        onClick={() => {
                          setSelectedCashierForLogs({
                            _id: shift.cashierId,
                            username: shift.cashierName,
                            profile: { firstName: shift.cashierName, lastName: '' }
                          });
                          setIsActivityModalOpen(true);
                        }}
                      >
                        <HistoryIcon className="h-3.5 w-3.5" />
                        Logs
                      </Button>
                    </div>

                    {!readOnly && (
                        resolvingId === shift.shiftId ? (
                            <div className="space-y-3 border-t pt-3 mt-4">
                                {!isRejecting ? (
                                <>
                                    <div className="flex items-end justify-between gap-4">
                                    <div className="flex-1">
                                        <Label className="text-sm font-medium text-gray-700">
                                        Final Balance
                                        </Label>
                                        <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={isEditingBreakdown ? shiftTotal : finalBalance}
                                        onChange={e => !isEditingBreakdown && setFinalBalance(e.target.value)}
                                        disabled={isEditingBreakdown}
                                        className="mt-1"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (!isEditingBreakdown) {
                                                if (!finalBalance) setFinalBalance(shiftTotal.toString());
                                            }
                                            setIsEditingBreakdown(!isEditingBreakdown);
                                        }}
                                        className={cn(
                                            "mb-[2px]",
                                            isEditingBreakdown ? "bg-orange-100 border-orange-300 text-orange-900" : ""
                                        )}
                                    >
                                        {isEditingBreakdown ? "Cancel Edit" : "Edit Breakdown"}
                                    </Button>
                                    </div>

                                    {isEditingBreakdown && (
                                        <div className="grid grid-cols-3 gap-2 mt-2 bg-white p-3 rounded-lg border border-orange-200">
                                            {getDenominationValues(selectedLicencee).map(denom => {
                                                const qty = shiftDenominations[denom.toString()] || 0;
                                                const stock = vaultInventory.find(v => Number(v.denomination) === denom)?.quantity || 0;
                                                const isShort = qty > stock;
                                                
                                                return (
                                                    <div key={denom} className="space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <Label className={cn(
                                                                "text-[10px] font-bold uppercase tracking-tighter",
                                                                isShort ? "text-red-500" : "text-gray-500"
                                                            )}>
                                                                ${denom}
                                                            </Label>
                                                            {isShort && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className={cn(
                                                                "h-9 text-sm font-bold",
                                                                isShort ? "border-red-500 focus-visible:ring-red-500 bg-red-50" : ""
                                                            )}
                                                            value={qty || ''}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                setShiftDenominations(prev => ({
                                                                    ...prev,
                                                                    [denom.toString()]: val
                                                                }));
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                            <div className="col-span-3 pt-2 mt-2 border-t flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-600">Total:</span>
                                                <span className="text-sm font-black text-orange-600">${shiftTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                                ) : (
                                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                                        <p className="text-xs text-red-700 font-bold uppercase tracking-tight mb-1 flex items-center gap-1.5 line-clamp-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Returning to Cashier
                                        </p>
                                        <p className="text-xs text-red-600">
                                            Rejecting this request will revert the shift to <strong>Active</strong>.
                                        </p>
                                    </div>
                                )}
                                <div>
                                <Label className="text-sm font-medium text-gray-700">
                                    {isRejecting ? 'Reason' : 'Audit Comment'}
                                </Label>
                                
                                {isRejecting ? (
                                  <div className="space-y-3 mt-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      {['Miscount', 'Denoms', 'Incomplete', 'Other'].map(label => (
                                        <Button
                                          key={label}
                                          type="button"
                                          variant={auditComment === label ? 'default' : 'outline'}
                                          size="sm"
                                          onClick={() => setAuditComment(label === 'Other' ? '' : label)}
                                          className="text-[10px] uppercase font-black"
                                        >
                                          {label}
                                        </Button>
                                      ))}
                                    </div>
                                    {(auditComment === 'Other' || (auditComment.length > 0 && !['Miscount', 'Denoms', 'Incomplete'].some(r => auditComment.includes(r)))) && (
                                      <Textarea
                                        value={auditComment === 'Other' ? '' : auditComment}
                                        onChange={e => setAuditComment(e.target.value)}
                                        placeholder="Details (max 200 chars)..."
                                        maxLength={200}
                                        rows={2}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <Textarea
                                    value={auditComment}
                                    onChange={e => setAuditComment(e.target.value)}
                                    placeholder="Optional comment (max 200 chars)..."
                                    maxLength={200}
                                    rows={2}
                                  />
                                )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2 w-full">
                                    {!isRejecting ? (
                                        <div className="flex flex-wrap gap-2 w-full">
                                        <Button
                                            size="sm"
                                            onClick={handleResolve}
                                            disabled={loading || hasShortage}
                                            className="flex-grow bg-button text-white hover:bg-button/90"
                                        >
                                            <CheckCircle className="mr-1 h-4 w-4" />
                                            Resolve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => startRejection(shift)}
                                            className="text-red-600 flex-grow"
                                        >
                                            Reject
                                        </Button>
                                        </div>
                                    ) : (
                                        <Button
                                        size="sm"
                                        onClick={handleReject}
                                        disabled={loading}
                                        className="bg-red-600 text-white hover:bg-red-700 w-full"
                                        >
                                        Confirm Rejection
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelResolve}
                                        className="w-full"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            null
                        )
                    )}
                </div>
              </TooltipProvider>
            </div>
            );
          })
          )}
        </CardContent>
      </div>

      {/* History & Activity Modals */}
      <CashierShiftHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onBack={() => setIsHistoryModalOpen(false)}
        cashier={selectedCashierForLogs}
      />
      <CashierActivityLogModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onBack={() => setIsActivityModalOpen(false)}
        cashier={selectedCashierForLogs}
      />
    </Card>
  );
}
