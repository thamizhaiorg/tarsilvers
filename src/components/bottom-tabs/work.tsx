import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MainScreen } from '../nav';
import { db, formatCurrency } from '../../lib/instant';
import MetricCard from '../ui/metric';
import SimpleChart from '../ui/chart';
import ProductsScreen from '../products';
import CollectionsScreen from '../collections';

interface WorkspaceContentProps {
  currentScreen: MainScreen;
}

export default function WorkspaceContent({ currentScreen }: WorkspaceContentProps) {
  const { data } = db.useQuery({
    products: {},
    collections: {}
  });

  const products = data?.products || [];
  const collections = data?.collections || [];

  const renderDashboardWorkspace = () => {
    const totalProducts = products.length;
    const totalCollections = collections.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * (product.stock || 0)), 0);
    const lowStockProducts = products.filter(product => (product.stock || 0) < 10).length;

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <Text className="text-xl font-bold text-gray-900 mb-4">Dashboard Overview</Text>
          
          {/* Key Metrics */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Inventory Value"
                value={formatCurrency(totalValue)}
                subtitle="Total stock value"
                trend="Real-time"
                trendUp={true}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Low Stock"
                value={lowStockProducts.toString()}
                subtitle="Items < 10 units"
                trend="Needs attention"
                trendUp={false}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Products"
                value={totalProducts.toString()}
                subtitle="Total inventory"
                trend={`${lowStockProducts} low stock`}
                trendUp={false}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Collections"
                value={totalCollections.toString()}
                subtitle="Product groups"
                trend="Active"
                trendUp={true}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Text className="text-blue-600 font-medium">New Sale</Text>
                <Text className="text-blue-500 text-sm">Start transaction</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                <Text className="text-green-600 font-medium">Add Product</Text>
                <Text className="text-green-500 text-sm">Expand inventory</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sales Chart */}
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Sales Trend</Text>
            <SimpleChart />
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderProductsWorkspace = () => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const lowStockProducts = products.filter(product => product.stock < 10);
    const outOfStockProducts = products.filter(product => product.stock === 0);

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <Text className="text-xl font-bold text-gray-900 mb-4">Product Management</Text>
          
          {/* Product Metrics */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Total Products"
                value={totalProducts.toString()}
                subtitle="In inventory"
                trend="Active"
                trendUp={true}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Inventory Value"
                value={formatCurrency(totalValue)}
                subtitle="Total worth"
                trend="+5.2%"
                trendUp={true}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Low Stock"
                value={lowStockProducts.length.toString()}
                subtitle="Need restock"
                trend="Attention needed"
                trendUp={false}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Out of Stock"
                value={outOfStockProducts.length.toString()}
                subtitle="Unavailable"
                trend="Urgent"
                trendUp={false}
              />
            </View>
          </View>

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <View className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <Text className="text-orange-800 font-medium mb-2">⚠️ Low Stock Alert</Text>
              <Text className="text-orange-700 text-sm mb-3">
                {lowStockProducts.length} products need restocking
              </Text>
              {lowStockProducts.slice(0, 3).map((product, index) => (
                <Text key={index} className="text-orange-600 text-sm">
                  • {product.title} ({product.stock || 0} left)
                </Text>
              ))}
              {lowStockProducts.length > 3 && (
                <Text className="text-orange-600 text-sm">
                  • +{lowStockProducts.length - 3} more products
                </Text>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Text className="text-blue-600 font-medium">Add Product</Text>
                <Text className="text-blue-500 text-sm">Create new item</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                <Text className="text-green-600 font-medium">Bulk Import</Text>
                <Text className="text-green-500 text-sm">Import CSV</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderCollectionsWorkspace = () => {
    const totalCollections = collections.length;
    const productsInCollections = 0; // Collection relationships not yet implemented
    const unassignedProducts = products.length;

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <Text className="text-xl font-bold text-gray-900 mb-4">Collection Management</Text>
          
          {/* Collection Metrics */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Collections"
                value={totalCollections.toString()}
                subtitle="Product groups"
                trend="Active"
                trendUp={true}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Organized Products"
                value={productsInCollections.toString()}
                subtitle="In collections"
                trend={`${Math.round((productsInCollections / products.length) * 100)}%`}
                trendUp={true}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <MetricCard
                title="Unassigned"
                value={unassignedProducts.toString()}
                subtitle="Need organization"
                trend="Organize"
                trendUp={false}
              />
            </View>
          </View>

          {/* Collections List */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Collections Overview</Text>
            {collections.length === 0 ? (
              <View className="bg-gray-50 border border-gray-200 rounded-lg p-6 items-center">
                <Text className="text-2xl mb-2">📚</Text>
                <Text className="text-gray-600 text-center">No collections yet</Text>
                <Text className="text-gray-500 text-sm text-center">Create collections to organize your products</Text>
              </View>
            ) : (
              <View className="gap-3">
                {collections.map((collection, index) => {
                  const collectionProducts = 0; // Collection relationships not yet implemented
                  return (
                    <View key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <Text className="font-medium text-gray-900">{collection.name}</Text>
                      <Text className="text-gray-600 text-sm">{collectionProducts} products</Text>
                      {collection.description && (
                        <Text className="text-gray-500 text-sm mt-1">{collection.description}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Text className="text-blue-600 font-medium">New Collection</Text>
                <Text className="text-blue-500 text-sm">Create group</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                <Text className="text-green-600 font-medium">Organize Products</Text>
                <Text className="text-green-500 text-sm">Assign to collections</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSalesWorkspace = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-900 mb-4">Sales Overview</Text>
        
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[45%]">
            <MetricCard
              title="Total Sales"
              value={formatCurrency(3158.47)}
              subtitle="Today's revenue"
              trend="+2.1%"
              trendUp={true}
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <MetricCard
              title="Transactions"
              value="47"
              subtitle="Completed today"
              trend="+8.5%"
              trendUp={true}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Text className="text-blue-600 font-medium">Transfer Funds</Text>
              <Text className="text-blue-500 text-sm">To bank account</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
              <Text className="text-green-600 font-medium">View History</Text>
              <Text className="text-green-500 text-sm">Transaction log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderReportsWorkspace = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-900 mb-4">Reports Overview</Text>
        
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[45%]">
            <MetricCard
              title="Today's Sales"
              value={formatCurrency(2641.23)}
              subtitle="Revenue"
              trend="+15.3%"
              trendUp={true}
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <MetricCard
              title="This Week"
              value={formatCurrency(18492.67)}
              subtitle="Total revenue"
              trend="+8.7%"
              trendUp={true}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Text className="text-blue-600 font-medium">Export Report</Text>
              <Text className="text-blue-500 text-sm">Download CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
              <Text className="text-green-600 font-medium">Custom Report</Text>
              <Text className="text-green-500 text-sm">Build report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  switch (currentScreen) {
    case 'space':
      return renderDashboardWorkspace();
    case 'products':
      return <ProductsScreen isGridView={false} />;
    case 'collections':
      return <CollectionsScreen isGridView={false} />;
    case 'sales':
      return renderSalesWorkspace();
    case 'reports':
      return renderReportsWorkspace();
    default:
      return renderDashboardWorkspace();
  }
}
