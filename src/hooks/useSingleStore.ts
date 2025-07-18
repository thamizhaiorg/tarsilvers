import { useStore } from '../lib/store-context';
import { useLocation } from '../lib/location-context';
import { initializeSingleStore, getSingleStoreConfig } from '../lib/single-store-setup';

/**
 * Hook for managing single store operations
 * Provides easy access to store and location data with initialization
 */
export function useSingleStore() {
  const { currentStore, isLoading: storeLoading, ...storeActions } = useStore();
  const { currentLocation, isLoading: locationLoading, ...locationActions } = useLocation();

  const isLoading = storeLoading || locationLoading;
  const isReady = !isLoading && currentStore && currentLocation;

  /**
   * Initialize the single store setup if needed
   */
  const initialize = async (config?: Parameters<typeof initializeSingleStore>[0]) => {
    return await initializeSingleStore(config);
  };

  /**
   * Get complete store configuration
   */
  const getConfig = async () => {
    return await getSingleStoreConfig();
  };

  /**
   * Check if the store is properly set up
   */
  const isSetupComplete = () => {
    return !!(currentStore && currentLocation);
  };

  return {
    // Current state
    store: currentStore,
    location: currentLocation,
    isLoading,
    isReady,
    
    // Setup utilities
    initialize,
    getConfig,
    isSetupComplete,
    
    // Store actions
    ...storeActions,
    
    // Location actions
    ...locationActions
  };
}