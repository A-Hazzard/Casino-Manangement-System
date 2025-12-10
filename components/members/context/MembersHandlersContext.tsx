'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type MembersHandlersContextType = {
  onRefresh?: () => void;
  onNewMember?: () => void;
  refreshing?: boolean;
  setOnRefresh: (handler: (() => void) | undefined) => void;
  setOnNewMember: (handler: (() => void) | undefined) => void;
  setRefreshing: (value: boolean) => void;
};

const MembersHandlersContext = createContext<
  MembersHandlersContextType | undefined
>(undefined);

export function MembersHandlersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refreshHandler, setRefreshHandler] = useState<
    (() => void) | undefined
  >(undefined);
  const [newMemberHandler, setNewMemberHandler] = useState<
    (() => void) | undefined
  >(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const setOnRefresh = useCallback((handler: (() => void) | undefined) => {
    setRefreshHandler(() => handler);
  }, []);

  const setOnNewMember = useCallback((handler: (() => void) | undefined) => {
    setNewMemberHandler(() => handler);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      onRefresh: refreshHandler,
      onNewMember: newMemberHandler,
      refreshing,
      setOnRefresh,
      setOnNewMember,
      setRefreshing,
    }),
    [refreshing, refreshHandler, newMemberHandler, setOnRefresh, setOnNewMember]
  );

  return (
    <MembersHandlersContext.Provider value={contextValue}>
      {children}
    </MembersHandlersContext.Provider>
  );
}

export function useMembersHandlers() {
  const context = useContext(MembersHandlersContext);
  if (context === undefined) {
    throw new Error(
      'useMembersHandlers must be used within a MembersHandlersProvider'
    );
  }
  return context;
}
