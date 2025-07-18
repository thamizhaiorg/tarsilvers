// Instant DB configuration and initialization
import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

// Get the app ID from environment variables
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is not set in environment variables');
}

// Initialize the database with schema for type safety
export const db = init({
  appId: APP_ID,
  schema,
});

// Export types for use throughout the app
export type { AppSchema } from '../../instant.schema';

// Media item interface
export interface MediaItem {
  id: string;
  url: string;
  fileId: string;
  name: string;
  type: string;
}

// SEO interface
export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  slug?: string;
}

// Sale info interface
export interface SaleInfo {
  isOnSale?: boolean;
  saleStartDate?: string;
  saleEndDate?: string;
  salePrice?: number;
  saleType?: 'percentage' | 'fixed';
}

// Promo info interface
export interface PromoInfo {
  isPromoted?: boolean;
  promoStartDate?: string;
  promoEndDate?: string;
  promoText?: string;
}

// Helper types for better TypeScript experience
export type Product = {
  id: string;
  title: string;
  image?: string;
  medias?: MediaItem[];
  excerpt?: string;
  notes?: string;
  type?: string;
  category?: string;
  unit?: string;
  price?: number;
  saleprice?: number;
  vendor?: string;
  brand?: string;
  options?: Record<string, unknown>;
  modifiers?: Record<string, unknown>;
  metafields?: Record<string, unknown>;
  saleinfo?: SaleInfo;
  stores?: string[];
  pos?: boolean;
  website?: boolean;
  seo?: SEOData;
  tags?: string | string[]; // Database stores as string, UI uses array
  cost?: number;
  qrcode?: string;
  stock?: number;
  createdAt: number | string;
  updatedAt?: number | string;
  publishAt?: number | string;
  publish?: boolean;
  promoinfo?: PromoInfo;
  featured?: boolean;
  relproducts?: string[];
  sellproducts?: string[];
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: number | string;
  updatedAt: number | string;
  products?: Product[];
};

export interface Item {
  id: string;
  storeId: string;
  productId: string;
  sku: string;
  barcode?: string;
  title?: string;
  price?: number;
  cost?: number;
  weight?: number;
  dimensions?: string;
  trackQty?: boolean;
  allowPreorder?: boolean;
  stock?: number;
  lowStockLevel?: number;
  options?: Record<string, string>;
  metafields?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

// Utility function to generate current timestamp
export const getCurrentTimestamp = () => Date.now();

// Utility function to format dates
export const formatDate = (timestamp: number | string) => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleDateString();
};

// Utility function to format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
