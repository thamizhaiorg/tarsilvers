import React from 'react';
import { View, Text } from 'react-native';
import Card from './Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  trend?: string;
  trendUp?: boolean;
}

export default function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  size = 'medium',
  trend,
  trendUp,
}: MetricCardProps) {
  const getValueSize = () => {
    switch (size) {
      case 'small':
        return 'text-lg';
      case 'medium':
        return 'text-2xl';
      case 'large':
        return 'text-3xl';
      default:
        return 'text-2xl';
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    switch (change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    if (!change) return '';
    switch (change.type) {
      case 'increase':
        return '▲';
      case 'decrease':
        return '▼';
      case 'neutral':
        return '●';
      default:
        return '';
    }
  };

  const getTrendColor = () => {
    if (trendUp === undefined) return 'text-gray-600';
    return trendUp ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (trendUp === undefined) return '';
    return trendUp ? '▲' : '▼';
  };

  return (
    <Card padding={size === 'small' ? 'small' : 'medium'}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm text-gray-600 mb-1">
            {title}
          </Text>
          <Text className={`${getValueSize()} font-bold text-gray-900 mb-1`}>
            {value}
          </Text>
          {subtitle && (
            <Text className="text-xs text-gray-500">
              {subtitle}
            </Text>
          )}
          {change && (
            <View className="flex-row items-center mt-2">
              <Text className={`text-xs ${getChangeColor()} mr-1`}>
                {getChangeIcon()}
              </Text>
              <Text className={`text-xs font-medium ${getChangeColor()}`}>
                {change.value}
              </Text>
            </View>
          )}
          {trend && (
            <View className="flex-row items-center mt-2">
              <Text className={`text-xs ${getTrendColor()} mr-1`}>
                {getTrendIcon()}
              </Text>
              <Text className={`text-xs font-medium ${getTrendColor()}`}>
                {trend}
              </Text>
            </View>
          )}
        </View>
        {icon && (
          <View className="ml-3">
            {icon}
          </View>
        )}
      </View>
    </Card>
  );
}
