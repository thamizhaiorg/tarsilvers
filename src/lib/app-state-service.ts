// Centralized application state management service
import { log } from './logger';
import { Product, Collection, Item } from './instant';

export interface AppState {
  // UI State
  isGridView: boolean;
  showManagement: boolean;
  
  // Form States
  productForm: {
    isOpen: boolean;
    product: Product | null;
    hasChanges: boolean;
  };
  
  collectionForm: {
    isOpen: boolean;
    collection: Collection | null;
    hasChanges: boolean;
  };
  
  itemStock: {
    isOpen: boolean;
    item: Item | null;
  };
  
  // Modal States
  modals: {
    primaryImageSelection: boolean;
    mediaSelection: boolean;
    fileUpload: boolean;
    filter: boolean;
  };
  
  // Selection States
  selectedProducts: Set<string>;
  selectedCollections: Set<string>;
  selectedItems: Set<string>;
  isMultiSelectMode: boolean;
  
  // Search and Filter States
  searchQueries: {
    products: string;
    collections: string;
    items: string;
    files: string;
  };
  
  filters: {
    products: string;
    collections: string;
    items: string;
    files: string;
  };
}

const initialState: AppState = {
  isGridView: false,
  showManagement: false,
  
  productForm: {
    isOpen: false,
    product: null,
    hasChanges: false,
  },
  
  collectionForm: {
    isOpen: false,
    collection: null,
    hasChanges: false,
  },
  
  itemStock: {
    isOpen: false,
    item: null,
  },
  
  modals: {
    primaryImageSelection: false,
    mediaSelection: false,
    fileUpload: false,
    filter: false,
  },
  
  selectedProducts: new Set(),
  selectedCollections: new Set(),
  selectedItems: new Set(),
  isMultiSelectMode: false,
  
  searchQueries: {
    products: '',
    collections: '',
    items: '',
    files: '',
  },
  
  filters: {
    products: 'All',
    collections: 'All',
    items: 'All',
    files: 'all',
  },
};

export class AppStateService {
  private static instance: AppStateService;
  private state: AppState;
  private listeners: Array<(state: AppState) => void> = [];

  private constructor() {
    this.state = { ...initialState };
  }

  static getInstance(): AppStateService {
    if (!AppStateService.instance) {
      AppStateService.instance = new AppStateService();
    }
    return AppStateService.instance;
  }

  // Subscribe to state changes
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get current state
  getState(): AppState {
    return { ...this.state };
  }

  // Update state
  updateState(updates: Partial<AppState> | ((prevState: AppState) => Partial<AppState>)): void {
    const stateUpdates = typeof updates === 'function' ? updates(this.state) : updates;
    
    this.state = {
      ...this.state,
      ...stateUpdates,
    };

    log.debug('App state updated', 'AppStateService', { updates: stateUpdates });
    this.notifyListeners();
  }

  // Specific state update methods
  setGridView(isGridView: boolean): void {
    this.updateState({ isGridView });
  }

  setShowManagement(showManagement: boolean): void {
    this.updateState({ showManagement });
  }

  openProductForm(product?: Product): void {
    this.updateState({
      productForm: {
        isOpen: true,
        product: product || null,
        hasChanges: false,
      },
    });
  }

  closeProductForm(): void {
    this.updateState({
      productForm: {
        isOpen: false,
        product: null,
        hasChanges: false,
      },
    });
  }

  setProductFormChanges(hasChanges: boolean): void {
    this.updateState({
      productForm: {
        ...this.state.productForm,
        hasChanges,
      },
    });
  }

  openCollectionForm(collection?: Collection): void {
    this.updateState({
      collectionForm: {
        isOpen: true,
        collection: collection || null,
        hasChanges: false,
      },
    });
  }

  closeCollectionForm(): void {
    this.updateState({
      collectionForm: {
        isOpen: false,
        collection: null,
        hasChanges: false,
      },
    });
  }

  openItemStock(item: Item): void {
    this.updateState({
      itemStock: {
        isOpen: true,
        item,
      },
    });
  }

  closeItemStock(): void {
    this.updateState({
      itemStock: {
        isOpen: false,
        item: null,
      },
    });
  }

  toggleModal(modalName: keyof AppState['modals'], isOpen?: boolean): void {
    this.updateState({
      modals: {
        ...this.state.modals,
        [modalName]: isOpen !== undefined ? isOpen : !this.state.modals[modalName],
      },
    });
  }

  setSearchQuery(context: keyof AppState['searchQueries'], query: string): void {
    this.updateState({
      searchQueries: {
        ...this.state.searchQueries,
        [context]: query,
      },
    });
  }

  setFilter(context: keyof AppState['filters'], filter: string): void {
    this.updateState({
      filters: {
        ...this.state.filters,
        [context]: filter,
      },
    });
  }

  // Selection management
  toggleSelection(context: 'products' | 'collections' | 'items', id: string): void {
    const selectionKey = `selected${context.charAt(0).toUpperCase() + context.slice(1)}` as keyof Pick<AppState, 'selectedProducts' | 'selectedCollections' | 'selectedItems'>;
    const currentSelection = new Set(this.state[selectionKey]);
    
    if (currentSelection.has(id)) {
      currentSelection.delete(id);
    } else {
      currentSelection.add(id);
    }

    this.updateState({
      [selectionKey]: currentSelection,
      isMultiSelectMode: currentSelection.size > 0,
    } as Partial<AppState>);
  }

  clearSelection(): void {
    this.updateState({
      selectedProducts: new Set(),
      selectedCollections: new Set(),
      selectedItems: new Set(),
      isMultiSelectMode: false,
    });
  }

  // Reset state to initial values
  reset(): void {
    this.state = { ...initialState };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        log.error('App state listener error', 'AppStateService', { error });
      }
    });
  }
}

// Hook for using app state service in components
import { useState, useEffect } from 'react';

export function useAppState() {
  const appStateService = AppStateService.getInstance();
  const [state, setState] = useState(appStateService.getState());

  useEffect(() => {
    const unsubscribe = appStateService.subscribe(setState);
    return unsubscribe;
  }, [appStateService]);

  return {
    ...state,
    updateState: appStateService.updateState.bind(appStateService),
    setGridView: appStateService.setGridView.bind(appStateService),
    setShowManagement: appStateService.setShowManagement.bind(appStateService),
    openProductForm: appStateService.openProductForm.bind(appStateService),
    closeProductForm: appStateService.closeProductForm.bind(appStateService),
    setProductFormChanges: appStateService.setProductFormChanges.bind(appStateService),
    openCollectionForm: appStateService.openCollectionForm.bind(appStateService),
    closeCollectionForm: appStateService.closeCollectionForm.bind(appStateService),
    openItemStock: appStateService.openItemStock.bind(appStateService),
    closeItemStock: appStateService.closeItemStock.bind(appStateService),
    toggleModal: appStateService.toggleModal.bind(appStateService),
    setSearchQuery: appStateService.setSearchQuery.bind(appStateService),
    setFilter: appStateService.setFilter.bind(appStateService),
    toggleSelection: appStateService.toggleSelection.bind(appStateService),
    clearSelection: appStateService.clearSelection.bind(appStateService),
    reset: appStateService.reset.bind(appStateService),
  };
}
