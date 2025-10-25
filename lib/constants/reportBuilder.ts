import { ReportField, ReportFieldCategory } from '@/lib/types';
import { ReportType } from '@/lib/types/reports';

export const REPORT_FIELDS: Record<string, ReportField> = {
  // Location Fields
  locationName: {
    id: 'locationName',
    label: 'Location Name',
    dataType: 'string',
    category: 'Location',
  },
  locationRegion: {
    id: 'locationRegion',
    label: 'Region',
    dataType: 'string',
    category: 'Location',
  },

  // Machine Fields
  machineGameTitle: {
    id: 'machineGameTitle',
    label: 'Game Title',
    dataType: 'string',
    category: 'Machine',
  },
  machineManufacturer: {
    id: 'machineManufacturer',
    label: 'Manufacturer',
    dataType: 'string',
    category: 'Machine',
  },

  // Financial Fields
  totalHandle: {
    id: 'totalHandle',
    label: 'Total Handle',
    dataType: 'currency',
    category: 'Financial',
  },
  totalWin: {
    id: 'totalWin',
    label: 'Total Win',
    dataType: 'currency',
    category: 'Financial',
  },
  actualHold: {
    id: 'actualHold',
    label: 'Actual Hold %',
    dataType: 'percentage',
    category: 'Financial',
  },
  gamesPlayed: {
    id: 'gamesPlayed',
    label: 'Games Played',
    dataType: 'number',
    category: 'Financial',
  },
  averageWager: {
    id: 'averageWager',
    label: 'Average Wager',
    dataType: 'currency',
    category: 'Financial',
  },
  jackpot: {
    id: 'jackpot',
    label: 'Jackpot',
    dataType: 'currency',
    category: 'Financial',
  },

  // Time Fields
  date: {
    id: 'date',
    label: 'Date',
    dataType: 'date',
    category: 'Time',
  },
};

export const GROUPED_REPORT_FIELDS = Object.values(REPORT_FIELDS).reduce(
  (acc, field) => {
    const category = field.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  },
  {} as Record<ReportFieldCategory, ReportField[]>
);

export const REPORT_TYPE_CONFIG: Record<
  ReportType,
  {
    title: string;
    defaultFields: string[];
    availableFilters: Array<'locations' | 'manufacturers'>;
  }
> = {
  locationPerformance: {
    title: 'Location Performance Report',
    defaultFields: [
      'locationName',
      'totalHandle',
      'totalWin',
      'actualHold',
      'gamesPlayed',
    ],
    availableFilters: ['locations'],
  },
  machineRevenue: {
    title: 'Machine Revenue Report',
    defaultFields: [
      'machineGameTitle',
      'machineManufacturer',
      'totalHandle',
      'totalWin',
      'actualHold',
    ],
    availableFilters: ['locations', 'manufacturers'],
  },
  fullFinancials: {
    title: 'Full Financials Report',
    defaultFields: [
      'date',
      'locationName',
      'totalHandle',
      'totalWin',
      'jackpot',
      'gamesPlayed',
    ],
    availableFilters: ['locations'],
  },
  customerActivity: {
    title: 'Customer Activity Report',
    defaultFields: [
      'date',
      'locationName',
      'totalHandle',
      'gamesPlayed',
      'averageWager',
    ],
    availableFilters: ['locations'],
  },
  dailyCounts: {
    title: 'Daily Counts Report',
    defaultFields: [
      'date',
      'locationName',
      'totalHandle',
      'totalWin',
      'gamesPlayed',
    ],
    availableFilters: ['locations'],
  },
  activeCustomers: {
    title: 'Active Customers Report',
    defaultFields: ['date', 'locationName', 'gamesPlayed', 'averageWager'],
    availableFilters: ['locations'],
  },
  locationStats: {
    title: 'Location Stats Report',
    defaultFields: ['locationName', 'totalHandle', 'totalWin', 'actualHold'],
    availableFilters: ['locations'],
  },
  machinePerformance: {
    title: 'Machine Performance Report',
    defaultFields: [
      'machineGameTitle',
      'machineManufacturer',
      'totalHandle',
      'totalWin',
      'actualHold',
    ],
    availableFilters: ['locations', 'manufacturers'],
  },
  terminalCounts: {
    title: 'Terminal Counts Report',
    defaultFields: ['date', 'locationName', 'gamesPlayed'],
    availableFilters: ['locations'],
  },
};
