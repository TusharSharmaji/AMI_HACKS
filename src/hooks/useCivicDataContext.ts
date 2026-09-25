import { useContext } from 'react';
import { CivicDataContext, type CivicDataContextType } from '../context/CivicDataContextDef';

/**
 * Consumes the shared CivicDataContext.
 * Use this in all pages instead of calling useCivicData() directly.
 * Data is fetched once at app level via CivicDataProvider.
 */
export function useCivicDataContext(): CivicDataContextType {
  const ctx = useContext(CivicDataContext);
  if (!ctx) {
    throw new Error('useCivicDataContext must be used inside CivicDataProvider');
  }
  return ctx;
}
