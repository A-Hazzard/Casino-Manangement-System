/**
 * Settings Store
 * Zustand store for managing comprehensive user settings and preferences.
 *
 * Features:
 * - Manages notification, display, regional, privacy, security, system, backup, and integration settings
 * - Provides category-specific settings update actions
 * - Tracks loading state, errors, and unsaved changes
 * - Offers theme management (light/dark/system) and font size controls
 * - Includes currency, date, time, and number formatting helpers
 * - Manages notification preferences with bulk enable/disable
 * - Handles security settings (2FA, IP whitelist)
 * - Controls system settings (auto-refresh, auto-save intervals)
 * - Persists settings to localStorage with SSR-safe fallbacks
 * - Supports settings reset by category or full reset
 *
 * @returns Zustand hook for accessing and updating user settings state.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UserSettings,
  SettingsCategory,
  NotificationSettings,
  DisplaySettings,
  RegionalSettings,
  PrivacySettings,
  SecuritySettings,
  SystemSettings,
  BackupSettings,
  IntegrationSettings,
} from '@/lib/types/settings';
import { DEFAULT_SETTINGS } from '@/lib/types/settings';

// ============================================================================
// Types
// ============================================================================

type SettingsState = {
  // Settings data
  settings: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  updateRegionalSettings: (settings: Partial<RegionalSettings>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  updateBackupSettings: (settings: Partial<BackupSettings>) => void;
  updateIntegrationSettings: (settings: Partial<IntegrationSettings>) => void;
  updateCustomSettings: (settings: Record<string, unknown>) => void;

  // Utility actions
  resetSettings: () => void;
  resetCategory: (category: SettingsCategory) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // Theme and display helpers
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  toggleCompactMode: () => void;
  toggleAnimations: () => void;

  // Currency and formatting helpers
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatNumber: (number: number) => string;

  // Notification helpers
  toggleNotificationCategory: (category: keyof NotificationSettings) => void;
  enableAllNotifications: () => void;
  disableAllNotifications: () => void;

  // Security helpers
  enableTwoFactor: () => void;
  disableTwoFactor: () => void;
  addToIpWhitelist: (ip: string) => void;
  removeFromIpWhitelist: (ip: string) => void;

  // System helpers
  toggleAutoRefresh: () => void;
  setRefreshInterval: (seconds: number) => void;
  toggleAutoSave: () => void;
  setAutoSaveInterval: (seconds: number) => void;
};

// ============================================================================
// Helper Functions
// ============================================================================

// Helper function to format currency based on user settings
const formatCurrencyHelper = (
  amount: number,
  currency: string,
  position: 'before' | 'after',
  symbol: string
): string => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return position === 'before'
    ? `${symbol}${formattedAmount}`
    : `${formattedAmount}${symbol}`;
};

// Helper function to format date based on user settings
const formatDateHelper = (date: Date, format: string): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    default:
      return `${month}/${day}/${year}`;
  }
};

// Helper function to format time based on user settings
const formatTimeHelper = (date: Date, format: '12h' | '24h'): string => {
  if (format === '24h') {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  } else {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
    });
  }
};

// Helper function to format numbers based on user settings
const formatNumberHelper = (number: number, format: string): string => {
  switch (format) {
    case 'US':
      return number.toLocaleString('en-US');
    case 'EU':
      return number.toLocaleString('de-DE');
    case 'UK':
      return number.toLocaleString('en-GB');
    case 'IN':
      return number.toLocaleString('en-IN');
    default:
      return number.toLocaleString('en-US');
  }
};

// ============================================================================
// Store Creation
// ============================================================================

const createStore = () => {
  return create<SettingsState>()(
    persist(
      (set, get) => ({
        // Initial state
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        error: null,
        hasUnsavedChanges: false,

        // Settings update actions
        updateNotificationSettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              notifications: {
                ...state.settings.notifications,
                ...newSettings,
              },
            },
            hasUnsavedChanges: true,
          })),

        updateDisplaySettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              display: { ...state.settings.display, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updateRegionalSettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              regional: { ...state.settings.regional, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updatePrivacySettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              privacy: { ...state.settings.privacy, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updateSecuritySettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              security: { ...state.settings.security, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updateSystemSettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              system: { ...state.settings.system, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updateBackupSettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              backup: { ...state.settings.backup, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updateIntegrationSettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              integrations: { ...state.settings.integrations, ...newSettings },
            },
            hasUnsavedChanges: true,
          })),

        updateCustomSettings: newSettings =>
          set(state => ({
            settings: {
              ...state.settings,
              customSettings: {
                ...state.settings.customSettings,
                ...newSettings,
              },
            },
            hasUnsavedChanges: true,
          })),

        // Utility actions
        resetSettings: () =>
          set({
            settings: DEFAULT_SETTINGS,
            hasUnsavedChanges: true,
          }),

        resetCategory: category =>
          set(state => {
            const newSettings = { ...state.settings };
            switch (category) {
              case 'notifications':
                newSettings.notifications = DEFAULT_SETTINGS.notifications;
                break;
              case 'display':
                newSettings.display = DEFAULT_SETTINGS.display;
                break;
              case 'regional':
                newSettings.regional = DEFAULT_SETTINGS.regional;
                break;
              case 'privacy':
                newSettings.privacy = DEFAULT_SETTINGS.privacy;
                break;
              case 'security':
                newSettings.security = DEFAULT_SETTINGS.security;
                break;
              case 'system':
                newSettings.system = DEFAULT_SETTINGS.system;
                break;
              case 'backup':
                newSettings.backup = DEFAULT_SETTINGS.backup;
                break;
              case 'integrations':
                newSettings.integrations = DEFAULT_SETTINGS.integrations;
                break;
              case 'custom':
                newSettings.customSettings = {};
                break;
              default:
                break;
            }
            return {
              settings: newSettings,
              hasUnsavedChanges: true,
            };
          }),

        saveSettings: async () => {
          set({ isLoading: true, error: null });
          try {
            // Here you would typically make an API call to save settings
            // For now, we'll just simulate a successful save
            await new Promise(resolve => setTimeout(resolve, 500));
            set({ hasUnsavedChanges: false, isLoading: false });
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to save settings',
              isLoading: false,
            });
          }
        },

        loadSettings: async () => {
          set({ isLoading: true, error: null });
          try {
            // Here you would typically make an API call to load settings
            // For now, we'll just simulate a successful load
            await new Promise(resolve => setTimeout(resolve, 500));
            set({ isLoading: false });
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load settings',
              isLoading: false,
            });
          }
        },

        setLoading: loading => set({ isLoading: loading }),
        setError: error => set({ error }),
        setHasUnsavedChanges: hasChanges =>
          set({ hasUnsavedChanges: hasChanges }),

        // Theme and display helpers
        toggleTheme: () => {
          const { settings } = get();
          const currentTheme = settings.display.theme;
          const newTheme =
            currentTheme === 'light'
              ? 'dark'
              : currentTheme === 'dark'
                ? 'system'
                : 'light';
          get().updateDisplaySettings({ theme: newTheme });
        },

        setTheme: theme => get().updateDisplaySettings({ theme }),

        increaseFontSize: () => {
          const { settings } = get();
          const currentSize = settings.display.fontSize;
          const newSize =
            currentSize === 'small'
              ? 'medium'
              : currentSize === 'medium'
                ? 'large'
                : 'large';
          get().updateDisplaySettings({ fontSize: newSize });
        },

        decreaseFontSize: () => {
          const { settings } = get();
          const currentSize = settings.display.fontSize;
          const newSize =
            currentSize === 'large'
              ? 'medium'
              : currentSize === 'medium'
                ? 'small'
                : 'small';
          get().updateDisplaySettings({ fontSize: newSize });
        },

        toggleCompactMode: () => {
          const { settings } = get();
          get().updateDisplaySettings({
            compactMode: !settings.display.compactMode,
          });
        },

        toggleAnimations: () => {
          const { settings } = get();
          get().updateDisplaySettings({
            showAnimations: !settings.display.showAnimations,
          });
        },

        // Currency and formatting helpers
        formatCurrency: amount => {
          const { settings } = get();
          return formatCurrencyHelper(
            amount,
            settings.regional.currency,
            settings.regional.currencyPosition,
            settings.regional.currencySymbol
          );
        },

        formatDate: date => {
          const { settings } = get();
          return formatDateHelper(date, settings.regional.dateFormat);
        },

        formatTime: date => {
          const { settings } = get();
          return formatTimeHelper(date, settings.regional.timeFormat);
        },

        formatNumber: number => {
          const { settings } = get();
          return formatNumberHelper(number, settings.regional.numberFormat);
        },

        // Notification helpers
        toggleNotificationCategory: category => {
          const { settings } = get();
          const currentSetting = settings.notifications[category];
          get().updateNotificationSettings({
            [category]: { ...currentSetting, enabled: !currentSetting.enabled },
          });
        },

        enableAllNotifications: () => {
          const { settings } = get();
          const updatedNotifications: Partial<NotificationSettings> = {};
          Object.keys(settings.notifications).forEach(key => {
            const typedKey = key as keyof NotificationSettings;
            updatedNotifications[typedKey] = {
              ...settings.notifications[typedKey],
              enabled: true,
            };
          });
          get().updateNotificationSettings(updatedNotifications);
        },

        disableAllNotifications: () => {
          const { settings } = get();
          const updatedNotifications: Partial<NotificationSettings> = {};
          Object.keys(settings.notifications).forEach(key => {
            const typedKey = key as keyof NotificationSettings;
            updatedNotifications[typedKey] = {
              ...settings.notifications[typedKey],
              enabled: false,
            };
          });
          get().updateNotificationSettings(updatedNotifications);
        },

        // Security helpers
        enableTwoFactor: () =>
          get().updateSecuritySettings({ twoFactorAuth: true }),
        disableTwoFactor: () =>
          get().updateSecuritySettings({ twoFactorAuth: false }),

        addToIpWhitelist: ip => {
          const { settings } = get();
          const currentWhitelist = settings.security.ipWhitelist;
          if (!currentWhitelist.includes(ip)) {
            get().updateSecuritySettings({
              ipWhitelist: [...currentWhitelist, ip],
            });
          }
        },

        removeFromIpWhitelist: ip => {
          const { settings } = get();
          const currentWhitelist = settings.security.ipWhitelist;
          get().updateSecuritySettings({
            ipWhitelist: currentWhitelist.filter(item => item !== ip),
          });
        },

        // System helpers
        toggleAutoRefresh: () => {
          const { settings } = get();
          get().updateSystemSettings({
            autoRefresh: !settings.system.autoRefresh,
          });
        },

        setRefreshInterval: seconds =>
          get().updateSystemSettings({ refreshInterval: seconds }),

        toggleAutoSave: () => {
          const { settings } = get();
          get().updateSystemSettings({ autoSave: !settings.system.autoSave });
        },

        setAutoSaveInterval: seconds =>
          get().updateSystemSettings({ autoSaveInterval: seconds }),
      }),
      {
        name: 'cms-settings-store',
        storage: createJSONStorage(() => {
          if (typeof window !== 'undefined') {
            return localStorage;
          }
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }),
        // Only persist the settings, not the loading states
        partialize: state => ({
          settings: state.settings,
        }),
      }
    )
  );
};

// Define a no-op version for SSR
const dummyState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
  updateNotificationSettings: () => {},
  updateDisplaySettings: () => {},
  updateRegionalSettings: () => {},
  updatePrivacySettings: () => {},
  updateSecuritySettings: () => {},
  updateSystemSettings: () => {},
  updateBackupSettings: () => {},
  updateIntegrationSettings: () => {},
  updateCustomSettings: () => {},
  resetSettings: () => {},
  resetCategory: () => {},
  saveSettings: async () => {},
  loadSettings: async () => {},
  setLoading: () => {},
  setError: () => {},
  setHasUnsavedChanges: () => {},
  toggleTheme: () => {},
  setTheme: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  toggleCompactMode: () => {},
  toggleAnimations: () => {},
  formatCurrency: () => '$0.00',
  formatDate: () => '01/01/2024',
  formatTime: () => '12:00 PM',
  formatNumber: () => '0',
  toggleNotificationCategory: () => {},
  enableAllNotifications: () => {},
  disableAllNotifications: () => {},
  enableTwoFactor: () => {},
  disableTwoFactor: () => {},
  addToIpWhitelist: () => {},
  removeFromIpWhitelist: () => {},
  toggleAutoRefresh: () => {},
  setRefreshInterval: () => {},
  toggleAutoSave: () => {},
  setAutoSaveInterval: () => {},
};

export const useSettingsStore =
  typeof window !== 'undefined' ? createStore() : () => dummyState;
