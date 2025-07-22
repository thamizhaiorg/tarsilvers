import { useStore } from '../lib/store-context';
import { useLocation } from '../lib/location-context';
import { initializeSingleStore, getSingleStoreConfig } from '../lib/single-store-setup';

/**
 * Hook for managing single store operations (simplified since stores are no longer in schema)
 * Provides easy access to location data with initialization
 */
export function useSingleStore() {
  const { isLoading: storeLoading } = useStore();
  const { currentLocation, isLoading: locationLoading, ...locationActions } = useLocation();

  const isLoading = storeLoading || locationLoading;
  const isReady = !isLoading && currentLocation;

  /**
   * Get complete store configuration
   */
  const getConfig = async () => {
    return await getSingleStoreConfig();
  };

  /**
   * Check if the setup is properly configured
   */
  const isSetupComplete = () => {
    return !!currentLocation;
  };

  return {
    // Current state
    store: null, // No longer available
    location: currentLocation,
    isLoading,
    isReady,

    // Setup utilities
    getConfig,
    isSetupComplete,

    // Location actions
    ...locationActions
  };
}