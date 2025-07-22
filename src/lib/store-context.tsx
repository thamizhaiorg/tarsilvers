import React, { createContext, useContext, ReactNode } from 'react';

// Since the schema no longer includes store entities, we'll provide a simplified context
// that doesn't rely on database store management
interface StoreContextType {
  // Simplified store context - no longer database-driven
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Simplified provider - no store management needed since schema doesn't include stores

  const value: StoreContextType = {
    isLoading: false, // No loading needed since we're not querying stores
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
