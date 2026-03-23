/**
 * Cabinets Details Accounting Details Component
 * Comprehensive component for displaying cabinet accounting metrics and history.
 *
 * Features:
 * - Financial metrics display (money in, money out, gross, jackpot, cancelled credits)
 * - Bill validator data with time period filtering
 * - Collection history table
 * - Activity log table
 * - Time period filters (Today, Yesterday, 7d, 30d, All Time, Custom)
 * - Currency formatting and conversion
 * - Tab navigation (Metrics, Collection History, Activity Log)
 * - Loading states and skeletons
 * - Framer Motion animations
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

// Components
import ActivityLogDateFilter from '@/components/shared/ui/ActivityLogDateFilter';
import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { CabinetsDetailsActivityLogTable, type CabinetsDetailsMachineEvent } from './CabinetsDetailsActivityLogTable';
import { CabinetsDetailsCollectionHistoryTable, type TimeFilter } from './CabinetsDetailsCollectionHistoryTable';
import CabinetsDetailsUnifiedBillValidator from './CabinetsDetailsUnifiedBillValidator';
import { CollectionSettingsContent } from './CollectionSettingsContent';
import { ConfigurationCard } from './ConfigurationCard';

// Hooks & Store
import { containerVariants, itemVariants } from '@/lib/constants';
import { useCabinetAccountingData } from '@/lib/hooks/cabinets/useCabinetAccountingData';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

// Skeletons
import {
  ConfigurationsSkeleton,
  LiveMetricsSkeleton,
  MetricsSkeleton
} from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';
import CabinetsDetailsActivityLogSkeleton from './CabinetsDetailsActivityLogSkeleton';
import CabinetsDetailsCollectionHistorySkeleton from './CabinetsDetailsCollectionHistorySkeleton';

// Utils & Types
import type { AccountingDetailsProps } from '@/lib/types/cabinet/details';
import { formatCurrency } from '@/lib/utils';
import { getGrossColorClass, getMoneyInColorClass } from '@/lib/utils/financial';

/**
 * Cabinets Details Accounting Details Component
 */
const CabinetsDetailsAccountingDetails = ({
  cabinet,
  loading,
  activeMetricsTabContent,
  setActiveMetricsTabContent,
  onRefresh,
}: AccountingDetailsProps) => {
  const { formatAmount } = useCurrencyFormat();
  const hook = useCabinetAccountingData({ cabinet, activeMetricsTabContent });

  const {
    collectionHistory,
    activityLog,
    machine,
    activityLogLoading,
    collectionHistoryError,
    activityLogError,
    billValidatorTimePeriod,
    activeMetricsFilter,
    customDateRange,
    setActivityLogDateRange,
    setActivityLogTimePeriod,
    setBillValidatorTimePeriod,
    setMachine,
  } = hook;

  const menuItems = [
    'Metrics',
    'Live Metrics',
    'Bill Validator',
    'Activity Log',
    'Collection History',
    'Collection Settings',
    'Configurations',
  ];

  return (
    <motion.div
      className="mt-2 rounded-lg bg-container p-4 shadow-md shadow-purple-200 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="mb-4 text-xl font-semibold">Accounting Details</h2>

      {/* Mobile Tab Navigation */}
      <div className="mb-4 flex overflow-x-auto lg:hidden">
        <div className="flex min-w-max gap-2">
          {menuItems.map(menuItem => (
            <button
              key={menuItem}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeMetricsTabContent === (menuItem === 'Metrics' ? 'Movement Metrics' : menuItem)
                  ? 'bg-accent text-buttonActive'
                  : 'bg-muted text-grayHighlight hover:bg-muted/80'
              }`}
              onClick={() => setActiveMetricsTabContent(menuItem === 'Metrics' ? 'Movement Metrics' : menuItem)}
            >
              {menuItem}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row">
        {/* Desktop Sidebar Navigation */}
        <motion.aside
          className="mb-4 hidden w-48 flex-shrink-0 lg:mb-0 lg:mr-6 lg:block"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {menuItems.map((menuItem, idx) => (
            <motion.button
              key={menuItem}
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className={`block w-full px-4 py-2.5 text-left text-sm ${
                activeMetricsTabContent === (menuItem === 'Metrics' ? 'Movement Metrics' : menuItem)
                  ? 'bg-accent font-semibold text-buttonActive'
                  : 'text-grayHighlight hover:bg-muted'
              } ${idx === menuItems.length - 1 ? 'md:rounded-b-md' : 'border-b border-border md:border-b-0'}`}
              onClick={() => setActiveMetricsTabContent(menuItem === 'Metrics' ? 'Movement Metrics' : menuItem)}
            >
              {menuItem}
            </motion.button>
          ))}
        </motion.aside>

        <div className="w-full flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
              key="accounting-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h3 className="mb-4 hidden text-center font-medium md:block md:text-left">
                {activeMetricsTabContent === 'Movement Metrics' ? 'Metrics' : activeMetricsTabContent}
              </h3>

              <AnimatePresence mode="wait">
                {/* Tab: Movement Metrics */}
                {activeMetricsTabContent === 'Movement Metrics' ? (
                  loading ? (
                    <MetricsSkeleton />
                  ) : (
                    <motion.div
                      key="range-metrics"
                      className="flex w-full max-w-full flex-wrap gap-3 md:gap-4"
                      style={{ rowGap: '1rem' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Money In */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">Money In</h4>
                        <div className="mb-4 h-1 w-full bg-orangeHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className={`max-w-full truncate break-words text-center text-base font-bold md:text-xl ${getMoneyInColorClass()}`}>
                            {formatAmount(Number(cabinet?.moneyIn ?? cabinet?.sasMeters?.drop ?? 0))}
                          </p>
                        </div>
                      </motion.div>

                      {/* Money Out */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">Money Out</h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <MoneyOutCell
                            moneyOut={Number(cabinet?.moneyOut ?? 0)}
                            moneyIn={Number(cabinet?.moneyIn ?? 0)}
                            jackpot={Number(cabinet?.jackpot ?? 0)}
                            displayValue={formatAmount(Number(cabinet?.moneyOut ?? cabinet?.sasMeters?.totalCancelledCredits ?? 0))}
                            includeJackpot={!!cabinet?.includeJackpot}
                            showInfoIcon={true}
                            className="text-base font-bold md:text-xl"
                          />
                        </div>
                      </motion.div>

                      {/* Gross */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">Gross</h4>
                        <div className="mb-4 h-1 w-full bg-pinkHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className={`max-w-full truncate break-words text-center text-base font-bold md:text-xl ${getGrossColorClass(Number(cabinet?.gross ?? Number(cabinet?.moneyIn ?? 0) - Number(cabinet?.moneyOut ?? 0)))}`}>
                            {formatAmount(Number(cabinet?.gross ?? Number(cabinet?.moneyIn ?? 0) - Number(cabinet?.moneyOut ?? 0)))}
                          </p>
                        </div>
                      </motion.div>

                      {/* Jackpot */}
                      <motion.div
                        className="w-full min-w-[220px] max-w-full flex-1 basis-[250px] overflow-x-auto rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 truncate text-center text-xs md:mb-4 md:text-sm">Jackpot</h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="max-w-full truncate break-words text-center text-base font-bold md:text-xl">
                            {formatCurrency(Number(cabinet?.jackpot ?? cabinet?.sasMeters?.jackpot ?? 0))}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === 'Live Metrics' ? (
                  /* Tab: Live Metrics */
                  loading ? (
                    <LiveMetricsSkeleton />
                  ) : (
                    <motion.div
                      key="live-metrics"
                      className="grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Coin In */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">Coin In</h4>
                        <div className="mb-4 h-1 w-full bg-greenHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(Number(cabinet?.coinIn ?? cabinet?.handle ?? cabinet?.sasMeters?.coinIn ?? 0))}
                          </p>
                        </div>
                      </motion.div>

                      {/* Coin Out */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">Coin Out</h4>
                        <div className="mb-4 h-1 w-full bg-pinkHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(Number(cabinet?.coinOut ?? cabinet?.sasMeters?.coinOut ?? 0))}
                          </p>
                        </div>
                      </motion.div>

                      {/* Total Hand Paid Cancelled Credits */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">Total Hand Paid Cancelled Credits</h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(Number(cabinet?.sasMeters?.totalHandPaidCancelledCredits ?? cabinet?.meterData?.movement?.totalHandPaidCancelledCredits ?? 0))}
                          </p>
                        </div>
                      </motion.div>

                      {/* Current Credits */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">Current Credits</h4>
                        <div className="mb-4 h-1 w-full bg-orangeHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {formatCurrency(Number(cabinet?.sasMeters?.currentCredits ?? cabinet?.meterData?.movement?.currentCredits ?? 0))}
                          </p>
                        </div>
                      </motion.div>

                      {/* Games Played */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">Games Played</h4>
                        <div className="mb-4 h-1 w-full bg-orangeHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {cabinet?.gamesPlayed ?? cabinet?.sasMeters?.gamesPlayed ?? 0}
                          </p>
                        </div>
                      </motion.div>

                      {/* Games Won */}
                      <motion.div
                        className="rounded-lg bg-container p-4 shadow md:p-6"
                        variants={itemVariants}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <h4 className="mb-2 text-center text-xs md:mb-4 md:text-sm">Games Won</h4>
                        <div className="mb-4 h-1 w-full bg-blueHighlight md:mb-6"></div>
                        <div className="flex items-center justify-center">
                          <p className="text-center text-base font-bold md:text-xl">
                            {cabinet?.gamesWon ?? cabinet?.sasMeters?.gamesWon ?? 0}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === 'Bill Validator' ? (
                  /* Tab: Bill Validator */
                  <motion.div
                    key="bill-validator"
                    className="w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <CabinetsDetailsUnifiedBillValidator
                      machineId={cabinet._id}
                      timePeriod={billValidatorTimePeriod}
                      onTimePeriodChange={setBillValidatorTimePeriod}
                      gameDayOffset={cabinet.gameDayOffset}
                    />
                  </motion.div>
                ) : activeMetricsTabContent === 'Activity Log' ? (
                  /* Tab: Activity Log */
                  <motion.div
                    key="activity-log"
                    className="w-full rounded-lg bg-container p-6 shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="mb-6">
                      <ActivityLogDateFilter
                        onDateRangeChange={setActivityLogDateRange}
                        onTimePeriodChange={setActivityLogTimePeriod}
                        disabled={activityLogLoading}
                      />
                    </div>

                    {activityLogLoading ? (
                      <CabinetsDetailsActivityLogSkeleton />
                    ) : activityLogError ? (
                      <div className="flex h-48 w-full flex-col items-center justify-center">
                        <p className="mb-2 text-center text-red-500">Failed to load activity log</p>
                        <p className="text-center text-sm text-grayHighlight">{activityLogError}</p>
                      </div>
                    ) : activityLog.length > 0 ? (
                      <CabinetsDetailsActivityLogTable data={activityLog as CabinetsDetailsMachineEvent[]} />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center">
                        <p className="text-center text-grayHighlight">No activity log data found for this machine.</p>
                      </div>
                    )}
                  </motion.div>
                ) : activeMetricsTabContent === 'Collection History' ? (
                  /* Tab: Collection History */
                  loading ? (
                    <CabinetsDetailsCollectionHistorySkeleton />
                  ) : collectionHistoryError ? (
                    <motion.div
                      key="collection-history-error"
                      className="flex h-48 w-full flex-col items-center justify-center rounded-lg bg-container p-6 shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="mb-2 text-center text-red-500">Failed to load collection history</p>
                      <p className="text-center text-sm text-grayHighlight">{collectionHistoryError}</p>
                    </motion.div>
                  ) : collectionHistory.length > 0 ? (
                    <motion.div
                      key="collection-history"
                      className="w-full rounded-lg bg-container p-6 shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <CabinetsDetailsCollectionHistoryTable
                        data={collectionHistory}
                        defaultTimeFilter={
                          (() => {
                            const filter = activeMetricsFilter;
                            if (filter === 'Today') return 'today';
                            if (filter === 'Yesterday') return 'yesterday';
                            if (filter === '7d') return '7d';
                            if (filter === '30d') return '30d';
                            if (filter === 'All Time') return 'all';
                            if (filter === 'Custom') return 'custom';
                            return 'all';
                          })() as TimeFilter
                        }
                        customRange={customDateRange as { from: Date; to: Date } | undefined}
                        onRefresh={onRefresh}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="collection-history-empty"
                      className="flex h-48 w-full items-center justify-center rounded-lg bg-container p-6 shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="text-center text-grayHighlight">No collection history data found for this machine.</p>
                    </motion.div>
                  )
                ) : activeMetricsTabContent === 'Collection Settings' ? (
                  /* Tab: Collection Settings */
                  <motion.div
                    key="collection-settings"
                    className="w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <CollectionSettingsContent cabinet={cabinet} />
                  </motion.div>
                ) : activeMetricsTabContent === 'Configurations' ? (
                  /* Tab: Configurations */
                  loading ? (
                    <ConfigurationsSkeleton />
                  ) : (
                    <motion.div
                      key="configurations"
                      className="flex w-full flex-col flex-wrap items-center gap-4 sm:flex-row sm:items-stretch sm:justify-start"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Accounting Denomination */}
                      {machine?.gameConfig?.accountingDenomination !== undefined && (
                        <ConfigurationCard
                          title="Accounting Denomination"
                          bgColor="bg-blue-500"
                          machine={machine}
                          onSave={async value => {
                            try {
                              const response = await fetch(`/api/cabinets/${cabinet._id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 'gameConfig.accountingDenomination': value }),
                              });
                              if (!response.ok) throw new Error('Failed to update');
                              toast.success('Accounting Denomination updated');
                              setMachine(prev => prev ? { ...prev, gameConfig: { ...prev.gameConfig, accountingDenomination: value } } : prev);
                            } catch {
                              toast.error('Failed to update Accounting Denomination');
                            }
                          }}
                        />
                      )}
                      {/* Theoretical RTP */}
                      {machine?.gameConfig?.accountingDenomination !== undefined &&
                        machine?.gameConfig?.theoreticalRtp !== undefined && (
                          <ConfigurationCard
                            title="Theoretical RTP"
                            bgColor="bg-green-400"
                            machine={machine}
                            displayValue={`${machine.gameConfig.theoreticalRtp}%`}
                            inputType="percentage"
                            onSave={async value => {
                              try {
                                const response = await fetch(`/api/cabinets/${cabinet._id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 'gameConfig.theoreticalRtp': value }),
                                });
                                if (!response.ok) throw new Error('Failed to update');
                                toast.success('Theoretical RTP updated');
                                setMachine(prev => prev ? { ...prev, gameConfig: { ...prev.gameConfig, theoreticalRtp: value } } : prev);
                              } catch {
                                toast.error('Failed to update Theoretical RTP');
                              }
                            }}
                          />
                        )}
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key="no-content"
                    className="flex h-48 items-center justify-center rounded-lg bg-container p-6 shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-grayHighlight">No content available for {activeMetricsTabContent}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default CabinetsDetailsAccountingDetails;