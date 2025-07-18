import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { GridConfig } from '../../types/pos';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  config?: GridConfig;
  spacing?: number;
  style?: ViewStyle;
}

const DEFAULT_CONFIG: GridConfig = {
  mobile: 2,
  tablet: 3,
  desktop: 4,
};

export default function ResponsiveGrid({ 
  children, 
  config = DEFAULT_CONFIG, 
  spacing = 16,
  style 
}: ResponsiveGridProps) {
  const { getGridColumns } = useResponsiveLayout();
  const columns = getGridColumns(config);

  // Calculate item width based on columns and spacing
  const itemWidth = `${(100 / columns)}%`;

  return (
    <View 
      className="flex-row flex-wrap" 
      style={[{ margin: -spacing / 2 }, style]}
    >
      {children.map((child, index) => (
        <View
          key={index}
          style={{
            width: itemWidth,
            padding: spacing / 2,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}