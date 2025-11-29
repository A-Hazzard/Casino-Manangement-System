'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

type MembersHandlersContextType = {
  onRefresh?: () => void;
  onNewMember?: () => void;
  refreshing?: boolean;
  setOnRefresh: (handler: (() => void) | undefined) => void;
  setOnNewMember: (handler: (() => void) | undefined) => void;
  setRefreshing: (value: boolean) => void;
};

const MembersHandlersContext = createContext<MembersHandlersContextType | undefined>(undefined);

export function MembersHandlersProvider({ children }: { children: React.ReactNode }) {
  const refreshHandlerRef = useRef<(() => void) | undefined>(undefined);
  const newMemberHandlerRef = useRef<(() => void) | undefined>(undefined);
  const [, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const setOnRefresh = useCallback((handler: (() => void) | undefined) => {
    refreshHandlerRef.current = handler;
    // Trigger a re-render to update context consumers
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setOnNewMember = useCallback((handler: (() => void) | undefined) => {
    newMemberHandlerRef.current = handler;
    // Trigger a re-render to update context consumers
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      onRefresh: refreshHandlerRef.current,
      onNewMember: newMemberHandlerRef.current,
      refreshing,
      setOnRefresh,
      setOnNewMember,
      setRefreshing,
    }),
    [refreshing, setOnRefresh, setOnNewMember]
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
    throw new Error('useMembersHandlers must be used within a MembersHandlersProvider');
  }
  return context;
}

