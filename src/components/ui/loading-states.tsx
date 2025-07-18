// Loading state components for better UX
import React from 'react';
import { View, Text, ActivityIndicator, Animated, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
}

export function LoadingSpinner({ size = 'large', color = '#3B82F6', message }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-gray-600 mt-4 text-center">{message}</Text>
      )}
    </View>
  );
}

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, className = '' }: SkeletonProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      className={`bg-gray-200 ${className}`}
      style={{
        width,
        height,
        borderRadius,
        opacity,
      }}
    />
  );
}

interface ProductCardSkeletonProps {
  showImage?: boolean;
}

export function ProductCardSkeleton({ showImage = true }: ProductCardSkeletonProps) {
  return (
    <View className="bg-white rounded-lg border border-gray-100 p-4 mb-3">
      <View className="flex-row">
        {showImage && (
          <View className="mr-3">
            <Skeleton width={60} height={60} borderRadius={8} />
          </View>
        )}
        <View className="flex-1">
          <Skeleton width="80%" height={16} className="mb-2" />
          <Skeleton width="60%" height={14} className="mb-2" />
          <Skeleton width="40%" height={14} />
        </View>
        <View className="ml-3">
          <Skeleton width={24} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

interface ListSkeletonProps {
  count?: number;
  showImage?: boolean;
}

export function ListSkeleton({ count = 5, showImage = true }: ListSkeletonProps) {
  return (
    <View className="p-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} showImage={showImage} />
      ))}
    </View>
  );
}

interface GridSkeletonProps {
  count?: number;
  columns?: number;
}

export function GridSkeleton({ count = 6, columns = 2 }: GridSkeletonProps) {
  const itemWidth = columns === 2 ? '48%' : '31%';
  
  return (
    <View className="p-4 flex-row flex-wrap justify-between">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="bg-white rounded-lg border border-gray-100 p-3 mb-3" style={{ width: itemWidth }}>
          <Skeleton width="100%" height={120} borderRadius={8} className="mb-3" />
          <Skeleton width="100%" height={14} className="mb-2" />
          <Skeleton width="70%" height={12} />
        </View>
      ))}
    </View>
  );
}

interface InlineLoadingProps {
  message?: string;
  size?: 'small' | 'large';
}

export function InlineLoading({ message = 'Loading...', size = 'small' }: InlineLoadingProps) {
  return (
    <View className="flex-row items-center justify-center py-4">
      <ActivityIndicator size={size} color="#3B82F6" />
      <Text className="text-gray-600 ml-2">{message}</Text>
    </View>
  );
}

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onPress?: () => void;
}

export function ButtonLoading({ loading, children, disabled, className = '', onPress }: ButtonLoadingProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center py-3 px-6 rounded-lg ${
        disabled || loading ? 'bg-gray-300' : 'bg-blue-600'
      } ${className}`}
    >
      {loading && <ActivityIndicator size="small" color="white" className="mr-2" />}
      <Text className={`font-semibold ${disabled || loading ? 'text-gray-500' : 'text-white'}`}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

interface PullToRefreshProps {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function PullToRefresh({ refreshing, onRefresh, children }: PullToRefreshProps) {
  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
      {children}
    </ScrollView>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center p-8">
      <MaterialIcons name={icon as any} size={64} color="#9CA3AF" />
      <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">{title}</Text>
      {description && (
        <Text className="text-gray-600 mt-2 text-center">{description}</Text>
      )}
      {actionText && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-blue-600 px-6 py-3 rounded-lg mt-6"
        >
          <Text className="text-white font-semibold">{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  height = 4, 
  backgroundColor = '#E5E7EB', 
  progressColor = '#3B82F6',
  showPercentage = false 
}: ProgressBarProps) {
  const percentage = Math.round(progress * 100);
  
  return (
    <View className="w-full">
      <View 
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor }}
      >
        <View
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: progressColor 
          }}
        />
      </View>
      {showPercentage && (
        <Text className="text-xs text-gray-600 mt-1 text-center">
          {percentage}%
        </Text>
      )}
    </View>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({ visible, message = 'Loading...', transparent = false }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View 
      className="absolute inset-0 justify-center items-center z-50"
      style={{ 
        backgroundColor: transparent ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)' 
      }}
    >
      <View className="bg-white rounded-lg p-6 shadow-lg">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-700 mt-3 text-center">{message}</Text>
      </View>
    </View>
  );
}
