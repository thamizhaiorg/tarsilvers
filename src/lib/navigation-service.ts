// Navigation service for centralized navigation management
import { log } from './logger';

export type Screen = 'space' | 'sales' | 'reports' | 'products' | 'collections' | 'options' | 'metafields' | 'menu' | 'option-create' | 'option-edit' | 'items' | 'locations' | 'files';

export interface NavigationData {
  productId?: string;
  product?: any;
  collectionId?: string;
  collection?: any;
  itemId?: string;
  item?: any;
  [key: string]: unknown;
}

export interface NavigationState {
  screen: Screen;
  showBottomTabs: boolean;
  activeBottomTab: string;
  showManagement: boolean;
  data?: NavigationData;
}

export class NavigationService {
  private static instance: NavigationService;
  private navigationState: NavigationState;
  private listeners: Array<(state: NavigationState) => void> = [];

  private constructor() {
    this.navigationState = {
      screen: 'menu',
      showBottomTabs: true,
      activeBottomTab: 'workspace',
      showManagement: false,
    };
  }

  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  // Subscribe to navigation state changes
  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get current navigation state
  getState(): NavigationState {
    return { ...this.navigationState };
  }

  // Navigate to a screen
  navigate(screen: Screen, data?: NavigationData): void {
    log.info('Navigation', 'NavigationService', { from: this.navigationState.screen, to: screen, data });
    
    this.navigationState = {
      ...this.navigationState,
      screen,
      data,
    };

    this.notifyListeners();
  }

  // Update navigation state
  updateState(updates: Partial<NavigationState>): void {
    this.navigationState = {
      ...this.navigationState,
      ...updates,
    };

    this.notifyListeners();
  }

  // Go back to previous screen (simplified implementation)
  goBack(): void {
    // This could be enhanced with a navigation stack
    if (this.navigationState.screen !== 'menu') {
      this.navigate('menu');
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.navigationState);
      } catch (error) {
        log.error('Navigation listener error', 'NavigationService', { error });
      }
    });
  }
}

// Hook for using navigation service in components
import { useState, useEffect } from 'react';

export function useNavigation() {
  const navigationService = NavigationService.getInstance();
  const [state, setState] = useState(navigationService.getState());

  useEffect(() => {
    const unsubscribe = navigationService.subscribe(setState);
    return unsubscribe;
  }, [navigationService]);

  return {
    ...state,
    navigate: navigationService.navigate.bind(navigationService),
    updateState: navigationService.updateState.bind(navigationService),
    goBack: navigationService.goBack.bind(navigationService),
  };
}
