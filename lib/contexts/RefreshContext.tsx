'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type RefreshHandler = () => void | Promise<void>;

type RefreshEntry = {
  run: RefreshHandler;
  refreshing: boolean;
};

type RefreshContextValue = {
  registerRun: (pathname: string, run: RefreshHandler) => void;
  setRefreshing: (pathname: string, refreshing: boolean) => void;
  unregister: (pathname: string) => void;
  getEntry: (pathname: string) => RefreshEntry | undefined;
};

const RefreshContext = createContext<RefreshContextValue | undefined>(
  undefined
);

type RefreshProviderProps = {
  children: ReactNode;
};

export function RefreshProvider({ children }: RefreshProviderProps) {
  const entriesRef = useRef<Map<string, RefreshEntry>>(new Map());
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => {
    setVersion(current => current + 1);
  }, []);

  const registerRun = useCallback(
    (pathname: string, run: RefreshHandler) => {
      const existing = entriesRef.current.get(pathname);
      entriesRef.current.set(pathname, {
        run,
        refreshing: existing?.refreshing ?? false,
      });
      bump();
    },
    [bump]
  );

  const setRefreshing = useCallback(
    (pathname: string, refreshing: boolean) => {
      const existing = entriesRef.current.get(pathname);
      if (!existing || existing.refreshing === refreshing) {
        return;
      }

      entriesRef.current.set(pathname, { ...existing, refreshing });
      bump();
    },
    [bump]
  );

  const unregister = useCallback(
    (pathname: string) => {
      if (!entriesRef.current.has(pathname)) {
        return;
      }

      entriesRef.current.delete(pathname);
      bump();
    },
    [bump]
  );

  const getEntry = useCallback(
    (pathname: string) => entriesRef.current.get(pathname),
    // version drives re-renders for consumers when registry content changes
    [version]
  );

  const value = useMemo(
    () => ({
      registerRun,
      setRefreshing,
      unregister,
      getEntry,
    }),
    [registerRun, setRefreshing, unregister, getEntry]
  );

  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  );
}

function useRefreshContext(): RefreshContextValue {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshContext must be used within RefreshProvider');
  }
  return context;
}

export function useRegisterRefresh(
  handler: RefreshHandler,
  refreshing = false
): void {
  const pathname = usePathname();
  const { registerRun, setRefreshing, unregister } = useRefreshContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const run = () => handlerRef.current();
    registerRun(pathname, run);
    return () => unregister(pathname);
  }, [pathname, registerRun, unregister]);

  useEffect(() => {
    setRefreshing(pathname, refreshing);
  }, [pathname, refreshing, setRefreshing]);
}

export function useRefreshHandler(): {
  handler: RefreshHandler | undefined;
  refreshing: boolean;
  hasHandler: boolean;
} {
  const pathname = usePathname();
  const { getEntry } = useRefreshContext();
  const entry = getEntry(pathname);

  return {
    handler: entry?.run,
    refreshing: entry?.refreshing ?? false,
    hasHandler: Boolean(entry?.run),
  };
}
