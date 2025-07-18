import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { id } from '@instantdb/react-native';
import { db } from './instant';

interface Store {
  id: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  setCurrentStore: (store: Store) => Promise<void>;
  createStore: (storeData: Omit<Store, 'id' | 'createdAt'>) => Promise<Store>;
  updateStore: (storeId: string, updates: Partial<Store>) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  refreshStores: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const CURRENT_STORE_KEY = '@current_store';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Query all stores
  const { data, isLoading: queryLoading } = db.useQuery({
    store: {}
  });

  const stores = data?.store || [];

  // Auto-create and set default store "skj silversmith"
  useEffect(() => {
    if (!queryLoading && stores.length === 0 && !currentStore) {
      // No stores exist, create the default store
      const createDefaultStore = async () => {
        try {
          const defaultStore = await createStore({
            name: 'skj silversmith',
            description: 'Default store',
            email: '',
            phone: '',
            address: '',
            website: '',
            logo: ''
          });
          setCurrentStoreState(defaultStore);
        } catch (error) {
          console.error('Failed to create default store:', error);
        }
      };
      createDefaultStore();
    } else if (!queryLoading && stores.length > 0 && !currentStore) {
      // Stores exist, find and set "skj silversmith" or first store
      const defaultStore = stores.find(s => s.name === 'skj silversmith') || stores[0];
      setCurrentStoreState({
        ...defaultStore,
        createdAt: new Date(defaultStore.createdAt),
        updatedAt: defaultStore.updatedAt ? new Date(defaultStore.updatedAt) : undefined
      });
    }
    setIsLoading(queryLoading);
  }, [stores, currentStore, queryLoading]);

  const setCurrentStore = async (store: Store) => {
    try {
      setCurrentStoreState(store);
      await AsyncStorage.setItem(CURRENT_STORE_KEY, store.id);
    } catch (error) {
      // ...removed debug log...
    }
  };

  const createStore = async (storeData: Omit<Store, 'id' | 'createdAt'>): Promise<Store> => {
    try {
      const storeId = id();
      const newStore = {
        ...storeData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.transact([
        db.tx.store[storeId].update({
          ...newStore,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      ]);

      // The new store will be automatically available through the query
      return { ...newStore, id: storeId } as Store;
    } catch (error) {
      // ...removed debug log...
      throw error;
    }
  };

  const updateStore = async (storeId: string, updates: Partial<Store>) => {
    try {
      await db.transact([
        db.tx.store[storeId].update({
          ...updates,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      ]);

      // Update current store if it's the one being updated
      if (currentStore?.id === storeId) {
        setCurrentStoreState({ ...currentStore, ...updates });
      }
    } catch (error) {
      // ...removed debug log...
      throw error;
    }
  };

  const deleteStore = async (storeId: string) => {
    try {
      await db.transact([
        db.tx.store[storeId].delete()
      ]);

      // If deleting current store, switch to another one
      if (currentStore?.id === storeId) {
        const remainingStores = stores.filter(s => s.id !== storeId);
        if (remainingStores.length > 0) {
          await setCurrentStore({
            ...remainingStores[0],
            createdAt: new Date(remainingStores[0].createdAt),
            updatedAt: remainingStores[0].updatedAt ? new Date(remainingStores[0].updatedAt) : undefined
          });
        } else {
          setCurrentStoreState(null);
          await AsyncStorage.removeItem(CURRENT_STORE_KEY);
        }
      }
    } catch (error) {
      // ...removed debug log...
      throw error;
    }
  };

  const refreshStores = () => {
    // The query will automatically refresh
  };

  const value: StoreContextType = {
    currentStore,
    stores: stores.map(store => ({
      ...store,
      createdAt: new Date(store.createdAt),
      updatedAt: store.updatedAt ? new Date(store.updatedAt) : undefined
    })),
    isLoading,
    setCurrentStore,
    createStore,
    updateStore,
    deleteStore,
    refreshStores
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
