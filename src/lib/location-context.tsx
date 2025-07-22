import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { id } from '@instantdb/react-native';
import { db } from './instant';
import { useStore } from './store-context';

interface Location {
  id: string;
  name: string;
  type?: string;
  address?: any;
  contactInfo?: any;
  isActive?: boolean;
  isDefault?: boolean;
  fulfillsOnlineOrders?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LocationContextType {
  currentLocation: Location | null;
  locations: Location[];
  isLoading: boolean;
  setCurrentLocation: (location: Location) => void;
  createLocation: (locationData: Omit<Location, 'id' | 'createdAt'>) => Promise<Location>;
  updateLocation: (locationId: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  refreshLocations: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Query all locations
  const { data, isLoading: queryLoading } = db.useQuery({
    locations: {}
  });

  const locations = data?.locations || [];

  // Auto-create default location
  useEffect(() => {
    if (!queryLoading && locations.length === 0 && !currentLocation) {
      // No locations exist, create the default location
      const createDefaultLocation = async () => {
        try {
          const defaultLocation = await createLocation({
            name: 'Main Location',
            type: 'retail',
            isActive: true,
            isDefault: true,
            fulfillsOnlineOrders: true,
            address: {
              street: '',
              city: '',
              state: '',
              zip: '',
              country: ''
            },
            contactInfo: {
              phone: '',
              email: ''
            }
          });
          setCurrentLocationState(defaultLocation);
        } catch (error) {
          console.error('Failed to create default location:', error);
        }
      };
      createDefaultLocation();
    } else if (!queryLoading && locations.length > 0 && !currentLocation) {
      // Locations exist, set the default one or first one
      const defaultLocation = locations.find(l => l.isDefault) || locations[0];
      setCurrentLocationState({
        ...defaultLocation,
        createdAt: defaultLocation.createdAt ? new Date(defaultLocation.createdAt) : undefined,
        updatedAt: defaultLocation.updatedAt ? new Date(defaultLocation.updatedAt) : undefined
      });
    }
    setIsLoading(queryLoading);
  }, [locations, currentLocation, queryLoading]); // Removed currentStore dependency

  const setCurrentLocation = (location: Location) => {
    setCurrentLocationState(location);
  };

  const createLocation = async (locationData: Omit<Location, 'id' | 'createdAt'>): Promise<Location> => {
    try {
      const locationId = id();
      const newLocation = {
        ...locationData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.transact([
        db.tx.locations[locationId].update({
          ...newLocation,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      ]);

      return { ...newLocation, id: locationId } as Location;
    } catch (error) {
      console.error('Failed to create location:', error);
      throw error;
    }
  };

  const updateLocation = async (locationId: string, updates: Partial<Location>) => {
    try {
      await db.transact([
        db.tx.locations[locationId].update({
          ...updates,
          updatedAt: Date.now()
        })
      ]);

      // Update current location if it's the one being updated
      if (currentLocation?.id === locationId) {
        setCurrentLocationState({ ...currentLocation, ...updates });
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  };

  const deleteLocation = async (locationId: string) => {
    try {
      await db.transact([
        db.tx.locations[locationId].delete()
      ]);

      // If deleting current location, switch to another one
      if (currentLocation?.id === locationId) {
        const remainingLocations = locations.filter(l => l.id !== locationId);
        if (remainingLocations.length > 0) {
          setCurrentLocation({
            ...remainingLocations[0],
            createdAt: remainingLocations[0].createdAt ? new Date(remainingLocations[0].createdAt) : undefined,
            updatedAt: remainingLocations[0].updatedAt ? new Date(remainingLocations[0].updatedAt) : undefined
          });
        } else {
          setCurrentLocationState(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      throw error;
    }
  };

  const refreshLocations = () => {
    // The query will automatically refresh
  };

  const value: LocationContextType = {
    currentLocation,
    locations: locations.map(location => ({
      ...location,
      createdAt: location.createdAt ? new Date(location.createdAt) : undefined,
      updatedAt: location.updatedAt ? new Date(location.updatedAt) : undefined
    })),
    isLoading,
    setCurrentLocation,
    createLocation,
    updateLocation,
    deleteLocation,
    refreshLocations
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}