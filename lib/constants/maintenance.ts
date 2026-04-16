/**
 * Maintenance Configuration
 * Central source of truth for page and tab maintenance states.
 *
 * Convention:
 *   - Env var set to "false"  → feature is UNDER MAINTENANCE (blocked)
 *   - Env var set to anything else, or unset → feature is AVAILABLE (default)
 *
 * Env var naming pattern:
 *   - Pages: NEXT_PUBLIC_<PAGE>
 *   - Tabs:  NEXT_PUBLIC_<PAGE>_<TAB>
 *
 * Example .env entries:
 *   NEXT_PUBLIC_ADMINISTRATION=false              ← whole page under maintenance
 *   NEXT_PUBLIC_ADMINISTRATION_ACTIVITY_LOGS=false ← only that tab hidden
 */

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Returns true (available) unless the env var is explicitly set to "false". */
const env = (key: string): boolean => process.env[key] !== 'false';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const MAINTENANCE_CONFIG = {
  pages: {
    dashboard: env('NEXT_PUBLIC_DASHBOARD'),
    locations: env('NEXT_PUBLIC_LOCATIONS'),
    cabinets: env('NEXT_PUBLIC_CABINETS'),
    members: env('NEXT_PUBLIC_MEMBERS'),
    reports: env('NEXT_PUBLIC_REPORTS'),
    sessions: env('NEXT_PUBLIC_SESSIONS'),
    'collection-report': env('NEXT_PUBLIC_COLLECTION_REPORT'),
    administration: env('NEXT_PUBLIC_ADMINISTRATION'),
  },
  tabs: {
    administration: {
      users: env('NEXT_PUBLIC_ADMINISTRATION_USERS'),
      licencees: env('NEXT_PUBLIC_ADMINISTRATION_LICENCEES'),
      countries: env('NEXT_PUBLIC_ADMINISTRATION_COUNTRIES'),
      'activity-logs': env('NEXT_PUBLIC_ADMINISTRATION_ACTIVITY_LOGS'),
      feedback: env('NEXT_PUBLIC_ADMINISTRATION_FEEDBACK'),
    },
    reports: {
      meters: env('NEXT_PUBLIC_REPORTS_METERS'),
      locations: env('NEXT_PUBLIC_REPORTS_LOCATIONS'),
      machines: env('NEXT_PUBLIC_REPORTS_MACHINES'),
    },
    members: {
      members: env('NEXT_PUBLIC_MEMBERS_MEMBERS'),
      'summary-report': env('NEXT_PUBLIC_MEMBERS_SUMMARY_REPORT'),
      'activity-log': env('NEXT_PUBLIC_MEMBERS_ACTIVITY_LOG'),
    },
    'collection-report': {
      collection: env('NEXT_PUBLIC_COLLECTION_REPORT_COLLECTION'),
      monthly: env('NEXT_PUBLIC_COLLECTION_REPORT_MONTHLY'),
      manager: env('NEXT_PUBLIC_COLLECTION_REPORT_MANAGER'),
      collector: env('NEXT_PUBLIC_COLLECTION_REPORT_COLLECTOR'),
    },
    cabinets: {
      cabinets: env('NEXT_PUBLIC_CABINETS_MACHINES'),
      movement: env('NEXT_PUBLIC_CABINETS_MOVEMENT'),
      smib: env('NEXT_PUBLIC_CABINETS_SMIB'),
      firmware: env('NEXT_PUBLIC_CABINETS_FIRMWARE'),
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when a full page is available (not under maintenance). */
export function isPageAvailable(page: keyof typeof MAINTENANCE_CONFIG.pages): boolean {
  return MAINTENANCE_CONFIG.pages[page] ?? true;
}

/** Returns true when a specific tab is available (not under maintenance). */
export function isTabAvailable(
  page: keyof typeof MAINTENANCE_CONFIG.tabs,
  tab: string,
): boolean {
  const pageTabs = MAINTENANCE_CONFIG.tabs[page];
  if (!pageTabs) return true;
  return (pageTabs as Record<string, boolean>)[tab] ?? true;
}
