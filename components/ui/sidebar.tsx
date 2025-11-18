'use client';

import { cn } from '@/lib/utils';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type SidebarContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(true); // Default to collapsed

  // Helper function to check if screen is md or larger
  const isMdOrLarger = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768; // md breakpoint is 768px
  };

  // Initialize and persist collapsed state
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

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sidebar-collapsed', String(collapsed));
      }
    } catch {
      // ignore
    }
  }, [collapsed]);

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

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}

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
        // Use responsive padding that matches sidebar widths
        collapsed ? 'md:pl-2' : 'md:pl-32', // 80px and 192px respectively
        className
      )}
    >
      {children}
    </div>
  );
}

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
