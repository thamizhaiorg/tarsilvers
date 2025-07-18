import React, { useState, useEffect, useCallback, useRef } from "react";
import { Text, View, TouchableOpacity, BackHandler, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from "../lib/auth-context";
import { r2Service } from "../lib/r2-service";
import AuthScreen from "../screens/auth";
import ProductsScreen from "../components/products";
import ProductFormScreen from "../components/prod-form";
import CollectionsScreen from "../components/collections";
import CollectionFormScreen from "../components/col-form";
import ProductsManagementScreen from "../components/prod-mgmt";
import CollectionsManagementScreen from "../components/col-mgmt";
import SpaceScreen from "../components/space";
import SquarePOS from "../components/square-pos";
import ReportsScreen from "../components/reports";
import ItemStock from "../components/item-stock";
import Workspace from "../components/workspace";
import Options from "../components/options";
import MetafieldsSystem from "../components/metafields-system";
import Locations from "../components/locations";
import ItemsScreen from "../components/items";
import FilesScreen from "../components/files";
import PeopleaScreen from "../screens/peoplea";
import StoreManagement from "../components/store-mgmt";
import StorefrontScreen from "../components/storefront";

import BottomNavigation, { BottomTab, MainScreen } from "../components/nav";
import BottomTabContent from "../components/tabs";


import { StoreProvider } from "../lib/store-context";
import { log, trackError } from "../lib/logger";
import { Product, Collection, Item } from "../lib/instant";
import ErrorBoundary from "../components/ui/error-boundary";


type Screen =
  | 'space'
  | 'sales'
  | 'reports'
  | 'products'
  | 'collections'
  | 'options'
  | 'metafields'
  | 'menu'
  | 'option-create'
  | 'option-edit'
  | 'items'
  | 'locations'
  | 'files'
  | 'profile'
  | 'store-management'
  | 'storefront';

interface NavigationData {
  productId?: string;
  product?: Product;
  [key: string]: unknown;
}

interface NavigationState {
  screen: Screen;
  showBottomTabs: boolean;
  activeBottomTab: BottomTab;
  showManagement: boolean;
  data?: NavigationData;
}

export default function Page() {
  const { user, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('workspace');
  const [showBottomTabs, setShowBottomTabs] = useState(true); // Start untoggled (bottom tabs shown, square icon not highlighted)
  const [isGridView, setIsGridView] = useState(false); // false = list view (default), true = grid view
  const [showManagement, setShowManagement] = useState(false); // false = product/collection list (default), true = management screen
  const [productFormProduct, setProductFormProduct] = useState<Product | null>(null); // Track product being edited in form
  const [isProductFormOpen, setIsProductFormOpen] = useState(false); // Track if product form is open
  const [productFormHasChanges, setProductFormHasChanges] = useState(false); // Track if product form has unsaved changes
  const [collectionFormCollection, setCollectionFormCollection] = useState<Collection | null>(null); // Track collection being edited in form
  const [isCollectionFormOpen, setIsCollectionFormOpen] = useState(false); // Track if collection form is open
  const [isItemStockOpen, setIsItemStockOpen] = useState(false); // Track if item stock screen is open
  const [itemStockItem, setItemStockItem] = useState<Item | null>(null); // Track item being managed in stock screen
  const [optionSetData, setOptionSetData] = useState<{id?: string, name?: string}>({});
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null);

  // Navigation stack to track navigation history
  const [navigationStack, setNavigationStack] = useState<NavigationState[]>([{
    screen: 'menu',
    showBottomTabs: true,
    activeBottomTab: 'workspace',
    showManagement: false
  }]);



  // Function to go back using navigation stack
  const handleGoBack = useCallback(() => {
    if (navigationStack.length > 1) {
      // Remove current state and get previous state
      const newStack = [...navigationStack];
      newStack.pop(); // Remove current state
      const previousState = newStack[newStack.length - 1];

      if (previousState) {
        // Restore previous state
        setCurrentScreen(previousState.screen);
        setShowBottomTabs(previousState.showBottomTabs);
        setActiveBottomTab(previousState.activeBottomTab);
        setShowManagement(previousState.showManagement);
        if (previousState.data) {
          setOptionSetData(previousState.data);
        }
        // Clear navigation data when going back
        setNavigationData(null);

        // Update navigation stack
        setNavigationStack(newStack);
        return true;
      }
    }
    return false;
  }, [navigationStack]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      // If product form is open, let it handle the back button
      if (isProductFormOpen) {
        return false; // Let the product form's back handler take over
      }

      // If collection form is open, close it and go back to previous screen
      if (isCollectionFormOpen) {
        setCollectionFormCollection(null);
        setIsCollectionFormOpen(false);
        return true;
      }

      // If item stock screen is open, close it
      if (isItemStockOpen) {
        closeItemStock();
        return true;
      }

      // If in management view, go back to list view
      if (showManagement && (currentScreen === 'products' || currentScreen === 'collections')) {
        setShowManagement(false);
        return true;
      }

      // If bottom tabs are toggled (hidden), show them
      if (!showBottomTabs && currentScreen !== 'menu') {
        setShowBottomTabs(true);
        setActiveBottomTab('workspace');
        return true;
      }

      // For full-screen screens, handle back navigation based on context
      if (currentScreen === 'options' || currentScreen === 'metafields' || currentScreen === 'items' || currentScreen === 'locations' || currentScreen === 'files') {
        // If items screen was opened from product form, go back to product form
        if (currentScreen === 'items' && navigationData?.productId) {
          // Use the full product object if available, otherwise find by ID
          const productToOpen = navigationData.product || { id: navigationData.productId };
          setCurrentScreen('products'); // This will be handled by opening the product form
          setIsProductFormOpen(true);
          setProductFormProduct(productToOpen);
          setNavigationData(null);
          return true;
        }
        // For other screens or items without product context, go to menu
        setCurrentScreen('menu');
        setNavigationData(null);
        return true;
      }

      // For menu screen, try to go back using navigation stack
      if (currentScreen === 'menu') {
        const didGoBack = handleGoBack();
        if (didGoBack) {
          return true;
        }
        // If no navigation history, go to menu
        setCurrentScreen('menu');
        setShowBottomTabs(true);
        setActiveBottomTab('workspace');
        setShowManagement(false);
        return true;
      }

      // Try to go back using navigation stack for other screens
      const didGoBack = handleGoBack();
      if (didGoBack) {
        return true;
      }

      // If on space and no navigation history, allow default back behavior (exit app)
      if (currentScreen === 'menu') {
        return false;
      }

      // Fallback: if navigation stack is empty or failed, go to menu
      setCurrentScreen('menu');
      setShowBottomTabs(true);
      setActiveBottomTab('workspace');
      setShowManagement(false);
      setNavigationData(null);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [currentScreen, showManagement, showBottomTabs, isProductFormOpen, isCollectionFormOpen, isItemStockOpen, handleGoBack, closeItemStock]);

  // Form handlers
  const openProductForm = useCallback((product?: any) => {
    setProductFormProduct(product || null);
    setIsProductFormOpen(true);
  }, []);

  const closeProductForm = useCallback(() => {
    setProductFormProduct(null);
    setIsProductFormOpen(false);
    setProductFormHasChanges(false);
  }, []);

  const openCollectionForm = useCallback((collection?: any) => {
    setCollectionFormCollection(collection || null);
    setIsCollectionFormOpen(true);
  }, []);

  const closeCollectionForm = useCallback(() => {
    setCollectionFormCollection(null);
    setIsCollectionFormOpen(false);
  }, []);

  const openItemStock = useCallback((item?: any) => {
    setItemStockItem(item || null);
    setIsItemStockOpen(true);
  }, []);

  const closeItemStock = useCallback(() => {
    setItemStockItem(null);
    setIsItemStockOpen(false);
  }, []);

  const handleNavigate = useCallback((screen: Screen, data?: any) => {
    // If navigating from product form, close it first
    if (isProductFormOpen) {
      setProductFormProduct(null);
      setIsProductFormOpen(false);
      setProductFormHasChanges(false);
    }

    // If navigating from collection form, close it first
    if (isCollectionFormOpen) {
      setCollectionFormCollection(null);
      setIsCollectionFormOpen(false);
    }

    // Save current state to navigation stack before navigating
    const currentState: NavigationState = {
      screen: currentScreen,
      showBottomTabs,
      activeBottomTab,
      showManagement,
      data: optionSetData
    };

    setCurrentScreen(screen);
    setNavigationData(data); // Store the navigation data

    // For menu screen, ensure we reset all navigation states
    if (screen === 'menu') {
      setShowBottomTabs(true);
      setActiveBottomTab('workspace');
    }
    // All screens except menu show bottom tabs by default (untoggled state)
    else if (screen !== 'option-create' && screen !== 'option-edit') {
      setShowBottomTabs(true); // Dashboard, sales, reports, products, collections start untoggled (tabs shown)
      setActiveBottomTab('workspace'); // Reset to workspace tab when changing main screens
    }

    // Reset management view when navigating to products/collections
    if (screen === 'products' || screen === 'collections') {
      setShowManagement(false);
    }
    // Handle option screen data
    if (screen === 'option-create' || screen === 'option-edit') {
      setOptionSetData(data || {});
    }

    // Add current state to navigation stack (but avoid duplicates of the same screen)
    setNavigationStack(prev => {
      const lastState = prev[prev.length - 1];
      if (lastState?.screen !== currentScreen) {
        return [...prev, currentState];
      }
      return prev;
    });
  }, [currentScreen, showBottomTabs, activeBottomTab, showManagement, optionSetData, isProductFormOpen, isCollectionFormOpen]);

  const handleBottomTabPress = useCallback((tab: BottomTab) => {
    setActiveBottomTab(tab);
    // If clicking on workspace tab, show main content (showBottomTabs = true)
    // If clicking on other tabs (ai, tasks, people), show tab content (showBottomTabs = false)
    if (tab === 'workspace') {
      setShowBottomTabs(true);
    } else {
      setShowBottomTabs(false);
    }
  }, []);

  const renderMainContent = () => {
    // If product form is open, render it full screen
    if (isProductFormOpen) {
      return (
        <ProductFormScreen
          product={productFormProduct}
          onClose={closeProductForm}
          onSave={() => {
            // Refresh will happen automatically due to real-time updates
          }}
          onNavigate={handleNavigate}
          onHasChangesChange={setProductFormHasChanges}
        />
      );
    }

    // If collection form is open, render it full screen
    if (isCollectionFormOpen) {
      return (
        <CollectionFormScreen
          collection={collectionFormCollection}
          onClose={closeCollectionForm}
          onSave={() => {
            // Refresh will happen automatically due to real-time updates
          }}
        />
      );
    }

    // If item stock screen is open, render it full screen
    if (isItemStockOpen) {
      return (
        <ItemStock
          item={itemStockItem}
          onClose={closeItemStock}
          onSave={() => {
            // Refresh will happen automatically due to real-time updates
          }}
        />
      );
    }

    // For products and collections screens, check if we should show management view
    if (currentScreen === 'products' && showManagement) {
      return <ProductsManagementScreen />;
    }

    if (currentScreen === 'collections' && showManagement) {
      return <CollectionsManagementScreen />;
    }

    // If bottom tabs are toggled (showBottomTabs = false), render the bottom tab content
    if (!showBottomTabs) {
      return (
        <BottomTabContent
          activeTab={activeBottomTab}
          currentScreen={currentScreen as MainScreen}
        />
      );
    }

    // Otherwise render the main screens (default untoggled state)
    switch (currentScreen) {
      case 'space':
        return <SpaceScreen onOpenMenu={() => handleNavigate('menu')} />;
      case 'sales':
        return <SquarePOS onClose={() => handleNavigate('menu')} onOrderCreated={(orderId) => {
          // Optionally handle order creation success
          console.log('Order created:', orderId);
        }} />;
      case 'reports':
        return <ReportsScreen
          onOpenMenu={() => handleNavigate('menu')}
          onClose={() => handleNavigate('menu')}
        />;
      case 'products':
        return <ProductsScreen
          isGridView={isGridView}
          onProductFormOpen={(product) => {
            setProductFormProduct(product);
            setIsProductFormOpen(true);
          }}
          onProductFormClose={() => {
            setProductFormProduct(null);
            setIsProductFormOpen(false);
          }}
          onClose={() => handleNavigate('menu')}
        />;
      case 'collections':
        return <CollectionsScreen
          isGridView={isGridView}
          onOpenForm={openCollectionForm}
          onClose={() => handleNavigate('menu')}
        />;
      case 'options':
        return <Options
          onClose={() => handleNavigate('space')}
          onOpenMenu={() => handleNavigate('menu')}
        />;
      case 'metafields':
        return <MetafieldsSystem
          onClose={() => handleNavigate('menu')}
        />;

      case 'items':
        return <ItemsScreen
          isGridView={isGridView}
          onItemFormOpen={(item) => {
            // Check if this is an inventory request
            if (item?.openInventory) {
              openItemStock(item);
            } else {
              // Handle regular item form opening if needed
              log.debug('Regular item form open', 'ItemsScreen', { item });
            }
          }}
          onClose={() => {
            // If items screen was opened from product form, go back to product form
            if (navigationData?.productId) {
              setIsProductFormOpen(true);
              setProductFormProduct({ id: navigationData.productId });
              setCurrentScreen('products');
              setNavigationData(null);
            } else {
              handleNavigate('menu');
            }
          }}
          productId={navigationData?.productId} // Pass productId if provided in navigation data
        />;
      case 'locations':
        return <Locations
          onClose={() => handleNavigate('menu')}
        />;

      case 'files':
        return <FilesScreen
          onClose={() => handleNavigate('menu')}
        />;

      case 'profile':
        return <PeopleaScreen
          onClose={() => handleNavigate('menu')}
        />;

      case 'store-management':
        return <StoreManagement
          onClose={() => handleNavigate('menu')}
        />;

      case 'storefront':
        return <StorefrontScreen
          onClose={() => handleNavigate('menu')}
        />;

      case 'menu':
        return <Workspace
          onNavigate={handleNavigate}
          onClose={() => handleNavigate('space')}
        />;
      default:
        return <SpaceScreen onOpenMenu={() => handleNavigate('menu')} />;
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg text-gray-600">Loading...</Text>
      </View>
    );
  }

  // Show auth screen if user is not authenticated
  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  return (
    <StoreProvider>
      <ErrorBoundary>
        <View className="flex flex-1">
          {currentScreen === 'sales' || currentScreen === 'options' || currentScreen === 'metafields' || currentScreen === 'items' || currentScreen === 'locations' || currentScreen === 'files' || currentScreen === 'profile' || currentScreen === 'store-management' || currentScreen === 'storefront' || isProductFormOpen || isCollectionFormOpen || isItemStockOpen ? (
            // Full screen screens without header or bottom navigation (including product and collection forms)
            <ErrorBoundary>
              {renderMainContent()}
            </ErrorBoundary>
          ) : (
            // All other screens with header and bottom navigation
            <>
              <Header
                currentScreen={currentScreen}
                onNavigate={handleNavigate}
                showBottomTabs={showBottomTabs}
                setShowBottomTabs={setShowBottomTabs}
                isGridView={isGridView}
                setIsGridView={setIsGridView}
                showManagement={showManagement}
                setShowManagement={setShowManagement}
                productFormProduct={productFormProduct}
                isProductFormOpen={isProductFormOpen}
                collectionFormCollection={collectionFormCollection}
                isCollectionFormOpen={isCollectionFormOpen}
              />
              <ErrorBoundary>
                {renderMainContent()}
              </ErrorBoundary>
              <BottomNavigation
                activeTab={activeBottomTab}
                onTabPress={handleBottomTabPress}
                currentScreen={currentScreen as MainScreen}
              />
            </>
          )}
        </View>
      </ErrorBoundary>
    </StoreProvider>
  );
}

function MenuScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Section - Square POS Style */}
      <View className="bg-white px-6 pt-8 pb-6 border-b border-gray-200">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Square POS
        </Text>
        <Text className="text-lg text-gray-600">
          Manage your business inventory
        </Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-8">
        {/* Quick Stats Cards */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
            <Text className="text-2xl font-bold text-gray-900">0</Text>
            <Text className="text-sm text-gray-600">Total Products</Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
            <Text className="text-2xl font-bold text-gray-900">0</Text>
            <Text className="text-sm text-gray-600">Collections</Text>
          </View>
        </View>

        {/* Main Navigation Cards */}
        <View className="gap-4">
          {/* Removed Space navigation card to ensure all navigation to Sales is from Menu */}

          <TouchableOpacity
            onPress={() => onNavigate('sales')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
                <Text className="text-xl">💰</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold text-gray-900 mb-1">
                  Sales
                </Text>
                <Text className="text-gray-600">
                  Track sales performance
                </Text>
              </View>
              <Text className="text-gray-400 text-xl">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('reports')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4">
                <Text className="text-xl">📈</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold text-gray-900 mb-1">
                  Reports
                </Text>
                <Text className="text-gray-600">
                  Real-time business reports
                </Text>
              </View>
              <Text className="text-gray-400 text-xl">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('products')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center mr-4">
                <Text className="text-xl">📦</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold text-gray-900 mb-1">
                  Products
                </Text>
                <Text className="text-gray-600">
                  Manage your product inventory
                </Text>
              </View>
              <Text className="text-gray-400 text-xl">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('collections')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center mr-4">
                <Text className="text-xl">🏷️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold text-gray-900 mb-1">
                  Collections
                </Text>
                <Text className="text-gray-600">
                  Organize products into groups
                </Text>
              </View>
              <Text className="text-gray-400 text-xl">›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View className="mt-auto mb-8">
          <View className="bg-white p-4 rounded-xl border border-gray-200">
            <Text className="text-sm text-gray-600 text-center">
              Powered by Instant DB • Real-time sync
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Header({ currentScreen, onNavigate, showBottomTabs, setShowBottomTabs, isGridView, setIsGridView, showManagement, setShowManagement, productFormProduct, isProductFormOpen, collectionFormCollection, isCollectionFormOpen }: {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  showBottomTabs: boolean;
  setShowBottomTabs: (show: boolean) => void;
  isGridView: boolean;
  setIsGridView: (isGrid: boolean) => void;
  showManagement: boolean;
  setShowManagement: (show: boolean) => void;
  productFormProduct?: any;
  isProductFormOpen?: boolean;
  collectionFormCollection?: any;
  isCollectionFormOpen?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { peopleaProfile } = useAuth();
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');

  // Set image URL immediately when profile is available
  useEffect(() => {
    if (peopleaProfile?.profileImage) {
      // If it's an R2 URL, generate signed URL
      if (peopleaProfile.profileImage.includes('r2.cloudflarestorage.com')) {
        const generateSignedUrl = async () => {
          try {
            const key = r2Service.extractKeyFromUrl(peopleaProfile.profileImage);
            if (key) {
              const signedUrl = await r2Service.getSignedUrl(key, 3600);
              if (signedUrl) {
                setDisplayImageUrl(signedUrl);
                // Prefetch the image to cache it
                Image.prefetch(signedUrl);
              } else {
                setDisplayImageUrl(peopleaProfile.profileImage);
              }
            } else {
              setDisplayImageUrl(peopleaProfile.profileImage);
            }
          } catch (error) {
            // Keep using original URL on error
            setDisplayImageUrl(peopleaProfile.profileImage);
          }
        };
        generateSignedUrl();
      } else {
        // For non-R2 URLs, use directly
        setDisplayImageUrl(peopleaProfile.profileImage);
        // Prefetch non-R2 images too
        Image.prefetch(peopleaProfile.profileImage);
      }
    } else {
      setDisplayImageUrl('');
    }
  }, [peopleaProfile?.profileImage]);

  const getScreenInfo = (screen: Screen) => {
    // If product form is open, show product title without "Products:" prefix
    if (screen === 'products' && isProductFormOpen) {
      const productTitle = productFormProduct?.title || '';
      return {
        title: productTitle,
        icon: '📦'
      };
    }

    // If collection form is open, show collection title without "Collections:" prefix
    if (screen === 'collections' && isCollectionFormOpen) {
      const collectionTitle = collectionFormCollection?.name || '';
      return {
        title: collectionTitle,
        icon: '🏷️'
      };
    }

    switch (screen) {
      case 'space':
        return { title: 'Space', icon: '🌌' };
      case 'menu':
        return { title: 'Workspace', icon: '🏢' };
      case 'products':
        return { title: 'Products', icon: '📦' };
      case 'collections':
        return { title: 'Collections', icon: '🏷️' };
      case 'options':
        return { title: 'Options', icon: 'O' };
      case 'metafields':
        return { title: 'Metafields', icon: '#' };
      case 'files':
        return { title: 'Files', icon: '📁' };
      case 'storefront':
        return { title: 'Storefront', icon: '🌐' };

      case 'sales':
        return { title: 'Sales', icon: '💰' };
      case 'reports':
        return { title: 'Reports', icon: '📈' };
      default:
        return { title: 'Square POS', icon: '☰' };
    }
  };

  const screenInfo = getScreenInfo(currentScreen);

  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="px-4 h-16 flex items-center flex-row justify-between bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          {currentScreen === 'menu' ? (
            <>
              <TouchableOpacity
                onPress={() => onNavigate('profile')}
                className="w-8 h-8 rounded-full overflow-hidden mr-2"
              >
                <Image
                  source={
                    displayImageUrl && displayImageUrl.length > 0 && displayImageUrl !== ''
                      ? { uri: displayImageUrl }
                      : require('../../assets/adaptive-icon.png')
                  }
                  style={{ width: 32, height: 32 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onNavigate('menu')}>
                <Text className="text-xl font-semibold text-gray-900">{screenInfo.title}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => onNavigate('menu')}
              className="flex-row items-center"
            >
              <Text className="text-xl mr-2">{screenInfo.icon}</Text>
              <Text className="text-xl font-semibold text-gray-900">{screenInfo.title}</Text>
            </TouchableOpacity>
          )}
        </View>


      </View>
    </View>
  );
}
