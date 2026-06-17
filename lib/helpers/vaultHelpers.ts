/**
 * Vault Helper Functions
 *
 * Extracted API fetching and event handler logic for vault components.
 * Follows compliance guidelines by moving large functions out of components.
 *
 * @module lib/helpers/vaultHelpers
 */

import type { NotificationItem } from '@/components/shared/ui/NotificationBell';
import {
  DEFAULT_CASHIER_FLOATS,
  DEFAULT_VAULT_BALANCE,
} from '@/components/VAULT/overview/data/defaults';
import type {
  CashDesk,
  Cashier,
  CashierFloat,
  CashierShift,
  Denomination,
  ExtendedVaultTransaction,
  FloatRequest,
  InterLocationTransfer,
  UnbalancedShiftInfo,
  VaultBalance,
  VaultMetrics,
  VaultTransaction,
  VaultTransfer,
} from '@/shared/types/vault';
import {
  calculateEndOfDayMetrics,
  generateTempPassword,
  getTransactionTypeBadge,
  handleExportCSV,
  handleExportPDF,
  handleNotificationClick,
  handlePrint,
  sortTransfers,
} from '@/lib/helpers/vault/vaultCalculationHelpers';

export {
  calculateEndOfDayMetrics,
  generateTempPassword,
  getTransactionTypeBadge,
  handleExportCSV,
  handleExportPDF,
  handleNotificationClick,
  handlePrint,
  sortTransfers,
};

// ============================================================================
// API Data Fetching Functions
// ============================================================================

/**
 * Fetch vault overview data from all relevant endpoints
 */
export async function fetchVaultOverviewData(
  locationId: string,
  username?: string
) {
  try {
    const [
      balanceRes,
      metricsRes,
      transactionsRes,
      pendingShiftsRes,
      activeShiftsRes,
      pendingFloatsRes,
    ] = await Promise.all([
      fetch(`/api/vault/balance?locationId=${locationId}`),
      fetch(`/api/vault/metrics?locationId=${locationId}`),
      fetch(`/api/vault/transactions?locationId=${locationId}&limit=5`),
      fetch(
        `/api/cashier/shifts?status=pending_review&locationId=${locationId}`
      ),
      fetch(
        `/api/cashier/shifts?status=active,pending_start&locationId=${locationId}`
      ),
      fetch(`/api/vault/float-request?status=pending&locationId=${locationId}`),
    ]);

    const result: {
      vaultBalance: VaultBalance;
      metrics: VaultMetrics;
      transactions: VaultTransaction[];
      pendingShifts: UnbalancedShiftInfo[];
      floatRequests: FloatRequest[];
      cashDesks: CashDesk[];
      notifications: NotificationItem[];
    } = {
      vaultBalance: {} as VaultBalance,
      metrics: {} as VaultMetrics,
      transactions: [],
      pendingShifts: [],
      floatRequests: [],
      cashDesks: [],
      notifications: [],
    };

    // 1. Balance
    if (balanceRes.ok) {
      const data = await balanceRes.json();
      if (data.success) {
        result.vaultBalance = {
          ...data.data,
          canClose: data.data.canClose ?? false,
          blockReason: data.data.blockReason,
          managerOnDuty: data.data.managerOnDuty || username || 'Loading...',
          lastAudit:
            data.data.lastAudit ||
            (data.data.lastReconciliation
              ? new Date(data.data.lastReconciliation).toLocaleString()
              : 'Never'),
        };
      }
    }

    // 2. Metrics
    if (metricsRes.ok) {
      const data = await metricsRes.json();
      if (data.success) {
        result.metrics = data.metrics;
      }
    }

    // 3. Transactions
    if (transactionsRes.ok) {
      const data = await transactionsRes.json();
      if (data.success) {
        result.transactions = data.transactions;
      }
    }

    // 4. Pending Shifts and Notifications
    const newNotifications: NotificationItem[] = [];

    if (pendingShiftsRes.ok) {
      const data = await pendingShiftsRes.json();
      if (data?.success) {
        const formattedShifts: UnbalancedShiftInfo[] = data.shifts.map(
          (shift: CashierShift) => ({
            shiftId: shift._id,
            cashierId: shift.cashierId,
            cashierName:
              shift.cashierName ||
              shift.cashierUsername ||
              `Cashier ${shift.cashierId.substring(0, 4)}`,
            expectedBalance: shift.expectedClosingBalance || 0,
            enteredBalance: shift.cashierEnteredBalance || 0,
            enteredDenominations: shift.cashierEnteredDenominations || [],
            discrepancy: shift.discrepancy || 0,
            closedAt: shift.closedAt ? new Date(shift.closedAt) : new Date(),
          })
        );
        result.pendingShifts = formattedShifts;

        // Add notifications for pending reviews
        formattedShifts.forEach(shift => {
          newNotifications.push({
            id: `review-${shift.shiftId}`,
            type: 'shift_review',
            title: 'Shift Review Required',
            message: `Shift ${shift.shiftId} has a discrepancy of $${shift.discrepancy}`,
            timestamp: shift.closedAt,
            urgent: true,
            status: 'unread',
          });
        });
      }
    }

    // 5. Active Shifts (Cash Desks)
    if (activeShiftsRes.ok) {
      const data = await activeShiftsRes.json();
      if (data.success) {
        const activeDesks: CashDesk[] = data.shifts.map(
          (shift: CashierShift) => ({
            _id: shift._id,
            cashierId: shift.cashierId, // real cashier user ID
            locationId: shift.locationId,
            name:
              (shift.cashierName ||
                shift.cashierUsername ||
                `Cashier ${shift.cashierId.substring(0, 4)}`) +
              (shift.status === 'pending_start' ? ' (Pending Start)' : ''),
            cashierName:
              shift.cashierName ||
              shift.cashierUsername ||
              `Cashier ${shift.cashierId.substring(0, 4)}`,
            balance: shift.currentBalance ?? shift.openingBalance ?? 0,
            denominations:
              shift.lastSyncedDenominations ?? shift.openingDenominations ?? [],
            lastAudit: new Date(
              shift.openedAt || shift.createdAt || new Date()
            ).toISOString(),
            status: shift.status || 'active',
            openedAt: shift.openedAt,
            openingBalance: shift.openingBalance,
            payoutsTotal: shift.payoutsTotal || 0,
          })
        );
        result.cashDesks = activeDesks;
      }
    }

    // 6. Pending Float Requests (Notifications)
    if (pendingFloatsRes.ok) {
      const data = await pendingFloatsRes.json();
      if (data.success && Array.isArray(data.requests)) {
        result.floatRequests = data.requests;
        data.requests.forEach((req: FloatRequest) => {
          newNotifications.push({
            id: req._id,
            type: 'float_request',
            title: 'New Float Request',
            message: `Cashier ${req.cashierId.substring(0, 4)} requested $${req.requestedAmount}`,
            timestamp: new Date(req.requestedAt),
            urgent: false,
            status: 'unread',
          });
        });
      }
    }

    result.notifications = newNotifications;
    return result;
  } catch (error) {
    console.error('Failed to fetch vault overview data', error);
    throw error;
  }
}

/**
 * Fetch global vault overview data for admin/developer aggregated view
 * Queries aggregated data from membershipEnabled locations only
 */
export async function fetchGlobalVaultOverviewData(
  licenceeId?: string
): Promise<{
  vaultBalance: VaultBalance;
  metrics: VaultMetrics;
  transactions: VaultTransaction[];
  pendingShifts: UnbalancedShiftInfo[];
  floatRequests: FloatRequest[];
  cashDesks: CashDesk[];
  notifications: NotificationItem[];
}> {
  try {
    let url = `/api/vault/overview/global`;
    if (licenceeId && licenceeId !== 'all') {
      url += `?licenceeId=${encodeURIComponent(licenceeId)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Global vault fetch failed:', response.statusText);
      throw new Error(
        `Failed to fetch global vault data: ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data.success) {
      console.error('Global vault fetch returned error:', data.error);
      throw new Error(data.error || 'Failed to fetch global vault data');
    }

    const resultData = data.data;

    // Helper to format shifts
    const formatShifts = (shifts: unknown[]): UnbalancedShiftInfo[] => {
      // Handle array or null input gracefully
      if (!Array.isArray(shifts)) return [];

      return shifts.map(item => {
        const shift = item as CashierShift & { locationName?: string };
        return {
          shiftId: String(shift._id || ''),
          cashierId: String(shift.cashierId || ''),
          cashierName: String(
            shift.cashierName ||
              shift.cashierUsername ||
              `Cashier ${String(shift.cashierId || '').substring(0, 4)}`
          ),
          expectedBalance: Number(shift.expectedClosingBalance || 0),
          enteredBalance: Number(shift.cashierEnteredBalance || 0),
          enteredDenominations: shift.cashierEnteredDenominations || [],
          discrepancy: Number(shift.discrepancy || 0),
          closedAt: shift.closedAt ? new Date(shift.closedAt) : new Date(),
          locationName: String(shift.locationName || ''), // Extra field for global view
        };
      });
    };

    // Helper to format requests
    const formatRequests = (requests: unknown[]): FloatRequest[] => {
      // Handle array or null input gracefully
      if (!Array.isArray(requests)) return [];

      return requests.map(req => ({
        ...(req as FloatRequest),
        locationName: (req as FloatRequest & { locationName?: string })
          .locationName as string, // Extra field for global view
      }));
    };

    const notifications: NotificationItem[] = [];

    // Pending Shifts
    const pendingShifts = formatShifts(resultData.pendingShifts);
    pendingShifts.forEach(shift => {
      notifications.push({
        id: `review-${shift.shiftId}`,
        type: 'shift_review',
        title: 'Shift Review Required',
        message: `${shift.locationName ? `[${shift.locationName}] ` : ''}Shift ${shift.shiftId.substring(0, 6)}... has discrepancy of $${shift.discrepancy}`,
        timestamp: new Date(shift.closedAt),
        urgent: true,
        status: 'unread',
      });
    });

    // Float Requests
    const floatRequests = formatRequests(resultData.floatRequests);
    floatRequests.forEach(req => {
      notifications.push({
        id: req._id,
        type: 'float_request',
        title: 'New Float Request',
        message: `${req.locationName ? `[${req.locationName}] ` : ''}Cashier requested $${req.requestedAmount}`,
        timestamp: new Date(req.requestedAt),
        urgent: false,
        status: 'unread',
      });
    });

    // Transform response to match expected structure
    const result = {
      vaultBalance: {
        ...(resultData.vaultBalance || DEFAULT_VAULT_BALANCE),
        // Ensure defaults for required fields in read-only mode
        canClose: false,
        blockReason: 'Global View - Read Only',
        managerOnDuty: 'Global View',
        lastAudit: 'N/A',
        isReconciled: true, // Prevent "Reconciliation Required" warnings
        activeShiftId: 'global-view', // Prevent "Start Shift" warnings
        denominations: resultData.vaultBalance?.denominations || [],
      },
      metrics: resultData.metrics || {
        totalCashIn: 0,
        totalCashOut: 0,
        netCashFlow: 0,
        discrepancies: 0,
        pendingReviews: 0,
      },
      transactions: resultData.transactions || [],
      pendingShifts,
      floatRequests,
      cashDesks: (resultData.cashDesks || []).map(
        (desk: CashDesk) => ({
          ...desk,
          _id: String(desk._id || ''),
          locationName: String(desk.locationName || ''),
          openedAt: desk.openedAt as string | Date,
          openingBalance: Number(desk.openingBalance || 0),
          payoutsTotal: Number(desk.payoutsTotal || 0),
        })
      ),
      notifications,
    };

    return result;
  } catch (error) {
    console.error('Failed to fetch global vault overview data', error);
    throw error;
  }
}

/**
 * Initialize vault for a location (Start Shift)
 */
export async function handleInitializeVault(data: {
  locationId: string;
  openingBalance: number;
  denominations: Denomination[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to initialize vault',
    };
  } catch (error) {
    console.error('Error initializing vault:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Approve a float request
 */
export async function handleFloatAction(
  requestId: string,
  status: 'approved' | 'denied' | 'edited',
  data?: {
    approvedAmount?: number;
    approvedDenominations?: Denomination[];
    vmNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-request/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        status,
        ...data,
      }),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to process float request',
    };
  } catch (error) {
    console.error(`Error processing float ${status}:`, error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Confirm a float request (final receipt)
 */
export async function handleFloatConfirm(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-request/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to confirm float request',
    };
  } catch (error) {
    console.error('Error confirming float:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Direct open cashier shift (Skip request workflow)
 */
export async function handleDirectOpenShift(data: {
  locationId: string;
  cashierId: string;
  amount: number;
  denominations: Denomination[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/cashier-shift/direct-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to open cashier shift',
    };
  } catch (error) {
    console.error('Error opening cashier shift:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Refresh vault balance data
 */
export async function fetchVaultBalance(
  locationId: string
): Promise<VaultBalance | null> {
  try {
    const response = await fetch(`/api/vault/balance?locationId=${locationId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch vault balance', error);
    return null;
  }
}

/**
 * Fetch location details including limits
 */
export async function fetchLocationDetails(locationId: string) {
  try {
    const response = await fetch(`/api/locations/${locationId}?basicInfo=true`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.location;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch location details', error);
    return null;
  }
}

/**
 * Fetch vault transactions for audit trail
 */
export async function fetchAuditTrail(
  locationId: string,
  filters: {
    searchTerm?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }
) {
  try {
    const {
      searchTerm = '',
      type = 'all',
      status = 'all',
      dateFrom = '',
      dateTo = '',
      page = 1,
      limit = 50,
    } = filters;

    let url = `/api/vault/transactions?locationId=${locationId}&page=${page}&limit=${limit}`;
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
    if (type !== 'all') url += `&type=${type}`;
    if (status !== 'all') url += `&status=${status}`;
    if (dateFrom) url += `&startDate=${dateFrom}`;
    if (dateTo) url += `&endDate=${dateTo}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const txs = data.items || data.transactions || [];
        return {
          entries: txs.map((tx: ExtendedVaultTransaction) => {
            const isReconcile = tx.type === 'vault_reconciliation';
            const adj = isReconcile
              ? Number(tx.vaultBalanceAfter || 0) -
                Number(tx.vaultBalanceBefore || 0)
              : Number(tx.amount || 0);

            return {
              id: String(tx._id || ''),
              timestamp: new Date(tx.timestamp).toLocaleString(),
              type: String(tx.type || ''),
              description: String(
                tx.notes || `${String(tx.type || '').replace(/_/g, ' ')}`
              ),
              performedBy: String(
                tx.performedByName || tx.performedBy || 'System'
              ),
              amount: adj,
              isOutflow: isReconcile ? adj < 0 : tx.from?.type === 'vault',
              balanceBefore: Number(tx.vaultBalanceBefore || 0),
              balanceAfter: Number(tx.vaultBalanceAfter || 0),
              location: String(tx.locationId || ''),
              status: tx.isVoid ? 'failed' : 'completed',
            };
          }),
          total: data.total || data.pagination?.total || txs.length,
        };
      }
    }
    return { entries: [], total: 0 };
  } catch (error) {
    console.error('Failed to fetch audit trail', error);
    return { entries: [], total: 0 };
  }
}

/**
 * Fetch advanced dashboard metrics
 */
export async function fetchAdvancedDashboardMetrics(locationId: string) {
  try {
    const [metricsRes, transactionsRes] = await Promise.all([
      fetch(`/api/vault/metrics?locationId=${locationId}`),
      fetch(`/api/vault/transactions?locationId=${locationId}&limit=100`),
    ]);

    if (metricsRes.ok && transactionsRes.ok) {
      const metricsData = await metricsRes.json();
      const transactionsData = await transactionsRes.json();

      if (metricsData.success && transactionsData.success) {
        const { metrics } = metricsData;
        const transactions = transactionsData.transactions;

        // Filter transactions for TODAY (Gaming Day) only
        const rangeStart = metricsData.rangeStart
          ? new Date(metricsData.rangeStart)
          : new Date();
        if (!metricsData.rangeStart) rangeStart.setHours(0, 0, 0, 0);

        const todayTxs = transactions.filter(
          (tx: VaultTransaction) =>
            new Date(tx.timestamp).getTime() >= rangeStart.getTime()
        );

        // Calculate hourly transaction volume for "Peak Hour" and "Transaction Volume" chart
        const hourlyStats = new Array(24).fill(0).map((_, index) => {
          const hour12 = index % 12 || 12;
          const meridiem = index < 12 ? 'AM' : 'PM';
          return {
            time: `${hour12}:00 ${meridiem}`,
            transactions: 0,
            amount: 0,
            cashOut: 0, // Track cash out specific amount
          };
        });

        todayTxs.forEach((tx: VaultTransaction) => {
          // Skip reconciliation and opening transactions for charts/trends
          if (['vault_reconciliation', 'vault_open'].includes(tx.type))
            return;

          const hour = new Date(
            tx.timestamp as string | number | Date
          ).getHours();
          // For balance trend: if it's cash IN (to vault), add. If cash OUT (from vault), subtract.
          // Logic: to.type === 'vault' -> +amount
          //        from.type === 'vault' -> -amount
          // But 'amount' accumulates blindly, so let's check direction
          hourlyStats[hour].transactions++;

          const to = tx.to;
          const from = tx.from;

          if (to?.type === 'vault') {
            hourlyStats[hour].amount += Math.abs(Number(tx.amount || 0));
          } else if (from?.type === 'vault') {
            hourlyStats[hour].amount -= Math.abs(Number(tx.amount || 0));
            hourlyStats[hour].cashOut += Math.abs(Number(tx.amount || 0));
          } else {
            // Fallback if generic
            hourlyStats[hour].amount += Number(tx.amount || 0);
          }
        });

        // Find peak hour
        let peakHourVal = 0;
        let peakHourLabel = 'N/A';
        hourlyStats.forEach(stat => {
          if (stat.transactions > peakHourVal) {
            peakHourVal = stat.transactions;
            peakHourLabel = stat.time;
          }
        });

        // Calculate total Payouts amount (metrics.payouts is a COUNT)
        const totalPayoutsAmount = todayTxs
          .filter((tx: VaultTransaction) => tx.type === 'payout')
          .reduce(
            (sum: number, tx: VaultTransaction) =>
              sum + Math.abs(Number(tx.amount || 0)),
            0
          ); // Ensure positive magnitude

        // Construct trend data based on real daily transactions
        // Start running balance from 0 (or opening balance if we had it, but for trend 0 is baseline)
        let runningBalance = 0;
        let runningCashOut = 0;

        const balanceTrend = hourlyStats
          .filter(
            hourStats =>
              hourStats.transactions > 0 ||
              hourStats.amount > 0 ||
              hourStats.cashOut > 0
          )
          .map(hourStats => {
            runningBalance += hourStats.amount;
            runningCashOut += hourStats.cashOut;
            return {
              time: hourStats.time,
              balance: runningBalance,
              cashOut: runningCashOut,
              transactions: hourStats.transactions,
            };
          });

        const finalTrend =
          balanceTrend.length > 0
            ? balanceTrend
            : [
                {
                  time: '00:00',
                  balance: 0, // Start for graph should typically be flat if no data
                  cashOut: 0,
                  transactions: 0,
                },
                {
                  time: '12:00',
                  balance: 0,
                  cashOut: 0,
                  transactions: 0,
                },
                {
                  time: '23:59',
                  balance: 0,
                  cashOut: 0,
                  transactions: 0,
                },
              ];

        return {
          metrics,
          peakHour: peakHourLabel,
          balanceTrend: finalTrend,
          cashFlowData: [
            { category: 'Cash In', amount: metrics.totalCashIn },
            { category: 'Cash Out', amount: metrics.totalCashOut },
            { category: 'Net Flow', amount: Math.abs(metrics.netCashFlow) },
            { category: 'Payouts', amount: totalPayoutsAmount },
          ],
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch advanced dashboard metrics', error);
    return null;
  }
}

/**
 * Fetch vault transfers data with pagination
 */
export async function fetchVaultTransfers(
  locationId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ transfers: VaultTransfer[]; total: number; totalPages: number }> {
  try {
    const response = await fetch(
      `/api/vault/transfers?locationId=${locationId}&page=${page}&limit=${limit}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          transfers: data.transfers || data.items || [],
          total:
            data.total ||
            data.pagination?.total ||
            (data.transfers || data.items || []).length,
          totalPages: data.pagination?.totalPages || 1,
        };
      }
    }
    return { transfers: [], total: 0, totalPages: 0 };
  } catch (error) {
    console.error('Failed to fetch transfers', error);
    return { transfers: [], total: 0, totalPages: 0 };
  }
}

/**
 * Fetch vault transactions data with pagination
 */
export async function fetchVaultTransactions(
  locationId: string,
  page: number = 1,
  limit: number = 20,
  type?: string,
  status?: string,
  search?: string
): Promise<{
  transactions: ExtendedVaultTransaction[];
  total: number;
  totalPages: number;
}> {
  try {
    let url = `/api/vault/transactions?locationId=${locationId}&page=${page}&limit=${limit}`;
    if (type && type !== 'all') url += `&type=${type}`;
    if (status && status !== 'all') url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const txs = data.items || data.transactions || [];
        return {
          transactions: txs.map((tx: ExtendedVaultTransaction) => ({
            ...tx,
            _id: String(tx._id || ''),
            timestamp: new Date(tx.timestamp),
            performedByName: String(
              tx.performedByName || tx.performedBy || 'System'
            ),
            fromName: String(
              tx.fromName ||
                (tx.from?.type === 'vault'
                  ? 'Vault'
                  : tx.from?.type === 'cashier'
                    ? 'Cashier'
                    : tx.from?.type === 'machine'
                      ? 'Machine'
                      : tx.from?.id || 'External')
            ),
            toName: String(
              tx.toName ||
                (tx.to?.type === 'vault'
                  ? 'Vault'
                  : tx.to?.type === 'cashier'
                    ? 'Cashier'
                    : tx.to?.type === 'machine'
                      ? 'Machine'
                      : tx.to?.id || 'External')
            ),
          })),
          total: data.total || data.pagination?.total || txs.length,
          totalPages:
            data.pagination?.totalPages ||
            Math.ceil((data.total || txs.length) / limit),
        };
      }
    }
    return { transactions: [], total: 0, totalPages: 0 };
  } catch (error) {
    console.error('Failed to fetch transactions', error);
    return { transactions: [], total: 0, totalPages: 0 };
  }
}

/**
 * Fetch end-of-day report data
 */
export async function fetchEndOfDayReportData(
  locationId: string,
  date?: string | Date
) {
  try {
    const dateObj = date
      ? date instanceof Date
        ? date
        : new Date(date)
      : new Date();

    const reportDateStr = dateObj.toISOString().split('T')[0];

    // Fetch EOD Data and Metrics
    const eodPromise = fetch(
      `/api/vault/end-of-day?locationId=${locationId}&date=${reportDateStr}`
    );
    const metricsPromise = fetch(
      `/api/vault/metrics?locationId=${locationId}&date=${reportDateStr}`
    );

    const floatRequestsPromise = fetch(
      `/api/vault/float-request?locationId=${locationId}`
    );

    const [endOfDayResponse, metricsResponse, floatRequestsResponse] =
      await Promise.all([eodPromise, metricsPromise, floatRequestsPromise]);

    const endOfDayData = endOfDayResponse.ok
      ? await endOfDayResponse.json()
      : null;

    const metricsData = metricsResponse.ok
      ? await metricsResponse.json()
      : null;

    const floatRequestsData =
      floatRequestsResponse && floatRequestsResponse.ok
        ? await floatRequestsResponse.json()
        : null;

    // Use data from End-of-Day API if available
    const data = endOfDayData?.data || {};

    // Map Vault Balance
    const vaultBalanceObj = {
      ...DEFAULT_VAULT_BALANCE,
      balance: data.vaultBalance?.systemBalance || 0,
      physicalCount: data.vaultBalance?.physicalCount || 0,
      variance: data.vaultBalance?.variance || 0,
    };

    return {
      denominationBreakdown: data.denominationBreakdown || {},
      vaultBalance: vaultBalanceObj,
      cashierFloats: data.cashierFloats || [],
      midDaySoftCounts: data.midDaySoftCounts || [],
      endOfDaySoftCounts: data.endOfDaySoftCounts || [],
      slotCounts: data.slotCounts || [],
      floatRequests: floatRequestsData?.success
        ? floatRequestsData.data || []
        : [],
      metrics: metricsData?.success ? metricsData.metrics : null,
      shiftStatus: data.shiftStatus || 'not_started',
      previousShiftActive: data.previousShiftActive || false,
      previousShiftDate: data.previousShiftDate,
    };
  } catch (error) {
    console.error('Failed to fetch end-of-day report data:', error);
    throw error;
  }
}

/**
 * Fetch float transactions data from multiple endpoints with pagination
 */
export async function fetchFloatTransactionsData(
  locationId: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const [
      cashierResponse,
      balanceResponse,
      transactionsResponse,
      floatRequestsResponse,
      usersResponse,
    ] = await Promise.all([
      fetch(`/api/cashier/shifts?locationId=${locationId}&status=active`),
      fetch(`/api/vault/balance?locationId=${locationId}`),
      fetch(
        `/api/vault/transactions?locationId=${locationId}&type=float_increase,float_decrease,cashier_shift_open,payout&page=${page}&limit=${limit}`
      ),
      fetch(`/api/vault/float-request?locationId=${locationId}`),
      fetch(`/api/users?role=cashier`),
    ]);

    const cashierData = cashierResponse.ok
      ? await cashierResponse.json()
      : null;
    const balanceData = balanceResponse.ok
      ? await balanceResponse.json()
      : null;
    const transactionsData = transactionsResponse.ok
      ? await transactionsResponse.json()
      : null;
    const floatRequestsData = floatRequestsResponse.ok
      ? await floatRequestsResponse.json()
      : null;
    const usersData = usersResponse.ok ? await usersResponse.json() : null;

    // Create user map for name resolution
    const userMap = new Map<string, string>();
    if (usersData?.success && Array.isArray(usersData.users)) {
      usersData.users.forEach(
        (userItem: { _id?: unknown; username?: unknown }) => {
          if (userItem._id && userItem.username) {
            userMap.set(String(userItem._id), String(userItem.username));
          }
        }
      );
    }

    const result: {
      cashierFloats: CashierFloat[];
      vaultBalance: VaultBalance;
      floatTransactions: ExtendedVaultTransaction[];
      floatRequests: FloatRequest[];
      totalTransactions: number;
      totalPages: number;
    } = {
      cashierFloats: DEFAULT_CASHIER_FLOATS,
      vaultBalance: DEFAULT_VAULT_BALANCE,
      floatTransactions: [],
      floatRequests: [],
      totalTransactions: 0,
      totalPages: 0,
    };

    // Process cashier data
    if (cashierData?.success) {
      result.cashierFloats = (cashierData.shifts || []).map(
        (shift: CashierShift) => ({
          ...shift,
          cashierName: String(
            shift.cashierName ||
              shift.cashierUsername ||
              `Cashier ${String(shift.cashierId || '').substring(0, 4)}`
          ),
          balance: Number(shift.currentBalance ?? shift.openingBalance ?? 0),
          status: String(shift.status || 'active'),
        })
      ) as CashierFloat[];
    } else {
      result.cashierFloats = DEFAULT_CASHIER_FLOATS;
    }

    // Process balance data
    if (balanceData?.success) {
      result.vaultBalance = balanceData.data || DEFAULT_VAULT_BALANCE;
    }

    // Process transactions data
    if (transactionsData?.success) {
      // Still apply a safe filter in case the API didn't handle the multi-type param
      const floatTypes = [
        'float_increase',
        'float_decrease',
        'cashier_shift_open',
        'payout',
      ];
      const floatTxs = (
        transactionsData.items ||
        transactionsData.transactions ||
        []
      )
        .filter((tx: ExtendedVaultTransaction) =>
          floatTypes.includes(tx.type)
        )
        .map((tx: ExtendedVaultTransaction) => {
          // Resolve names
          let toName = tx.toName;
          if (!toName && tx.to?.type === 'cashier' && tx.to?.id) {
            toName = userMap.get(tx.to.id) || tx.to.id;
          }

          let fromName = tx.fromName;
          if (!fromName && tx.from?.type === 'cashier' && tx.from?.id) {
            fromName = userMap.get(tx.from.id) || tx.from.id;
          }

          return {
            ...tx,
            toName,
            fromName,
            timestamp: new Date(tx.timestamp), // Ensure date object
            performedByName: String(
              tx.performedByName ||
                userMap.get(String(tx.performedBy || '')) ||
                tx.performedBy ||
                'System'
            ),
          };
        });

      result.floatTransactions = floatTxs;
      result.totalTransactions =
        transactionsData.pagination?.total || transactionsData.total || 0;
      result.totalPages = transactionsData.pagination?.totalPages || 1;
    }

    // Process float requests data
    if (floatRequestsData?.success) {
      result.floatRequests = floatRequestsData.data || [];
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch float transactions data:', error);
    throw error;
  }
}

/**
 * Fetch cashiers data with pagination
 */
export async function fetchCashiersData(
  page: number = 1,
  limit: number = 20,
  search?: string,
  sortConfig?: { key: string; direction: 'ascending' | 'descending' },
  varianceFilter: 'all' | 'variance' | 'no-variance' = 'all'
): Promise<{ users: Cashier[]; total: number; totalPages: number }> {
  try {
    let url = `/api/users?role=cashier&page=${page}&limit=${limit}`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    if (varianceFilter !== 'all') {
      url += `&variance=${varianceFilter}`;
    }

    // Since the API might not support direct sort params yet,
    // we handle sorting client-side or pass if API supports it.
    // Assuming backend might not fully support dynamic sort key yet based on API analysis,
    // but passing common ones is safe if backend ignores them.
    // For now we'll stick to search and filter.

    // Include authentication cookies for authorization
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const users = data.users;

        // Client-side sorting as a fallback/enhancement if API doesn't handle it
        if (sortConfig && users.length > 0) {
          users.sort(
            (a: Cashier, b: Cashier) => {
              let valA: string | number = '';
              let valB: string | number = '';

              // Handle nested profile fields
              if (sortConfig.key === 'name') {
                valA = `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`;
                valB = `${b.profile?.firstName || ''} ${b.profile?.lastName || ''}`;
              } else if (sortConfig.key === 'email') {
                // Handle email field mismatch
                valA = a.emailAddress || '';
                valB = b.emailAddress || '';
              } else {
                const key = sortConfig.key as keyof Cashier;
                valA = String(a[key] ?? '');
                valB = String(b[key] ?? '');
              }

              const strA: string | number =
                typeof valA === 'number' ? valA : String(valA ?? '');
              const strB: string | number =
                typeof valB === 'number' ? valB : String(valB ?? '');

              if (strA < strB)
                return sortConfig.direction === 'ascending' ? -1 : 1;
              if (strA > strB)
                return sortConfig.direction === 'ascending' ? 1 : -1;
              return 0;
            }
          );
        }

        return {
          users: users,
          total: data.pagination?.total || data.users.length,
          totalPages: data.pagination?.totalPages || 1,
        };
      }
    }
    return { users: [], total: 0, totalPages: 0 };
  } catch (error) {
    console.error('Failed to fetch cashiers:', error);
    throw error;
  }
}

/**
 * Handle delete cashier operation
 */
export async function handleDeleteCashier(
  cashierId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: cashierId }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || data.message || 'Failed to delete cashier',
    };
  } catch (error) {
    console.error('Error deleting cashier:', error);
    return {
      success: false,
      error: 'An error occurred while deleting cashier',
    };
  }
}

/**
 * Handle update cashier status operation (Enable/Disable)
 */
export async function handleUpdateCashierStatus(
  cashierId: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/users/${cashierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || data.message || 'Failed to update cashier status',
    };
  } catch (error) {
    console.error('Error updating cashier status:', error);
    return {
      success: false,
      error: 'An error occurred while updating cashier status',
    };
  }
}

// ============================================================================
// Event Handler Functions
// ============================================================================

/**
 * Handle add cash operation
 */
export async function handleAddCash(data: {
  source: string;
  breakdown: {
    hundred: number;
    fifty: number;
    twenty: number;
    ten: number;
    five: number;
    one: number;
  };
  totalAmount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const denominations = [
      { denomination: 100, quantity: data.breakdown.hundred },
      { denomination: 50, quantity: data.breakdown.fifty },
      { denomination: 20, quantity: data.breakdown.twenty },
      { denomination: 10, quantity: data.breakdown.ten },
      { denomination: 5, quantity: data.breakdown.five },
      { denomination: 1, quantity: data.breakdown.one },
    ].filter(denomination => denomination.quantity > 0);

    const response = await fetch('/api/vault/add-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: data.source,
        amount: data.totalAmount,
        denominations,
        notes: data.notes,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to add cash',
    };
  } catch (error) {
    console.error('Error adding cash:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle remove cash operation
 */
export async function handleRemoveCash(data: {
  destination: string;
  breakdown: {
    hundred: number;
    fifty: number;
    twenty: number;
    ten: number;
    five: number;
    one: number;
  };
  totalAmount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const denominations = [
      { denomination: 100, quantity: data.breakdown.hundred },
      { denomination: 50, quantity: data.breakdown.fifty },
      { denomination: 20, quantity: data.breakdown.twenty },
      { denomination: 10, quantity: data.breakdown.ten },
      { denomination: 5, quantity: data.breakdown.five },
      { denomination: 1, quantity: data.breakdown.one },
    ].filter(denomination => denomination.quantity > 0);

    const response = await fetch('/api/vault/remove-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: data.destination,
        amount: data.totalAmount,
        denominations,
        notes: data.notes,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to remove cash',
    };
  } catch (error) {
    console.error('Error removing cash:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle record expense operation
 */
/**
 * Handle record expense operation
 */
export async function handleRecordExpense(data: {
  category: string;
  amount: number;
  description: string;
  date: Date;
  denominations?: Denomination[];
  file?: File;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('amount', data.amount.toString());
    formData.append('description', data.description);
    formData.append('date', data.date.toISOString());

    if (data.denominations && data.denominations.length > 0) {
      formData.append('denominations', JSON.stringify(data.denominations));
    }

    if (data.file) {
      formData.append('file', data.file);
    }

    const response = await fetch('/api/vault/expense', {
      method: 'POST',
      body: formData,
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to record expense',
    };
  } catch (error) {
    console.error('Error recording expense:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle vault reconcile operation
 */
export async function handleReconcile(
  data: {
    newBalance: number;
    denominations: Denomination[];
    reason: string;
    comment: string;
  },
  vaultShiftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!vaultShiftId) {
      return { success: false, error: 'No active vault shift found' };
    }

    const response = await fetch('/api/vault/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultShiftId,
        newBalance: data.newBalance,
        denominations: data.denominations,
        reason: data.reason,
        comment: data.comment,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to reconcile',
    };
  } catch (error) {
    console.error('Error reconciling:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle shift resolution
 */
export async function handleShiftResolve(
  shiftId: string,
  finalBalance: number,
  auditComment: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/cashier/shift/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId,
        finalBalance,
        auditComment,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to resolve shift',
    };
  } catch (error) {
    console.error('Error resolving shift:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle inter-location transfer submission
 */
export async function handleTransferSubmit(
  fromLocation: string,
  toLocation: string,
  amount: number,
  denominations: Denomination[],
  notes?: string
): Promise<{
  success: boolean;
  error?: string;
  transfer?: InterLocationTransfer;
}> {
  try {
    const response = await fetch('/api/vault/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromLocationId: fromLocation,
        toLocationId: toLocation,
        amount,
        denominations,
        notes,
      }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to submit transfer',
      transfer: data.transfer,
    };
  } catch (error) {
    console.error('Error submitting transfer:', error);
    return {
      success: false,
      error: 'An error occurred while submitting transfer',
    };
  }
}

/**
 * Handle approve transfer action
 */
export async function handleApproveTransfer(
  transferId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transfers/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId, approved: true }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to approve transfer',
    };
  } catch (error) {
    console.error('Error approving transfer:', error);
    return {
      success: false,
      error: 'An error occurred while approving transfer',
    };
  }
}

/**
 * Handle reject transfer action
 */
export async function handleRejectTransfer(
  transferId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transfers/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId, approved: false }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to reject transfer',
    };
  } catch (error) {
    console.error('Error rejecting transfer:', error);
    return {
      success: false,
      error: 'An error occurred while rejecting transfer',
    };
  }
}

/**
 * Handle issue float operation
 */
export async function handleIssueFloat(
  cashierId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-increase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierId,
        amount,
        notes,
      }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to issue float',
    };
  } catch (error) {
    console.error('Error issuing float:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle receive float operation
 */
export async function handleReceiveFloat(
  cashierId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-decrease', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierId,
        amount,
        notes,
      }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to receive float',
    };
  } catch (error) {
    console.error('Error receiving float:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle approve float transaction
 */
export async function handleApproveFloatTransaction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transactions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, approved: true }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to approve transaction',
    };
  } catch (error) {
    console.error('Error approving transaction:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle reject float transaction
 */
export async function handleRejectFloatTransaction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transactions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, approved: false }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to reject transaction',
    };
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle create cashier operation
 *
 * @param cashierData - Object containing cashier details
 * @param cashierData.firstName - Cashier's first name
 * @param cashierData.lastName - Cashier's last name
 * @param cashierData.email - Cashier's email address
 * @param cashierData.password - Optional password (auto-generated if not provided)
 * @param cashierData.assignedLicencees - Optional array of licencee IDs
 * @param cashierData.assignedLocations - Optional array of location IDs
 * @returns Promise with success status, error message, and temporary password if successful
 */
export async function handleCreateCashier(cashierData: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  assignedLicencees?: string[];
  assignedLocations?: string[];
}): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  let data;
  let tempPassword = '';
  try {
    // Generate a temporary password if not provided
    tempPassword = cashierData.password || generateTempPassword();

    const firstName = cashierData.firstName;
    const lastName = cashierData.lastName;
    const username = cashierData.username;

    const response = await fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        emailAddress: cashierData.email,
        password: tempPassword,
        tempPassword: tempPassword, // Store plain text temp password
        roles: ['cashier'],
        profile: {
          firstName,
          lastName,
        },
        assignedLicencees: cashierData.assignedLicencees || [],
        assignedLocations: cashierData.assignedLocations || [],
        isEnabled: true,
      }),
    });

    data = await response.json();
  } catch (error) {
    console.error('Error creating cashier:', error);
    return {
      success: false,
      error: 'An error occurred while creating cashier',
    };
  }

  return {
    success: data.success,
    error: data.error || data.message || 'Failed to create cashier',
    tempPassword: data.success ? tempPassword : undefined,
  };
}

/**
 * Handle reset cashier password operation
 */
export async function handleResetCashierPassword(
  cashierId: string
): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  try {
    const response = await fetch('/api/admin/cashiers/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashierId }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to reset password',
      tempPassword: data.tempPassword,
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    return {
      success: false,
      error: 'An error occurred while resetting password',
    };
  }
}

// Utility functions (calculateEndOfDayMetrics, sortTransfers, getTransactionTypeBadge, etc.)
// are now exported from lib/helpers/vault/vaultCalculationHelpers.ts
