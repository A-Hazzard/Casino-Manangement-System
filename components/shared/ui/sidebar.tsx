/**
 * Sidebar Components
 * Reusable sidebar component with context provider for state management.
 *
 * Features:
 * - SidebarProvider for global sidebar state
 * - Open/closed state management
 * - Collapsed/expanded state management
 * - LocalStorage persistence
 * - Responsive behavior (collapsed on mobile by default)
 * - Context-based state sharing
 */
'use client';

import { cn } from '@/lib/utils';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ============================================================================
// Types & Context
// ============================================================================

/**
 * Sidebar Context Value Type
 *
 * Defines the shape of the sidebar context value provided by SidebarProvider.
 *
 * @property isOpen - Whether sidebar overlay is open (mobile)
 * @property setIsOpen - Function to set overlay open state
 * @property toggle - Function to toggle overlay open state
 * @property collapsed - Whether sidebar is collapsed (desktop)
 * @property toggleCollapsed - Function to toggle collapsed state
 */
type SidebarContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Sidebar Provider Component
 *
 * Provides sidebar state management via React Context.
 * Manages open/closed state and collapsed/expanded state with localStorage persistence.
 *
 * Features:
 * - Open/closed state for mobile overlay
 * - Collapsed/expanded state for desktop sidebar
 * - LocalStorage persistence for collapsed state
 * - Responsive defaults (collapsed on mobile, expanded on desktop)
 * - Context-based state sharing
 *
 * @param children - React children to wrap with sidebar context
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // ============================================================================
  // State
  // ============================================================================
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(true); // Default to collapsed

  // ============================================================================
  // Helper Functions
  // ============================================================================
  /**
   * Check if screen width is medium breakpoint or larger
   * @returns True if screen width >= 768px (md breakpoint)
   */
  const isMdOrLarger = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768; // md breakpoint is 768px
  };

  // ============================================================================
  // Effects - Initialize Collapsed State
  // ============================================================================
  /**
   * Initialize collapsed state from localStorage or set based on screen size
   * - If stored value exists, use it
   * - Otherwise, default to collapsed on mobile, expanded on desktop
   */
  useEffect(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('sidebar-collapsed')
          : null;
      // If a value is stored, use it
      if (stored != null) {
        setCollapsed(stored === 'true');
      } else {
        // If no stored value exists, default based on screen size:
        // - md and larger: open (collapsed = false)
        // - smaller than md: collapsed (collapsed = true)
        const shouldCollapse = !isMdOrLarger();
        setCollapsed(shouldCollapse);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'sidebar-collapsed',
            String(shouldCollapse)
          );
        }
      }
    } catch {
      // If localStorage fails, use screen size-based default
      const shouldCollapse = !isMdOrLarger();
      setCollapsed(shouldCollapse);
    }
  }, []);

  /**
   * Persist collapsed state to localStorage whenever it changes
   */
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sidebar-collapsed', String(collapsed));
      }
    } catch {
      // ignore localStorage errors
    }
  }, [collapsed]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Memoized context value containing sidebar state and control functions
   */
  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle: () => setIsOpen(prev => !prev),
      collapsed,
      toggleCollapsed: () => setCollapsed(prev => !prev),
    }),
    [isOpen, collapsed]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

/**
 * useSidebar Hook
 *
 * Custom hook to access sidebar context state and control functions.
 * Must be used within a SidebarProvider component.
 *
 * @returns Sidebar context value with:
 *   - isOpen: boolean - Whether sidebar overlay is open (mobile)
 *   - setIsOpen: (open: boolean) => void - Set overlay open state
 *   - toggle: () => void - Toggle overlay open state
 *   - collapsed: boolean - Whether sidebar is collapsed (desktop)
 *   - toggleCollapsed: () => void - Toggle collapsed state
 * @throws Error if used outside SidebarProvider
 */
export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}

/**
 * Sidebar Trigger Component
 *
 * Button component that toggles the sidebar open/closed state.
 * Typically used in headers or navigation areas to show/hide the sidebar.
 *
 * @param className - Additional CSS classes
 * @param children - Button content (usually an icon)
 * @param props - Additional button HTML attributes
 */
export function SidebarTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useSidebar();
  return (
    <button
      {...props}
      onClick={e => {
        props.onClick?.(e);
        toggle();
      }}
      className={cn('inline-flex items-center justify-center', className)}
    >
      {children}
    </button>
  );
}

/**
 * Sidebar Inset Component
 *
 * Container component that provides proper spacing for main content
 * when sidebar is present. Adjusts margin-left based on sidebar collapsed state.
 *
 * Features:
 * - Responsive margin-left that matches sidebar widths
 * - Collapsed: 80px (w-20) margin on md+ screens
 * - Expanded: 208px (w-52) margin on md+ screens
 * - No margin on mobile (sidebar is overlay)
 *
 * @param children - Main content to display
 * @param className - Additional CSS classes
 */
export function SidebarInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        'min-h-screen transition-all duration-200',
        // Use responsive margin-left that matches sidebar widths
        // Sidebar: collapsed = w-20 (80px), expanded = w-52 (208px)
        collapsed ? 'md:ml-20' : 'md:ml-52', // 80px and 208px respectively
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sidebar Overlay Component
 *
 * Backdrop overlay that appears when sidebar is open on mobile devices.
 * Clicking the overlay closes the sidebar.
 *
 * Features:
 * - Only visible on mobile (hidden on md+ screens)
 * - Semi-transparent black background
 * - Click to close functionality
 * - Smooth opacity transition
 *
 * @returns Overlay div element
 */
export function SidebarOverlay() {
  const { isOpen, setIsOpen } = useSidebar();
  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] bg-black/50 transition-opacity md:hidden',
        isOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      )}
      onClick={() => setIsOpen(false)}
    />
  );
}

/**
 * Sidebar Container Component
 *
 * Fixed-position container for sidebar content.
 * Handles responsive width, positioning, and visibility based on sidebar state.
 *
 * Features:
 * - Fixed positioning on left side
 * - Responsive widths:
 *   - Mobile: 288px (w-72) when open
 *   - Desktop collapsed: 80px (w-20)
 *   - Desktop expanded: 208px (w-52)
 * - Slide-in animation on mobile
 * - Always visible on desktop (md+)
 *
 * @param children - Sidebar content (navigation items, etc.)
 */
export function SidebarContainer({ children }: { children: React.ReactNode }) {
  const { isOpen, collapsed } = useSidebar();
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full overflow-hidden bg-container shadow-md',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        // Use exact widths that match CSS variables: 5rem (80px) and 12rem (192px)
        collapsed ? 'w-72 md:w-20' : 'w-72 md:w-52', // 288px mobile, 80px/192px desktop
        'z-[90] transition-all duration-200'
      )}
    >
      {children}
    </aside>
  );
}

