import React, { type ReactNode } from 'react';
import { CivicDataContext } from './CivicDataContextDef';
import { useCivicData } from '../hooks/useCivicData';

/**
 * Mounts useCivicData once at the app level so all pages share
 * the same fetched weather + AQI state rather than each fetching independently.
 */
export const CivicDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useCivicData();
  return (
    <CivicDataContext.Provider value={value}>
      {children}
    </CivicDataContext.Provider>
  );
};
