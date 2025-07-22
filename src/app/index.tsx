import React, { useState, useEffect, useCallback, useRef } from "react";
import { Text, View, TouchableOpacity, BackHandler, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from '@expo/vector-icons';
import { useAuth } from "../lib/auth-context";
import { r2Service } from "../lib/r2-service";
import AuthScreen from "../screens/auth";
import ProductsScreen from "../components/products";
import ProductFormScreen from "../components/prod-form";
import CollectionsScreen from "../components/collections";
import CollectionFormScreen from "../components/col-form";
import ProductsManagementScreen from "../components/prod-mgmt";
import CollectionsManagementScreen from "../components/col-mgmt";
// Space screen removed
import SquarePOS from "../components/square-pos";
import ReportsScreen from "../components/reports";
import ItemStock from "../components/item-stock";
import Workspace from "../components/workspace";
import Options from "../components/options";
import MetafieldsSystem from "../components/metafields-system";
import Locations from "../components/locations";
import ItemsScreen from "../components/items";
import FilesScreen from "../components/files";
import ProfileScreen from "../screens/profile";
import OrdersScreen from "../components/orders";

import { MainScreen } from "../components/nav";


import { StoreProvider } from "../lib/store-context";
import { log, trackError } from "../lib/logger";
import { Product, Collection, Item } from "../lib/instant";
import ErrorBoundary from "../components/ui/error-boundary";


type Screen =
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
  | 'orders';

interface NavigationData {
  productId?: string;
  product?: Product;
  [key: string]: unknown;
}

interface NavigationState {
  screen: Screen;
  showManagement: boolean;
  data?: NavigationData;
}

export default function Page() {
  const { user, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  // Bottom navigation removed
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

      // Bottom navigation removed

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
        setShowManagement(false);
        return true;
      }

      // Try to go back using navigation stack for other screens
      const didGoBack = handleGoBack();
      if (didGoBack) {
        return true;
      }

      // If on menu and no navigation history, allow default back behavior (exit app)
      if (currentScreen === 'menu') {
        return false;
      }

      // Fallback: if navigation stack is empty or failed, go to menu
      setCurrentScreen('menu');
      setShowManagement(false);
      setNavigationData(null);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [currentScreen, showManagement, isProductFormOpen, isCollectionFormOpen, isItemStockOpen, handleGoBack, closeItemStock]);

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
      showManagement,
      data: optionSetData
    };

    setCurrentScreen(screen);
    setNavigationData(data); // Store the navigation data

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
  }, [currentScreen, showManagement, optionSetData, isProductFormOpen, isCollectionFormOpen]);

  // Bottom navigation removed

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

    // Bottom navigation removed

    // Otherwise render the main screens (default untoggled state)
    switch (currentScreen) {
      // Space screen removed
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
          onClose={() => handleNavigate('menu')}
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
        return <ProfileScreen onClose={() => handleNavigate('menu')} />;

      case 'orders':
        return <OrdersScreen
          onCreateOrder={() => handleNavigate('sales')}
          onOrderSelect={(order) => {
            // Handle order selection - could navigate to order details
            console.log('Order selected:', order);
          }}
          onClose={() => handleNavigate('menu')}
        />;

      // Storefront screen removed

      case 'menu':
        return <Workspace
          onNavigate={handleNavigate}
          onClose={() => handleNavigate('menu')}
        />;
      default:
        return <Workspace onNavigate={handleNavigate} onClose={() => handleNavigate('menu')} />;
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
          {/* All screens now render without header */}
          <ErrorBoundary>
            {renderMainContent()}
          </ErrorBoundary>
        </View>
      </ErrorBoundary>
    </StoreProvider>
  );
}

function MenuScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
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

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header Section - Square POS Style */}
      <View className="bg-white px-6 pt-8 pb-6 border-b border-gray-200">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Square POS
        </Text>
        <Text className="text-lg text-gray-600">
          Manage your business inventory
        </Text>
      </View>

      {/* Main Content with much more spacing */}
      <View className="flex-1 px-6 pt-20">
        {/* Commerce Card with Profile */}
        <View
          className="p-6 mb-8"
          style={{ minHeight: 200, borderRadius: 10, backgroundColor: '#F5F5F5' }}
        >
          <View className="flex-1">
            {/* Header with Profile */}
            <View className="mb-4">
              <View className="flex-row items-center justify-start mb-3">
                <TouchableOpacity
                  onPress={() => onNavigate('profile')}
                  className="flex-row items-center px-3 py-1 border border-gray-300"
                  style={{ borderRadius: 6 }}
                >
                  <View className="w-6 h-6 rounded-full overflow-hidden mr-2">
                    <Image
                      source={
                        displayImageUrl && displayImageUrl.length > 0 && displayImageUrl !== ''
                          ? { uri: displayImageUrl }
                          : require('../../assets/adaptive-icon.png')
                      }
                      style={{ width: 24, height: 24 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                  <Text className="text-green-800 text-sm">
                    {peopleaProfile?.name || 'Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sales Metrics */}
            <View className="mb-6">
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-gray-600 text-sm">Total Sales</Text>
                  <Text className="text-black text-2xl font-bold">$0</Text>
                </View>
                <TouchableOpacity onPress={() => onNavigate('orders')}>
                  <Text className="text-gray-600 text-sm">Orders</Text>
                  <Text className="text-black text-2xl font-bold">1</Text>
                </TouchableOpacity>
              </View>

              {/* New Sale Button */}
              <TouchableOpacity
                onPress={() => onNavigate('sales')}
                className="bg-black py-4 items-center mb-6"
                style={{ borderRadius: 8 }}
              >
                <Text className="text-white text-lg font-medium">New Sale</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom row with circles and arrow */}
            <View className="flex-row items-center justify-between mt-auto">
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => onNavigate('products')}
                  className="w-12 h-12 bg-yellow-400 items-center justify-center mr-3"
                  style={{ borderRadius: 24 }}
                >
                  <Text className="text-black text-xl font-bold">P</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onNavigate('items')}
                  className="w-12 h-12 bg-purple-400 items-center justify-center mr-3"
                  style={{ borderRadius: 24 }}
                >
                  <Text className="text-black text-xl font-bold">I</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onNavigate('reports')}
                  className="w-12 h-12 bg-blue-400 items-center justify-center"
                  style={{ borderRadius: 24 }}
                >
                  <Text className="text-black text-xl font-bold">R</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => onNavigate('sales')}
                className="w-12 h-12 bg-black items-center justify-center"
                style={{ borderRadius: 24 }}
              >
                <Text className="text-white text-xl">→</Text>
              </TouchableOpacity>
            </View>
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


