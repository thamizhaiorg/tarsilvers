// Jest setup file for React Native testing
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaConsumer: ({ children }: { children: (insets: typeof inset) => React.ReactNode }) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        EXPO_PUBLIC_INSTANT_APP_ID: 'test-app-id',
      },
    },
  },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
  ImagePickerResult: {},
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock InstantDB
jest.mock('../lib/instant', () => ({
  db: {
    useAuth: () => ({
      isLoading: false,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      error: null,
    }),
    useQuery: jest.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
    })),
    transact: jest.fn(),
    tx: new Proxy({}, {
      get: (target, entityName) => {
        return new Proxy({}, {
          get: (target, id) => {
            return {
              update: jest.fn(),
              merge: jest.fn(),
              delete: jest.fn(),
            };
          }
        });
      }
    }),
    auth: {
      signOut: jest.fn(),
    },
  },
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  getCurrentTimestamp: () => Date.now(),
}));

// Mock logger
jest.mock('../lib/logger', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  trackError: jest.fn(),
  PerformanceMonitor: {
    start: jest.fn(),
    end: jest.fn(),
    measure: jest.fn((label: string, fn: () => any) => fn()),
    measureAsync: jest.fn(async (label: string, fn: () => Promise<any>) => await fn()),
  },
}));

// Mock R2 service
jest.mock('../lib/r2-service', () => ({
  r2Service: {
    uploadFile: jest.fn(),
    getSignedUrl: jest.fn(),
    deleteFile: jest.fn(),
  },
}));

// Mock file manager
jest.mock('../lib/file-manager', () => ({
  fileManager: {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// Silence console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillReceiveProps has been renamed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Global test utilities
global.mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

global.mockStore = {
  id: 'test-store-id',
  name: 'Test Store',
  description: 'A test store',
  createdAt: new Date(),
};

global.mockProduct = {
  id: 'test-product-id',
  title: 'Test Product',
  price: 29.99,
  cost: 15.00,
  stock: 100,
  publish: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

global.mockCollection = {
  id: 'test-collection-id',
  name: 'Test Collection',
  description: 'A test collection',
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Mock timers for testing
jest.useFakeTimers();

// Increase timeout for async operations
jest.setTimeout(10000);
