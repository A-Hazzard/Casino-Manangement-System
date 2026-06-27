/**
 * Vault Data Fetching Helpers
 *
 * API fetching functions for vault overview, balance, metrics, transactions,
 * transfers, cashiers, end-of-day reports, and audit trail data.
 *
 * Features:
 * - Vault overview and global overview data fetching
 * - Vault balance, metrics, and advanced dashboard metrics
 * - Transaction, transfer, and float transaction history fetching
 * - End-of-day report data aggregation
 * - Cashier data with pagination and sorting
 * - Audit trail with search/filter capabilities
 * - Location details and vault initialization
 *
 * @module lib/helpers/vault/vaultDataFetching
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
  UnbalancedShiftInfo,
  VaultBalance,
  VaultMetrics,
  VaultTransaction,
  VaultTransfer,
} from '@/shared/types/vault';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';

// ============================================================================
// Vault Overview Data
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

    if (metricsRes.ok) {
      const data = await metricsRes.json();
      if (data.success) {
        result.metrics = data.metrics;
      }
    }

    if (transactionsRes.ok) {
      const data = await transactionsRes.json();
      if (data.success) {
        result.transactions = data.transactions;
      }
    }

    // Pending Shifts and Notifications
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

        formattedShifts.forEach(shift => {
          newNotifications.push({
            id: `review-${shift.shiftId}`,
            type: 'shift_review',
            title: 'Shift Review Required',
            message: `Shift ${shift.shiftId} has a discrepancy of ${formatCurrencyWithCodeString(shift.discrepancy, 'USD')}`,
            timestamp: shift.closedAt,
            urgent: true,
            status: 'unread',
          });
        });
      }
    }

    if (activeShiftsRes.ok) {
      const data = await activeShiftsRes.json();
      if (data.success) {
        const activeDesks: CashDesk[] = data.shifts.map(
          (shift: CashierShift) => ({
            _id: shift._id,
            cashierId: shift.cashierId,
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

    if (pendingFloatsRes.ok) {
      const data = await pendingFloatsRes.json();
      if (data.success && Array.isArray(data.requests)) {
        result.floatRequests = data.requests;
        data.requests.forEach((req: FloatRequest) => {
          newNotifications.push({
            id: req._id,
            type: 'float_request',
            title: 'New Float Request',
            message: `Cashier ${req.cashierId.substring(0, 4)} requested ${formatCurrencyWithCodeString(req.requestedAmount, 'USD')}`,
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
    console.error('[fetchVaultOverviewData] Error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// ============================================================================
// Global Vault Overview
// ============================================================================

/**
 * Fetch global vault overview data for admin/developer aggregated view
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
      console.error('[fetchGlobalVaultOverviewData] Fetch failed:', response.statusText);
      throw new Error(
        `Failed to fetch global vault data: ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data.success) {
      console.error('[fetchGlobalVaultOverviewData] Returned error:', data.error);
      throw new Error(data.error || 'Failed to fetch global vault data');
    }

    const resultData = data.data;

    const formatShifts = (shifts: unknown[]): UnbalancedShiftInfo[] => {
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
          locationName: String(shift.locationName || ''),
        };
      });
    };

    const formatRequests = (requests: unknown[]): FloatRequest[] => {
      if (!Array.isArray(requests)) return [];

      return requests.map(req => ({
        ...(req as FloatRequest),
        locationName: (req as FloatRequest & { locationName?: string })
          .locationName as string,
      }));
    };

    const notifications: NotificationItem[] = [];

    const pendingShifts = formatShifts(resultData.pendingShifts);
    pendingShifts.forEach(shift => {
      notifications.push({
        id: `review-${shift.shiftId}`,
        type: 'shift_review',
        title: 'Shift Review Required',
        message: `${shift.locationName ? `[${shift.locationName}] ` : ''}Shift ${shift.shiftId.substring(0, 6)}... has discrepancy of ${formatCurrencyWithCodeString(shift.discrepancy, 'USD')}`,
        timestamp: new Date(shift.closedAt),
        urgent: true,
        status: 'unread',
      });
    });

    const floatRequests = formatRequests(resultData.floatRequests);
    floatRequests.forEach(req => {
      notifications.push({
        id: req._id,
        type: 'float_request',
        title: 'New Float Request',
        message: `${req.locationName ? `[${req.locationName}] ` : ''}Cashier requested ${formatCurrencyWithCodeString(req.requestedAmount, 'USD')}`,
        timestamp: new Date(req.requestedAt),
        urgent: false,
        status: 'unread',
      });
    });

    const result = {
      vaultBalance: {
        ...(resultData.vaultBalance || DEFAULT_VAULT_BALANCE),
        canClose: false,
        blockReason: 'Global View - Read Only',
        managerOnDuty: 'Global View',
        lastAudit: 'N/A',
        isReconciled: true,
        activeShiftId: 'global-view',
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
    console.error('[fetchGlobalVaultOverviewData] Error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// ============================================================================
// Vault Initialization
// ============================================================================

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
    console.error('[handleInitializeVault] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

// ============================================================================
// Vault Balance
// ============================================================================

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
    console.error('[fetchVaultBalance] Error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// ============================================================================
// Location Details
// ============================================================================

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
    console.error('[fetchLocationDetails] Error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// ============================================================================
// Audit Trail
// ============================================================================

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
    console.error('[fetchAuditTrail] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { entries: [], total: 0 };
  }
}

// ============================================================================
// Advanced Dashboard Metrics
// ============================================================================

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

        const rangeStart = metricsData.rangeStart
          ? new Date(metricsData.rangeStart)
          : new Date();
        if (!metricsData.rangeStart) rangeStart.setHours(0, 0, 0, 0);

        const todayTxs = transactions.filter(
          (tx: VaultTransaction) =>
            new Date(tx.timestamp).getTime() >= rangeStart.getTime()
        );

        const hourlyStats = new Array(24).fill(0).map((_, index) => {
          const hour12 = index % 12 || 12;
          const meridiem = index < 12 ? 'AM' : 'PM';
          return {
            time: `${hour12}:00 ${meridiem}`,
            transactions: 0,
            amount: 0,
            cashOut: 0,
          };
        });

        todayTxs.forEach((tx: VaultTransaction) => {
          if (['vault_reconciliation', 'vault_open'].includes(tx.type))
            return;

          const hour = new Date(
            tx.timestamp as string | number | Date
          ).getHours();
          hourlyStats[hour].transactions++;

          const to = tx.to;
          const from = tx.from;

          if (to?.type === 'vault') {
            hourlyStats[hour].amount += Math.abs(Number(tx.amount || 0));
          } else if (from?.type === 'vault') {
            hourlyStats[hour].amount -= Math.abs(Number(tx.amount || 0));
            hourlyStats[hour].cashOut += Math.abs(Number(tx.amount || 0));
          } else {
            hourlyStats[hour].amount += Number(tx.amount || 0);
          }
        });

        let peakHourVal = 0;
        let peakHourLabel = 'N/A';
        hourlyStats.forEach(stat => {
          if (stat.transactions > peakHourVal) {
            peakHourVal = stat.transactions;
            peakHourLabel = stat.time;
          }
        });

        const totalPayoutsAmount = todayTxs
          .filter((tx: VaultTransaction) => tx.type === 'payout')
          .reduce(
            (sum: number, tx: VaultTransaction) =>
              sum + Math.abs(Number(tx.amount || 0)),
            0
          );

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
                  balance: 0,
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
    console.error('[fetchAdvancedDashboardMetrics] Error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// ============================================================================
// Vault Transfers
// ============================================================================

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
    console.error('[fetchVaultTransfers] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { transfers: [], total: 0, totalPages: 0 };
  }
}

// ============================================================================
// Vault Transactions
// ============================================================================

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
    console.error('[fetchVaultTransactions] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { transactions: [], total: 0, totalPages: 0 };
  }
}

// ============================================================================
// End-of-Day Report Data
// ============================================================================

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

    const data = endOfDayData?.data || {};

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
    console.error('[fetchEndOfDayReportData] Error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// ============================================================================
// Float Transactions Data
// ============================================================================

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

    if (balanceData?.success) {
      result.vaultBalance = balanceData.data || DEFAULT_VAULT_BALANCE;
    }

    if (transactionsData?.success) {
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
            timestamp: new Date(tx.timestamp),
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

    if (floatRequestsData?.success) {
      result.floatRequests = floatRequestsData.data || [];
    }

    return result;
  } catch (error) {
    console.error('[fetchFloatTransactionsData] Error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// ============================================================================
// Cashiers Data
// ============================================================================

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

        if (sortConfig && users.length > 0) {
          users.sort(
            (a: Cashier, b: Cashier) => {
              let valA: string | number = '';
              let valB: string | number = '';

              if (sortConfig.key === 'name') {
                valA = `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`;
                valB = `${b.profile?.firstName || ''} ${b.profile?.lastName || ''}`;
              } else if (sortConfig.key === 'email') {
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
    console.error('[fetchCashiersData] Error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
