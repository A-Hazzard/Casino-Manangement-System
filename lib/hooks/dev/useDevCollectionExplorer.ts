/**
 * useDevCollectionExplorer
 *
 * State + data engine for the developer DB explorer (cabinet "Developer Options"
 * tab). Owns the selected model, its schema, date/search filters, batched
 * pagination with search-seek, row selection, and the edit/bulk/delete
 * mutations. Generalises the original meters-only Developer Tools logic to any
 * registry model via /api/dev/collections.
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Type Definitions
// ============================================================================
import type {
  DevCollectionListResponse,
  DevCollectionRecord,
  DevCollectionSchemaResponse,
  DevFieldDescriptor,
  DevModelInfo,
} from '@shared/types/dev';
import type {
  DevCustomDateRange,
  DevSearchMatchMode,
  DevTimePeriod,
  DevFilterClause,
  DevFilterLogic,
  DevQueryMode,
  DevJsonQueryOptions,
} from '@/lib/types/dev/collectionExplorer';
import type {
  DevShellCommandResponse,
} from '@shared/types/dev';
import {
  buildHideSet,
  deriveColumns,
  getNestedValue,
  METER_PREFERRED_ORDER,
} from '@/lib/utils/dev/tableColumns';

// ============================================================================
// Helper Functions
// ============================================================================
const DISPLAY_PAGE_SIZE = 20;
const API_BATCH_SIZE = 100;

function getDateRange(period: DevTimePeriod): {
  startDate?: Date;
  endDate?: Date;
} {
  const now = new Date();
  if (period === 'All Time') return {};
  if (period === 'Today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: now };
  }
  if (period === 'Yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  if (period === '7d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { startDate: start, endDate: now };
  }
  if (period === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: now };
  }
  return {};
}

type DevFetchSortLimit = {
  sortField: string;
  sortDir: 'asc' | 'desc';
  limit: number;
  jsonSort: string;
};

function resolveFetchSortAndLimit(
  queryMode: DevQueryMode,
  appliedJsonFilter: string,
  appliedJsonOptions: DevJsonQueryOptions,
  visualSortField: string,
  visualSortDir: 'asc' | 'desc',
  visualLimit: number
): DevFetchSortLimit {
  const hasJsonQuery =
    queryMode === 'json' && appliedJsonFilter.trim().length > 0;
  if (hasJsonQuery) {
    return {
      sortField: '',
      sortDir: 'desc',
      limit: appliedJsonOptions.limit ?? 0,
      jsonSort: appliedJsonOptions.sort?.trim() ?? '',
    };
  }
  return {
    sortField: visualSortField,
    sortDir: visualSortDir,
    limit: visualLimit,
    jsonSort: '',
  };
}

// ============================================================================
// Main Hook
// ============================================================================
export function useDevCollectionExplorer(
  defaultCabinetId?: string,
  _refreshTrigger?: number
) {
  // (unused — accepted for API compatibility with parent component)
  // ==========================================================================
  // Local State — model + schema
  // ==========================================================================
  const [models, setModels] = useState<DevModelInfo[]>([]);
  const [modelKey, setModelKey] = useState<string>('meters');
  const [fields, setFields] = useState<DevFieldDescriptor[]>([]);
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [dateField, setDateField] = useState<string>('');
  const [primaryDateField, setPrimaryDateField] = useState<string>('');

  // ==========================================================================
  // Local State — filters
  // ==========================================================================
  const [timePeriod, setTimePeriod] = useState<DevTimePeriod>('All Time');
  const [customDateRange, setCustomDateRange] = useState<DevCustomDateRange>({});
  const [scopeToCabinet, setScopeToCabinet] = useState<boolean>(false);

  // ==========================================================================
  // Local State — query builder
  // ==========================================================================
  const [filterClauses, setFilterClauses] = useState<DevFilterClause[]>([]);
  const [filterLogic, setFilterLogic] = useState<DevFilterLogic>('and');
  const [querySortField, setQuerySortField] = useState<string>('');
  const [querySortDir, setQuerySortDir] = useState<'asc' | 'desc'>('desc');
  const [queryLimit, setQueryLimit] = useState<number>(500);

  const [appliedFilters, setAppliedFilters] = useState<DevFilterClause[]>([]);
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<DevFilterLogic>('and');
  const [appliedSortField, setAppliedSortField] = useState<string>('');
  const [appliedSortDir, setAppliedSortDir] = useState<'asc' | 'desc'>('desc');
  const [appliedLimit, setAppliedLimit] = useState<number>(0);

  // ==========================================================================
  // Local State — query mode (JSON / Visual / Shell)
  // ==========================================================================
  const [queryMode, setQueryMode] = useState<DevQueryMode>('json');
  const [jsonFilterText, setJsonFilterText] = useState<string>('{}');
  const [jsonOptions, setJsonOptions] = useState<DevJsonQueryOptions>({});
  const [shellCommandText, setShellCommandText] = useState<string>('');
  const [showOptions, setShowOptions] = useState(false);
  const [appliedJsonFilter, setAppliedJsonFilter] = useState<string>('');
  const [appliedJsonOptions, setAppliedJsonOptions] = useState<DevJsonQueryOptions>({});

  // ==========================================================================
  // Local State — search
  // ==========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [searchMatchMode, setSearchMatchMode] =
    useState<DevSearchMatchMode>('contains');
  const [appliedTerm, setAppliedTerm] = useState('');
  const [appliedColumn, setAppliedColumn] = useState('');
  const [appliedMatchMode, setAppliedMatchMode] =
    useState<DevSearchMatchMode>('contains');
  const [matchOrdinal, setMatchOrdinal] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  // ==========================================================================
  // Local State — data + pagination
  // ==========================================================================
  const [records, setRecords] = useState<DevCollectionRecord[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [displayPage, setDisplayPage] = useState(0);
  const [loadedApiPage, setLoadedApiPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Local State — selection + mutation
  // ==========================================================================
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mutating, setMutating] = useState(false);

  // ==========================================================================
  // Refs
  // ==========================================================================
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const jsonFetchGuardRef = useRef(false);

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const columns = useMemo(
    () =>
      deriveColumns(records, {
        preferredOrder: modelKey === 'meters' ? METER_PREFERRED_ORDER : [],
        hide: buildHideSet(primaryDateField),
      }),
    [records, modelKey, primaryDateField]
  );
  const cabinetScopable = Boolean(
    defaultCabinetId && fields.some(field => field.path === 'machine')
  );

  const localOffset = displayPage % (API_BATCH_SIZE / DISPLAY_PAGE_SIZE);
  const displayedRecords = records.slice(
    localOffset * DISPLAY_PAGE_SIZE,
    (localOffset + 1) * DISPLAY_PAGE_SIZE
  );
  const currentBatchDisplayPages = Math.max(
    1,
    Math.ceil(records.length / DISPLAY_PAGE_SIZE)
  );
  const totalDisplayPages =
    total !== null
      ? Math.max(1, Math.ceil(total / DISPLAY_PAGE_SIZE))
      : hasMore
        ? loadedApiPage * (API_BATCH_SIZE / DISPLAY_PAGE_SIZE)
        : (loadedApiPage - 1) * (API_BATCH_SIZE / DISPLAY_PAGE_SIZE) +
          currentBatchDisplayPages;

  // Client-side match map for highlighting the applied search on this page.
  const matchMap = useMemo(() => {
    const term = appliedTerm.toLowerCase();
    if (!term) return null;
    const isMatch = (value: unknown): boolean => {
      if (value == null || typeof value === 'object') return false;
      const str = String(value).toLowerCase();
      return appliedMatchMode === 'exact' ? str === term : str.includes(term);
    };
    const map = new Map<number, Set<string>>();
    for (let rowIndex = 0; rowIndex < displayedRecords.length; rowIndex++) {
      const record = displayedRecords[rowIndex];
      const matchedCols = new Set<string>();
      if (appliedColumn) {
        if (isMatch(getNestedValue(record, appliedColumn))) {
          matchedCols.add(appliedColumn);
        }
      } else {
        for (const col of columns) {
          if (isMatch(getNestedValue(record, col))) matchedCols.add(col);
        }
      }
      if (matchedCols.size > 0) map.set(rowIndex, matchedCols);
    }
    return map;
  }, [displayedRecords, columns, appliedTerm, appliedColumn, appliedMatchMode]);

  const pageIds = useMemo(
    () => displayedRecords.map(record => String(record._id)),
    [displayedRecords]
  );
  const allSelected =
    pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  // ==========================================================================
  // Data Fetching
  // ==========================================================================
  const fetchRecords = useCallback(
    async (
      key: string,
      field: string,
      period: DevTimePeriod,
      custom: DevCustomDateRange,
      scoped: boolean,
      apiPage = 1,
      targetDisplayPage = 0,
      term = '',
      column = '',
      ordinal = 0,
      mode: DevSearchMatchMode = 'contains',
      // Query builder parameters
      clauses: DevFilterClause[] = [],
      logic: DevFilterLogic = 'and',
      sortField = '',
      sortDir: 'asc' | 'desc' = 'desc',
      limit = 0,
      // JSON query parameters
      rawFilter = '',
      jsonProject = '',
      jsonSkip = 0,
      jsonMaxTimeMS = 0,
      jsonSort = ''
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        let range: { startDate?: Date; endDate?: Date } = {};
        if (period === 'Custom') {
          if (custom.from) range.startDate = custom.from;
          if (custom.to) range.endDate = custom.to;
        } else {
          range = getDateRange(period);
        }
        if (range.startDate)
          params.set('startDate', range.startDate.toISOString());
        if (range.endDate) params.set('endDate', range.endDate.toISOString());
        if (field) params.set('dateField', field);
        if (scoped && defaultCabinetId) params.set('machine', defaultCabinetId);
        params.set('apiPage', String(apiPage));
        
        const trimmed = term.trim();
        if (trimmed) {
          params.set('search', trimmed);
          if (column) params.set('searchColumn', column);
          params.set('matchOrdinal', String(ordinal));
          if (mode === 'exact') params.set('matchMode', 'exact');
        }

        // Add query builder filters if any
        if (clauses.length > 0) {
          params.set(
            'filters',
            JSON.stringify(
              clauses.map(c => ({ field: c.field, op: c.op, value: c.value }))
            )
          );
          params.set('filterLogic', logic);
        }
        const trimmedJsonSort = jsonSort.trim();
        if (trimmedJsonSort) {
          params.set('sort', trimmedJsonSort);
        } else if (sortField) {
          params.set('sortField', sortField);
          params.set('sortDir', sortDir);
        }
        if (limit > 0) {
          params.set('limit', String(limit));
        }

        // JSON query params
        if (rawFilter) {
          params.set('rawFilter', rawFilter);
        }
        if (jsonProject) {
          params.set('project', jsonProject);
        }
        if (jsonSkip > 0) {
          params.set('skip', String(jsonSkip));
        }
        if (jsonMaxTimeMS > 0) {
          params.set('maxTimeMS', String(jsonMaxTimeMS));
        }

        const queryString = params.toString();
        console.log('[fetchRecords] URL:', `/api/dev/collections/${key}?${queryString}`);
        const { data } = await axios.get<DevCollectionListResponse>(
          `/api/dev/collections/${key}?${queryString}`
        );
        if (!data.success) {
          setError(data.error || 'API returned failure');
          console.error('[fetchRecords] API error:', data.error);
          return;
        }

        console.log('[fetchRecords] Response:', { total: data.total, count: data.data?.length, apiPage: data.apiPage });
        setRecords(data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setLoadedApiPage(data.apiPage);

        if (trimmed) {
          setMatchCount(data.matchCount ?? 0);
          if (data.matchIndex >= 0) {
            setDisplayPage(Math.floor(data.matchIndex / DISPLAY_PAGE_SIZE));
          } else {
            setDisplayPage(targetDisplayPage);
          }
        } else {
          setDisplayPage(targetDisplayPage);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [defaultCabinetId]
  );

  /** Reloads the current view from page 1, keeping the applied search. */
  const reload = useCallback(() => {
    const extraParams =
      queryMode === 'json' && appliedJsonFilter
        ? { rawFilter: appliedJsonFilter, rawOptions: appliedJsonOptions }
        : { rawFilter: '', rawOptions: {} as DevJsonQueryOptions };
    const { sortField, sortDir, limit, jsonSort } = resolveFetchSortAndLimit(
      queryMode,
      extraParams.rawFilter,
      extraParams.rawOptions,
      appliedSortField,
      appliedSortDir,
      appliedLimit
    );
    fetchRecords(
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      1,
      0,
      appliedTerm,
      appliedColumn,
      0,
      appliedMatchMode,
      appliedFilters,
      appliedFilterLogic,
      sortField,
      sortDir,
      limit,
      extraParams.rawFilter,
      extraParams.rawOptions.project || '',
      extraParams.rawOptions.skip || 0,
      extraParams.rawOptions.maxTimeMS || 0,
      jsonSort
    );
  }, [
    fetchRecords,
    modelKey,
    dateField,
    timePeriod,
    customDateRange,
    scopeToCabinet,
    appliedTerm,
    appliedColumn,
    appliedMatchMode,
    appliedFilters,
    appliedFilterLogic,
    appliedSortField,
    appliedSortDir,
    appliedLimit,
    queryMode,
    appliedJsonFilter,
    appliedJsonOptions,
  ]);

  // ==========================================================================
  // Effects
  // ==========================================================================
  // Load the model list once.
  useEffect(() => {
    axios
      .get<{ success: boolean; models: DevModelInfo[] }>('/api/dev/collections')
      .then(({ data }) => {
        if (data.success) setModels(data.models);
      })
      .catch(() => setModels([]));
  }, []);

  // Load schema whenever the model changes; reset filters/selection to defaults.
  useEffect(() => {
    let cancelled = false;
    setSearchQuery('');
    setSearchColumn('');
    setSelectedIds(new Set());
    setFilterClauses([]);
    setFilterLogic('and');
    setQuerySortField('');
    setQuerySortDir('desc');
    setQueryLimit(500);
    setAppliedFilters([]);
    setAppliedFilterLogic('and');
    setAppliedSortField('');
    setAppliedSortDir('desc');
    setAppliedLimit(0);
    setJsonFilterText('{}');
    setJsonOptions({});
    setShellCommandText('');
    setAppliedJsonFilter('');
    setAppliedJsonOptions({});
    setShowOptions(false);
    axios
      .get<DevCollectionSchemaResponse>(
        `/api/dev/collections/${modelKey}/schema`
      )
      .then(({ data }) => {
        if (cancelled || !data.success) return;
        setFields(data.fields);
        setDateFields(data.dateFields);
        setDateField(data.defaultDateField ?? '');
        setPrimaryDateField(data.defaultDateField ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setFields([]);
        setDateFields([]);
        setDateField('');
        setPrimaryDateField('');
      });
    return () => {
      cancelled = true;
    };
  }, [modelKey]);

  // Context change (model, date field, period, custom range, scope, refresh)
  // reloads the unsearched list and clears any applied search.
  //
  // "Single Filter Source" model:
  //   - JSON mode: user's filter IS the query. Date dropdown changes are ignored
  //     (the user controls everything via their filter).
  //   - Visual mode: date dropdown + time period are the primary time scope.
  useEffect(() => {
    // When applyJsonQuery already initiated the fetch, skip this effect to avoid
    // a race where the effect's call returns unfiltered data.
    if (jsonFetchGuardRef.current) {
      jsonFetchGuardRef.current = false;
      return;
    }

    // JSON mode: user's filter is primary — date dropdown changes don't reset it.
    // The user can include date filters in their JSON if they want date scoping.
    if (queryMode === 'json' && appliedJsonFilter) {
      return;
    }

    setAppliedTerm('');
    setAppliedColumn('');
    setAppliedMatchMode('contains');
    setMatchOrdinal(0);
    setMatchCount(0);
    setSelectedIds(new Set());
    if (timePeriod === 'Custom' && (!customDateRange.from || !customDateRange.to)) {
      return;
    }
    fetchRecords(
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      1,
      0,
      '',
      '',
      0,
      'contains',
      [],
      'and',
      '',
      'desc',
      0
    );
    // Intentionally sparse deps — this effect only reacts to model/date/scope context changes.
    // Explicit actions (applyQuery, applyJsonQuery, runSearch, reload) call fetchRecords directly.
    // NOTE: fetchRecords is intentionally excluded — it would cause an infinite loop. Its
    // identity is stable (empty deps inside useCallback) so this is safe.
  }, [
    modelKey,
    dateField,
    timePeriod,
    customDateRange,
    scopeToCabinet,
    queryMode,
    appliedJsonFilter,
  ]);

  // ==========================================================================
  // Event Handlers — pagination
  // ==========================================================================
  const goToDisplayPage = useCallback(
    (zeroBased: number) => {
      const targetApiPage =
        Math.floor((zeroBased * DISPLAY_PAGE_SIZE) / API_BATCH_SIZE) + 1;
      const extraParams =
        queryMode === 'json' && appliedJsonFilter
          ? { rawFilter: appliedJsonFilter, rawOptions: appliedJsonOptions }
          : { rawFilter: '', rawOptions: {} as DevJsonQueryOptions };
      const { sortField, sortDir, limit, jsonSort } = resolveFetchSortAndLimit(
        queryMode,
        extraParams.rawFilter,
        extraParams.rawOptions,
        appliedSortField,
        appliedSortDir,
        appliedLimit
      );
      if (targetApiPage !== loadedApiPage) {
        fetchRecords(
          modelKey,
          dateField,
          timePeriod,
          customDateRange,
          scopeToCabinet,
          targetApiPage,
          zeroBased,
          appliedTerm,
          appliedColumn,
          matchOrdinal,
          appliedMatchMode,
          appliedFilters,
          appliedFilterLogic,
          sortField,
          sortDir,
          limit,
          extraParams.rawFilter,
          extraParams.rawOptions.project || '',
          extraParams.rawOptions.skip || 0,
          extraParams.rawOptions.maxTimeMS || 0,
          jsonSort
        );
      } else {
        setDisplayPage(zeroBased);
      }
    },
    [
      loadedApiPage,
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      appliedTerm,
      appliedColumn,
      matchOrdinal,
      appliedMatchMode,
      appliedFilters,
      appliedFilterLogic,
      appliedSortField,
      appliedSortDir,
      appliedLimit,
      queryMode,
      appliedJsonFilter,
      appliedJsonOptions,
      fetchRecords,
    ]
  );

  // ==========================================================================
  // Event Handlers — search
  // ==========================================================================
  const runSearch = useCallback(() => {
    const term = searchQuery.trim();
    setAppliedTerm(term);
    setAppliedColumn(searchColumn);
    setAppliedMatchMode(searchMatchMode);
    setMatchOrdinal(0);
    if (!term) setMatchCount(0);
    const extraParams =
      queryMode === 'json' && appliedJsonFilter
        ? { rawFilter: appliedJsonFilter, rawOptions: appliedJsonOptions }
        : { rawFilter: '', rawOptions: {} as DevJsonQueryOptions };
    const { sortField, sortDir, limit, jsonSort } = resolveFetchSortAndLimit(
      queryMode,
      extraParams.rawFilter,
      extraParams.rawOptions,
      appliedSortField,
      appliedSortDir,
      appliedLimit
    );
    fetchRecords(
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      1,
      0,
      term,
      searchColumn,
      0,
      searchMatchMode,
      appliedFilters,
      appliedFilterLogic,
      sortField,
      sortDir,
      limit,
      extraParams.rawFilter,
      extraParams.rawOptions.project || '',
      extraParams.rawOptions.skip || 0,
      extraParams.rawOptions.maxTimeMS || 0,
      jsonSort
    );
  }, [
    searchQuery,
    searchColumn,
    searchMatchMode,
    modelKey,
    dateField,
    timePeriod,
    customDateRange,
    scopeToCabinet,
    appliedFilters,
    appliedFilterLogic,
    appliedSortField,
    appliedSortDir,
    appliedLimit,
    queryMode,
    appliedJsonFilter,
    appliedJsonOptions,
    fetchRecords,
  ]);

  const goToMatch = useCallback(
    (ordinal: number) => {
      if (!appliedTerm || ordinal < 0 || ordinal >= matchCount) return;
      setMatchOrdinal(ordinal);
      const extraParams =
        queryMode === 'json' && appliedJsonFilter
          ? { rawFilter: appliedJsonFilter, rawOptions: appliedJsonOptions }
          : { rawFilter: '', rawOptions: {} as DevJsonQueryOptions };
      const { sortField, sortDir, limit, jsonSort } = resolveFetchSortAndLimit(
        queryMode,
        extraParams.rawFilter,
        extraParams.rawOptions,
        appliedSortField,
        appliedSortDir,
        appliedLimit
      );
      fetchRecords(
        modelKey,
        dateField,
        timePeriod,
        customDateRange,
        scopeToCabinet,
        1,
        0,
        appliedTerm,
        appliedColumn,
        ordinal,
        appliedMatchMode,
        appliedFilters,
        appliedFilterLogic,
        sortField,
        sortDir,
        limit,
        extraParams.rawFilter,
        extraParams.rawOptions.project || '',
        extraParams.rawOptions.skip || 0,
        extraParams.rawOptions.maxTimeMS || 0,
        jsonSort
      );
    },
    [
      appliedTerm,
      appliedColumn,
      appliedMatchMode,
      matchCount,
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      appliedFilters,
      appliedFilterLogic,
      appliedSortField,
      appliedSortDir,
      appliedLimit,
      queryMode,
      appliedJsonFilter,
      appliedJsonOptions,
      fetchRecords,
    ]
  );

  // ==========================================================================
  // Event Handlers — selection
  // ==========================================================================
  const toggleRow = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const everySelected =
        pageIds.length > 0 && pageIds.every(id => next.has(id));
      if (everySelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [pageIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ==========================================================================
  // Event Handlers — mutations
  // ==========================================================================
  const editRecord = useCallback(
    async (id: string, set: Record<string, unknown>): Promise<boolean> => {
      setMutating(true);
      try {
        const { data } = await axios.patch(`/api/dev/collections/${modelKey}`, {
          id,
          set,
        });
        if (!data.success) throw new Error(data.error || 'Update failed');
        toast.success('Record updated');
        reload();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Update failed');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [modelKey, reload]
  );

  const bulkEdit = useCallback(
    async (set: Record<string, unknown>): Promise<boolean> => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return false;
      setMutating(true);
      try {
        const { data } = await axios.patch(`/api/dev/collections/${modelKey}`, {
          ids,
          set,
        });
        if (!data.success) throw new Error(data.error || 'Bulk update failed');
        toast.success(`Updated ${data.modifiedCount ?? 0} record(s)`);
        clearSelection();
        reload();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Bulk update failed');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [modelKey, selectedIds, clearSelection, reload]
  );

  const deleteRecords = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return false;
      setMutating(true);
      try {
        const { data } = await axios.delete(
          `/api/dev/collections/${modelKey}`,
          { data: { ids } }
        );
        if (!data.success) throw new Error(data.error || 'Delete failed');
        toast.success(`Deleted ${data.deletedCount ?? 0} record(s)`);
        setSelectedIds(prev => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        reload();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [modelKey, reload]
  );

  // ==========================================================================
  // Event Handlers — export
  // ==========================================================================
  const exportRecords = useCallback(
    async (format: 'csv' | 'json') => {
      try {
        const params = new URLSearchParams();
        params.set('export', 'true');
        params.set('format', format);
        if (dateField) params.set('dateField', dateField);
        if (scopeToCabinet && defaultCabinetId)
          params.set('machine', defaultCabinetId);
        let range: { startDate?: Date; endDate?: Date } = {};
        if (timePeriod === 'Custom') {
          if (customDateRange.from) range.startDate = customDateRange.from;
          if (customDateRange.to) range.endDate = customDateRange.to;
        } else {
          range = getDateRange(timePeriod);
        }
        if (range.startDate)
          params.set('startDate', range.startDate.toISOString());
        if (range.endDate) params.set('endDate', range.endDate.toISOString());
        if (format === 'csv') params.set('columns', columns.join(','));

        // Query builder options
        if (appliedFilters.length > 0) {
          params.set(
            'filters',
            JSON.stringify(
              appliedFilters.map(c => ({ field: c.field, op: c.op, value: c.value }))
            )
          );
          params.set('filterLogic', appliedFilterLogic);
        }
        if (appliedSortField) {
          params.set('sortField', appliedSortField);
          params.set('sortDir', appliedSortDir);
        }
        if (appliedLimit > 0) {
          params.set('limit', String(appliedLimit));
        }

        const response = await fetch(
          `/api/dev/collections/${modelKey}?${params.toString()}`
        );
        if (!response.ok) throw new Error(`Export failed: ${response.status}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${modelKey}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Export failed');
      }
    },
    [
      modelKey,
      dateField,
      scopeToCabinet,
      defaultCabinetId,
      timePeriod,
      customDateRange,
      columns,
      appliedFilters,
      appliedFilterLogic,
      appliedSortField,
      appliedSortDir,
      appliedLimit,
    ]
  );

  /** Downloads a single record's JSON locally (no network round-trip). */
  const exportSingle = useCallback((record: DevCollectionRecord) => {
    const blob = new Blob([JSON.stringify(record, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `record-${String(record._id)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  /** Exports the currently selected records as a local JSON file. */
  const exportSelected = useCallback(
    (format: 'csv' | 'json') => {
      const selected = records.filter(record =>
        selectedIds.has(String(record._id))
      );
      if (selected.length === 0) return;
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(selected, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${modelKey}-selected-${selected.length}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        return;
      }
      const escape = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str =
          typeof value === 'object' ? JSON.stringify(value) : String(value);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const lines = [columns.join(',')];
      for (const record of selected) {
        lines.push(
          columns.map(col => escape(getNestedValue(record, col))).join(',')
        );
      }
      const blob = new Blob(['﻿' + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${modelKey}-selected-${selected.length}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    [records, selectedIds, modelKey, columns]
  );

  // ==========================================================================
  // Event Handlers — query builder
  // ==========================================================================
  const applyQuery = useCallback(() => {
    setAppliedFilters(filterClauses);
    setAppliedFilterLogic(filterLogic);
    setAppliedSortField(querySortField);
    setAppliedSortDir(querySortDir);
    setAppliedLimit(queryLimit);

    fetchRecords(
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      1,
      0,
      appliedTerm,
      appliedColumn,
      matchOrdinal,
      appliedMatchMode,
      filterClauses,
      filterLogic,
      querySortField,
      querySortDir,
      queryLimit
    );
  }, [
    fetchRecords,
    modelKey,
    dateField,
    timePeriod,
    customDateRange,
    scopeToCabinet,
    appliedTerm,
    appliedColumn,
    matchOrdinal,
    appliedMatchMode,
    filterClauses,
    filterLogic,
    querySortField,
    querySortDir,
    queryLimit,
  ]);

  const clearQuery = useCallback(() => {
    setFilterClauses([]);
    setFilterLogic('and');
    setQuerySortField('');
    setQuerySortDir('desc');
    setQueryLimit(500);

    setAppliedFilters([]);
    setAppliedFilterLogic('and');
    setAppliedSortField('');
    setAppliedSortDir('desc');
    setAppliedLimit(0);

    fetchRecords(
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      1,
      0,
      appliedTerm,
      appliedColumn,
      matchOrdinal,
      appliedMatchMode,
      [],
      'and',
      '',
      'desc',
      0
    );
  }, [
    fetchRecords,
    modelKey,
    dateField,
    timePeriod,
    customDateRange,
    scopeToCabinet,
    appliedTerm,
    appliedColumn,
    matchOrdinal,
    appliedMatchMode,
  ]);

  // ==========================================================================
  // Event Handlers — JSON query
  // ==========================================================================
  const applyJsonQuery = useCallback(() => {
    const trimmed = jsonFilterText.trim();
    if (trimmed && trimmed !== '{}') {
      try {
        JSON.parse(trimmed);
      } catch {
        toast.error('Invalid JSON filter — keys must be quoted (e.g. "_id")');
        return;
      }
    }
    const trimmedSort = jsonOptions.sort?.trim();
    if (trimmedSort) {
      try {
        const parsedSort = JSON.parse(trimmedSort);
        if (
          typeof parsedSort !== 'object' ||
          parsedSort === null ||
          Array.isArray(parsedSort)
        ) {
          throw new Error('Sort must be a JSON object');
        }
      } catch {
        toast.error('Invalid JSON sort — use object syntax (e.g. {"_id":-1})');
        return;
      }
    }
    setAppliedJsonFilter(jsonFilterText);
    setAppliedJsonOptions(jsonOptions);
    setAppliedTerm('');
    setAppliedColumn('');
    setMatchOrdinal(0);
    setMatchCount(0);

    jsonFetchGuardRef.current = true;

    fetchRecords(
      modelKey,
      dateField,
      timePeriod,
      customDateRange,
      scopeToCabinet,
      1,
      0,
      '',
      '',
      0,
      'contains',
      [],
      'and',
      '',
      'desc',
      jsonOptions.limit || 0,
      jsonFilterText,
      jsonOptions.project || '',
      jsonOptions.skip || 0,
      jsonOptions.maxTimeMS || 0,
      trimmedSort || ''
    );
  }, [
    fetchRecords,
    modelKey,
    dateField,
    timePeriod,
    customDateRange,
    scopeToCabinet,
    jsonFilterText,
    jsonOptions,
  ]);

  // ==========================================================================
  // Event Handlers — shell command
  // ==========================================================================
  const applyShellCommand = useCallback(async (): Promise<boolean> => {
    const command = shellCommandText.trim();
    if (!command) {
      toast.error('Please enter a shell command');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<DevShellCommandResponse>(
        `/api/dev/collections/${modelKey}`,
        { command }
      );
      if (!data.success) {
        setError(data.error || 'Command failed');
        return false;
      }
      setRecords(data.data || []);
      setTotal(data.total ?? null);
      setHasMore(false);
      setLoadedApiPage(1);
      setDisplayPage(0);
      setSelectedIds(new Set());
      toast.success(`${data.commandType}: ${data.total ?? 0} result(s)`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Command execution failed';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [shellCommandText, modelKey]);

  // ==========================================================================
  // Return
  // ==========================================================================
  return {
    // model + schema
    models,
    modelKey,
    setModelKey,
    fields,
    dateFields,
    dateField,
    setDateField,
    // filters
    timePeriod,
    setTimePeriod,
    customDateRange,
    setCustomDateRange,
    scopeToCabinet,
    setScopeToCabinet,
    cabinetScopable,
    // query builder (visual)
    filterClauses,
    setFilterClauses,
    filterLogic,
    setFilterLogic,
    querySortField,
    setQuerySortField,
    querySortDir,
    setQuerySortDir,
    queryLimit,
    setQueryLimit,
    appliedFilters,
    appliedFilterLogic,
    appliedSortField,
    appliedSortDir,
    appliedLimit,
    applyQuery,
    clearQuery,
    // query mode (JSON / Visual / Shell)
    queryMode,
    setQueryMode,
    jsonFilterText,
    setJsonFilterText,
    jsonOptions,
    setJsonOptions,
    shellCommandText,
    setShellCommandText,
    showOptions,
    setShowOptions,
    appliedJsonFilter,
    setAppliedJsonFilter,
    appliedJsonOptions,
    setAppliedJsonOptions,
    applyJsonQuery,
    applyShellCommand,
    // search
    searchQuery,
    setSearchQuery,
    searchColumn,
    setSearchColumn,
    searchMatchMode,
    setSearchMatchMode,
    appliedTerm,
    matchOrdinal,
    matchCount,
    runSearch,
    goToMatch,
    // data + pagination
    columns,
    primaryDateField,
    displayedRecords,
    matchMap,
    total,
    hasMore,
    displayPage,
    totalDisplayPages,
    loading,
    error,
    goToDisplayPage,
    reload,
    // selection
    selectedIds,
    allSelected,
    toggleRow,
    toggleAll,
    clearSelection,
    // mutations
    mutating,
    editRecord,
    bulkEdit,
    deleteRecords,
    // export
    exportRecords,
    exportSingle,
    exportSelected,
    // refs
    tableContainerRef,
  };
}
