import { useContext } from 'react';
import { LocationContext, type LocationContextType } from '../context/LocationContextDef';

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
