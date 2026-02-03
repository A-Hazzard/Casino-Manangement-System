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
    CashierFloat,
    CashierShift,
    Denomination,
    FloatRequest,
    UnbalancedShiftInfo,
    VaultBalance,
    VaultMetrics,
    VaultTransaction,
} from '@/shared/types/vault';

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
      fetch(`/api/vault/transactions?locationId=${locationId}&limit=10`),
      fetch(
        `/api/cashier/shifts?status=pending_review&locationId=${locationId}`
      ),
      fetch(`/api/cashier/shifts?status=active&locationId=${locationId}`),
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
          managerOnDuty: username || 'Loading...',
          lastAudit: data.data.lastReconciliation
            ? new Date(data.data.lastReconciliation).toLocaleString()
            : 'Never',
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
      if (data.success) {
        const formattedShifts: UnbalancedShiftInfo[] = data.shifts.map(
          (shift: CashierShift) => ({
            shiftId: shift._id,
            cashierId: shift.cashierId,
            cashierName: shift.cashierName || shift.cashierUsername || `Cashier ${shift.cashierId.substring(0, 4)}`,
            expectedBalance: shift.expectedClosingBalance || 0,
            enteredBalance: shift.cashierEnteredBalance || 0,
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
            locationId: shift.locationId,
            name: shift.cashierName || shift.cashierUsername || `Cashier ${shift.cashierId.substring(0, 4)}`,
            cashierName: shift.cashierName || shift.cashierUsername || `Cashier ${shift.cashierId.substring(0, 4)}`,
            balance: shift.currentBalance ?? shift.openingBalance,
            denominations: shift.lastSyncedDenominations ?? shift.openingDenominations, // Pass sync'd denominations for active shifts
            lastAudit: new Date(shift.openedAt).toISOString(),
            status: 'active',
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
          entries: txs.map((tx: any) => ({
            id: tx._id,
            timestamp: new Date(tx.timestamp).toLocaleString(),
            type: tx.type,
            description: tx.notes || `${tx.type.replace(/_/g, ' ')}`,
            performedBy: tx.performedByName || tx.performedBy || 'System',
            amount: tx.amount,
            location: tx.locationId,
            status: tx.isVoid ? 'failed' : 'completed',
          })),
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

        // Calculate hourly transaction volume for "Peak Hour" and "Transaction Volume" chart
        const hourlyStats = new Array(24).fill(0).map((_, i) => ({
          time: `${i.toString().padStart(2, '0')}:00`,
          transactions: 0,
          amount: 0,
        }));

        transactions.forEach((tx: any) => {
          const hour = new Date(tx.timestamp).getHours();
          hourlyStats[hour].transactions++;
          hourlyStats[hour].amount += tx.amount;
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

        // Construct trend data based on real daily transactions
        let runningBalance = metrics.totalCashIn * 0.5;
        const balanceTrend = hourlyStats
          .filter(h => h.transactions > 0 || h.amount > 0)
          .map(h => {
            runningBalance += h.amount;
            return {
              time: h.time,
              balance: runningBalance,
              transactions: h.transactions,
            };
          });

        const finalTrend =
          balanceTrend.length > 0
            ? balanceTrend
            : [
                {
                  time: '00:00',
                  balance: metrics.totalCashIn,
                  transactions: 0,
                },
                {
                  time: '12:00',
                  balance: metrics.totalCashIn,
                  transactions: 0,
                },
                {
                  time: '23:59',
                  balance: metrics.totalCashIn,
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
): Promise<{ transfers: any[]; total: number; totalPages: number }> {
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
): Promise<{ transactions: any[]; total: number; totalPages: number }> {
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
          transactions: txs.map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp),
            performedByName: tx.performedByName || tx.performedBy || 'System',
            fromName:
              tx.fromName ||
              (tx.from.type === 'vault'
                ? 'Vault'
                : tx.from.type === 'cashier'
                  ? 'Cashier'
                  : tx.from.type === 'machine'
                    ? `Machine ${tx.from.id}`
                    : tx.from.id || 'External'),
            toName:
              tx.toName ||
              (tx.to.type === 'vault'
                ? 'Vault'
                : tx.to.type === 'cashier'
                  ? 'Cashier'
                  : tx.to.id || 'External'),
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
export async function fetchEndOfDayReportData(locationId: string) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const [
      endOfDayResponse,
      balanceResponse,
      cashierResponse,
      floatRequestsResponse,
      metricsResponse,
    ] = await Promise.all([
      fetch(`/api/vault/end-of-day?locationId=${locationId}&date=${date}`),
      fetch(`/api/vault/balance?locationId=${locationId}`),
      fetch(`/api/cashier/shifts?locationId=${locationId}&status=active`),
      fetch(`/api/vault/float-request?locationId=${locationId}`),
      fetch(`/api/vault/metrics?locationId=${locationId}`),
    ]);

    const endOfDayData = endOfDayResponse.ok
      ? await endOfDayResponse.json()
      : null;
    const balanceData = balanceResponse.ok
      ? await balanceResponse.json()
      : null;
    const cashierData = cashierResponse.ok
      ? await cashierResponse.json()
      : null;
    const floatRequestsData = floatRequestsResponse.ok
      ? await floatRequestsResponse.json()
      : null;
    const metricsData = metricsResponse.ok
      ? await metricsResponse.json()
      : null;

    // Map machineMoneyIn from balance provider if available
    const slotCounts = balanceData?.success && balanceData.data?.machineMoneyIn !== undefined
      ? [{ 
          machineId: 'All Floor Machines', 
          location: 'Main Floor', 
          closingCount: balanceData.data.machineMoneyIn 
        }]
      : [];

    const denominationBreakdown: Record<string, number> =
      endOfDayData?.success && endOfDayData.data?.denominationBreakdown
        ? endOfDayData.data.denominationBreakdown
        : {};

    return {
      denominationBreakdown,
      vaultBalance: balanceData?.success
        ? balanceData.data
        : DEFAULT_VAULT_BALANCE,
      cashierFloats: cashierData?.success ? cashierData.shifts || [] : [],
      slotCounts: slotCounts,
      floatRequests: floatRequestsData?.success
        ? floatRequestsData.data || []
        : [],
      metrics: metricsData?.success ? metricsData.metrics : null,
    };
  } catch (error) {
    console.error('Failed to fetch end-of-day report data:', error);
    throw error;
  }
}

/**
 * Fetch cash on premises data from multiple endpoints
 */
export async function fetchCashOnPremisesData(locationId: string) {
  try {
    const [cashMonitoringResponse, balanceResponse, cashierResponse] =
      await Promise.all([
        fetch(`/api/vault/cash-monitoring?locationId=${locationId}`),
        fetch(`/api/vault/balance?locationId=${locationId}`),
        fetch(`/api/cashier/shifts?locationId=${locationId}&status=active`),
      ]);

    const result: {
      cashData: {
        totalCash: number;
        denominationBreakdown: Record<string, number>;
      };
      vaultBalance: any;
      cashierFloats: CashierFloat[];
    } = {
      cashData: {
        totalCash: 0,
        denominationBreakdown: {},
      },
      vaultBalance: DEFAULT_VAULT_BALANCE,
      cashierFloats: DEFAULT_CASHIER_FLOATS,
    };

    // Process cash monitoring data
    if (cashMonitoringResponse.ok) {
      const data = await cashMonitoringResponse.json();
      if (data.success) {
        result.cashData = data.data;
      }
    }

    // Process balance data
    if (balanceResponse.ok) {
      const data = await balanceResponse.json();
      if (data.success) {
        result.vaultBalance = data.data || DEFAULT_VAULT_BALANCE;
      }
    }

    // Process cashier data
    if (cashierResponse.ok) {
      const data = await cashierResponse.json();
      if (data.success) {
        result.cashierFloats = data.shifts || DEFAULT_CASHIER_FLOATS;
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch cash on premises data:', error);
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
    ] = await Promise.all([
      fetch(`/api/cashier/shifts?locationId=${locationId}&status=active`),
      fetch(`/api/vault/balance?locationId=${locationId}`),
      fetch(
        `/api/vault/transactions?locationId=${locationId}&page=${page}&limit=${limit}`
      ),
      fetch(`/api/vault/float-request?locationId=${locationId}`),
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

    const result: {
      cashierFloats: CashierFloat[];
      vaultBalance: any;
      floatTransactions: any[];
      floatRequests: any[];
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
      result.cashierFloats = cashierData.shifts || DEFAULT_CASHIER_FLOATS;
    }

    // Process balance data
    if (balanceData?.success) {
      result.vaultBalance = balanceData.data || DEFAULT_VAULT_BALANCE;
    }

    // Process transactions data
    if (transactionsData?.success) {
      // Filter for float-related transactions only
      const floatTxs = (transactionsData.transactions || []).filter((tx: any) =>
        ['float_increase', 'float_decrease'].includes(tx.type)
      );
      result.floatTransactions = floatTxs;
      result.totalTransactions = transactionsData.pagination?.total || 0;
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
  limit: number = 20
): Promise<{ users: any[]; total: number; totalPages: number }> {
  try {
    // Include authentication cookies for authorization
    const response = await fetch(
      `/api/users?role=cashier&page=${page}&limit=${limit}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          users: data.users,
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

// ============================================================================
// Event Handler Functions
// ============================================================================

/**
 * Handle add cash operation
 */
export async function handleAddCash(
  data: {
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
  },
  _locationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const denominations = [
      { denomination: 100, quantity: data.breakdown.hundred },
      { denomination: 50, quantity: data.breakdown.fifty },
      { denomination: 20, quantity: data.breakdown.twenty },
      { denomination: 10, quantity: data.breakdown.ten },
      { denomination: 5, quantity: data.breakdown.five },
      { denomination: 1, quantity: data.breakdown.one },
    ].filter(d => d.quantity > 0);

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
export async function handleRemoveCash(
  data: {
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
  },
  _locationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const denominations = [
      { denomination: 100, quantity: data.breakdown.hundred },
      { denomination: 50, quantity: data.breakdown.fifty },
      { denomination: 20, quantity: data.breakdown.twenty },
      { denomination: 10, quantity: data.breakdown.ten },
      { denomination: 5, quantity: data.breakdown.five },
      { denomination: 1, quantity: data.breakdown.one },
    ].filter(d => d.quantity > 0);

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
export async function handleRecordExpense(
  data: {
    category: string;
    amount: number;
    description: string;
    date: Date;
    denominations?: Denomination[];
    file?: File;
  },
  _locationId: string
): Promise<{ success: boolean; error?: string }> {
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
    denominations: any[];
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
): Promise<{ success: boolean; error?: string; transfer?: any }> {
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
 * @param cashierData.assignedLicensees - Optional array of licensee IDs
 * @param cashierData.assignedLocations - Optional array of location IDs
 * @returns Promise with success status, error message, and temporary password if successful
 */
export async function handleCreateCashier(cashierData: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  assignedLicensees?: string[];
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
          assignedLicensees: cashierData.assignedLicensees || [],
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
 * Generate a temporary password
 */
function generateTempPassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate end-of-day metrics
 */
export function calculateEndOfDayMetrics(reportData: {
  denominationBreakdown: Record<string, number>;
  slotCounts: any[];
  cashierFloats: any[];
  vaultBalance: any;
  floatRequests: any[];
  metrics?: any;
}) {
  const {
    denominationBreakdown,
    slotCounts,
    cashierFloats,
    vaultBalance,
    floatRequests,
    metrics,
  } = reportData;

  // Process denomination breakdown (calculate total value)
  const totalDenominationValue = Object.entries(denominationBreakdown).reduce(
    (sum, [denom, count]) => sum + Number(denom) * count,
    0
  );

  const totalDenominationCount = Object.values(denominationBreakdown).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalMachineBalance = slotCounts.reduce(
    (sum, m) => sum + (m.closingCount || 0),
    0
  );

  const totalCashDeskFloat = cashierFloats.reduce(
    (sum, f) => sum + (f.balance || 0),
    0
  );

  const systemBalance = vaultBalance?.balance || 0;
  const physicalCount = totalDenominationValue;
  const variance = systemBalance - physicalCount;

  // Real calculation for inflows/outflows comes from metrics if available
  const totalInflows = metrics?.totalCashIn || systemBalance;
  const totalOutflows = metrics?.totalCashOut || 0;
  const totalExpenses = metrics?.expenses || 0;
  const totalPayouts = metrics?.payouts || 0;
  const floatRequestsCount = floatRequests.length;

  const totalOnPremises =
    systemBalance + totalMachineBalance + totalCashDeskFloat;

  return {
    totalDenominationValue,
    totalDenominationCount,
    totalMachineBalance,
    totalCashDeskFloat,
    systemBalance,
    physicalCount,
    variance,
    totalOnPremises,
    totalInflows,
    totalOutflows,
    totalExpenses,
    totalPayouts,
    floatRequestsCount,
  };
}

/**
 * Get transaction type badge component
 */
export function getTransactionTypeBadge(type: string) {
  if (type === 'machine_collection') {
    return {
      label: 'Inflow',
      className: 'bg-button text-white hover:bg-button/90',
      icon: 'arrow-up',
    };
  }
  if (
    type === 'float_increase' ||
    type === 'float_decrease' ||
    type === 'payout'
  ) {
    return {
      label: 'Outflow',
      className: 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90',
      icon: 'arrow-down',
    };
  }
  if (type === 'expense') {
    return {
      label: 'Expense',
      className: 'bg-red-600 text-white hover:bg-red-600/90',
      icon: 'receipt',
    };
  }
  return {
    label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    className: '',
    icon: null,
  };
}

/**
 * Filter and sort transactions
 */
export function filterAndSortTransactions(
  transactions: any[],
  searchTerm: string,
  selectedType: string,
  selectedStatus: string,
  sortOption: string,
  sortOrder: 'asc' | 'desc'
) {
  // First filter
  const filtered = transactions.filter((tx: any) => {
    const matchesSearch =
      searchTerm === '' ||
      tx.performedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.fromName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || tx.type === selectedType;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'completed' && !tx.isVoid) ||
      (selectedStatus === 'voided' && tx.isVoid);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Then sort
  return [...filtered].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortOption) {
      case 'date':
        aValue = a.timestamp.getTime();
        bValue = b.timestamp.getTime();
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'amount':
        aValue = Math.abs(a.amount);
        bValue = Math.abs(b.amount);
        break;
      case 'user':
        aValue = a.performedByName?.toLowerCase() || '';
        bValue = b.performedByName?.toLowerCase() || '';
        break;
      case 'status':
        aValue = !a.isVoid ? 'completed' : 'voided';
        bValue = !b.isVoid ? 'completed' : 'voided';
        break;
      case 'source':
        aValue = (a.fromName || '').toLowerCase();
        bValue = (b.fromName || '').toLowerCase();
        break;
      case 'destination':
        aValue = (a.toName || '').toLowerCase();
        bValue = (b.toName || '').toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Sort transfers
 */
export function sortTransfers(
  transfers: any[],
  sortOption: string,
  sortOrder: 'asc' | 'desc'
) {
  return [...transfers].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortOption) {
      case 'date':
        aValue = new Date(a.date || a.createdAt || '').getTime();
        bValue = new Date(b.date || b.createdAt || '').getTime();
        break;
      case 'from':
        aValue = (a.from || '').toLowerCase();
        bValue = (b.from || '').toLowerCase();
        break;
      case 'to':
        aValue = (a.to || '').toLowerCase();
        bValue = (b.to || '').toLowerCase();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'initiatedBy':
        aValue = (a.initiatedBy || '').toLowerCase();
        bValue = (b.initiatedBy || '').toLowerCase();
        break;
      case 'approvedBy':
        aValue = (a.approvedBy || '').toLowerCase();
        bValue = (b.approvedBy || '').toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Handle PDF export (placeholder)
 */
export function handleExportPDF() {
  console.log('PDF export will be implemented');
}

/**
 * Handle CSV export (placeholder)
 */
export function handleExportCSV() {
  console.log('CSV export will be implemented');
}

/**
 * Handle print (placeholder)
 */
export function handlePrint() {
  console.log('Print functionality will be implemented');
}

/**
 * Format notification click actions
 */
export function handleNotificationClick(notification: NotificationItem) {
  switch (notification.type) {
    case 'shift_review':
      console.log('Navigate to shift review:', notification);
      break;
    case 'float_request':
      console.log('Navigate to float requests:', notification);
      break;
    default:
      console.log('Unknown notification type:', notification);
  }
}
