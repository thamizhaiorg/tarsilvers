import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from './ui/Card';
import MetricCard from './ui/metric';
import Button from './ui/Button';
import SimpleChart from './ui/chart';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';

interface ReportsScreenProps {
  onOpenMenu?: () => void;
  onClose?: () => void;
}

export default function ReportsScreen({ onOpenMenu, onClose }: ReportsScreenProps) {

  // Handle back navigation
  useEffect(() => {
    const backAction = () => {
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  // Query products for metrics with optimized schema
  const { data } = db.useQuery({
    products: {
      $: {
        order: {
          createdAt: 'desc' // Use consistent field naming
        }
      },
      brand: {}, // Include relationship data for better reporting
      category: {},
      type: {},
      vendor: {}
    },
    collections: {
      $: {
        order: {
          name: 'asc' // Use indexed field for ordering
        }
      }
    }
  });

  const products = data?.products || [];
  const collections = data?.collections || [];
  const totalProducts = products.length;
  const totalCollections = collections.length;
  const totalValue = products.reduce((sum, product) => sum + ((product.price || 0) * (product.stock || 0)), 0);
  const lowStockProducts = products.filter(product => (product.stock || 0) < 10).length;

  // Sales data for dashboard
  const salesData = {
    grossSales: 3158.47
  };

  // Chart data for sales visualization
  const chartData = [
    { label: 'Mon', value: 450 },
    { label: 'Tue', value: 380 },
    { label: 'Wed', value: 520 },
    { label: 'Thu', value: 290 },
    { label: 'Fri', value: 680 },
    { label: 'Sat', value: 420 },
    { label: 'Sun', value: 350 }
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Dashboard Overview Header */}
        <View className="px-4 pt-6 pb-4 bg-white border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Dashboard Overview</Text>
          <Text className="text-sm text-gray-600">Today's performance</Text>
        </View>
        {/* Gross Sales Section */}
        <View className="px-4 pt-6">
          <Text className="text-sm text-gray-600 mb-2">Gross sales</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-6">
            {formatCurrency(salesData.grossSales)}
          </Text>

          {/* Sales Chart */}
          <Card padding="medium" className="mb-6">
            <SimpleChart
              data={chartData}
              height={120}
              color="#3B82F6"
              showLabels={true}
            />
          </Card>

          {/* Metrics Grid */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Metrics</Text>
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Products"
                  value={totalProducts.toString()}
                  change={{ value: "Total inventory", type: "neutral" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Collections"
                  value={totalCollections.toString()}
                  change={{ value: "Product groups", type: "neutral" }}
                  size="small"
                />
              </View>
            </View>
            <View className="flex-row justify-between">
              <View className="flex-1 mr-2">
                <MetricCard
                  title="Inventory Value"
                  value={formatCurrency(totalValue)}
                  change={{ value: "Total stock value", type: "neutral" }}
                  size="small"
                />
              </View>
              <View className="flex-1 ml-2">
                <MetricCard
                  title="Low Stock"
                  value={lowStockProducts.toString()}
                  change={{ value: "Items < 10 units", type: lowStockProducts > 0 ? "decrease" : "neutral" }}
                  size="small"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
