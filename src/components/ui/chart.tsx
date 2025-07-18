import React from 'react';
import { View, Text } from 'react-native';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface SimpleChartProps {
  data?: ChartDataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
}

export default function SimpleChart({
  data,
  height = 120,
  color = '#3B82F6',
  showLabels = true,
}: SimpleChartProps) {
  // Default data if none provided
  const defaultData = [
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 180 },
    { label: 'Wed', value: 90 },
    { label: 'Thu', value: 160 },
    { label: 'Fri', value: 220 },
    { label: 'Sat', value: 280 },
    { label: 'Sun', value: 190 },
  ];

  const chartData = data || defaultData;

  if (!chartData || chartData.length === 0) {
    return (
      <View className="items-center justify-center" style={{ height }}>
        <Text className="text-gray-500">No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <View className="w-full" style={{ height }}>
      <View className="flex-1 flex-row items-end justify-between px-2">
        {chartData.map((item, index) => {
          const normalizedHeight = ((item.value - minValue) / range) * (height - 40);
          const barHeight = Math.max(normalizedHeight, 4); // Minimum height for visibility
          
          return (
            <View key={index} className="flex-1 items-center">
              <View
                className="mb-2"
                style={{
                  backgroundColor: color,
                  height: barHeight,
                  width: Math.max(20, (100 / chartData.length) - 4), // Responsive width
                  minWidth: 8,
                }}
              />
              {showLabels && (
                <Text className="text-xs text-gray-600 text-center" numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Line Chart Component
interface LineChartProps {
  data?: ChartDataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  showDots?: boolean;
}

export function LineChart({
  data,
  height = 120,
  color = '#10B981',
  showLabels = true,
  showDots = true,
}: LineChartProps) {
  // Default data if none provided
  const defaultData = [
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 180 },
    { label: 'Wed', value: 90 },
    { label: 'Thu', value: 160 },
    { label: 'Fri', value: 220 },
    { label: 'Sat', value: 280 },
    { label: 'Sun', value: 190 },
  ];

  const chartData = data || defaultData;

  if (!chartData || chartData.length === 0) {
    return (
      <View className="items-center justify-center" style={{ height }}>
        <Text className="text-gray-500">No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <View className="w-full" style={{ height }}>
      <View className="flex-1 flex-row items-end justify-between px-2">
        {chartData.map((item, index) => {
          const normalizedHeight = ((item.value - minValue) / range) * (height - 40);
          const dotPosition = Math.max(normalizedHeight, 4);
          
          return (
            <View key={index} className="flex-1 items-center relative">
              {/* Dot */}
              {showDots && (
                <View
                  className="absolute"
                  style={{
                    backgroundColor: color,
                    width: 6,
                    height: 6,
                    bottom: dotPosition + 16,
                  }}
                />
              )}
              
              {/* Vertical line to bottom */}
              <View
                className="mb-2"
                style={{
                  backgroundColor: `${color}20`,
                  height: dotPosition,
                  width: 2,
                }}
              />
              
              {showLabels && (
                <Text className="text-xs text-gray-600 text-center" numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
