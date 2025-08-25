"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

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

  // Initialize and persist collapsed state
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("sidebar-collapsed")
          : null;
      // Default to collapsed (true) if no value is stored, otherwise use stored value
      if (stored != null) {
        setCollapsed(stored === "true");
      } else {
        // If no stored value exists, default to collapsed and save it
        setCollapsed(true);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("sidebar-collapsed", "true");
        }
      }
    } catch {
      // If localStorage fails, keep default collapsed state
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sidebar-collapsed", String(collapsed));
      }
    } catch {
      // ignore
    }
  }, [collapsed]);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle: () => setIsOpen((prev) => !prev),
      collapsed,
      toggleCollapsed: () => setCollapsed((prev) => !prev),
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
    throw new Error("useSidebar must be used within a SidebarProvider");
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
      onClick={(e) => {
        props.onClick?.(e);
        toggle();
      }}
      className={cn("inline-flex items-center justify-center", className)}
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
        collapsed ? "md:pl-sidebar-collapsed" : "md:pl-sidebar-expanded",
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
        "fixed inset-0 bg-black/50 z-[80] md:hidden transition-opacity",
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
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
        "fixed left-0 top-0 h-full bg-container shadow-md overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "w-72 md:w-20" : "w-72 md:w-48",
        "z-[90] transition-all duration-200"
      )}
    >
      {children}
    </aside>
  );
}
