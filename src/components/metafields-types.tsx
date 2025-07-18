// Metafields system types and constants

export type MetafieldEntityType = 
  | 'products' 
  | 'items' 
  | 'collections' 
  | 'customers' 
  | 'orders' 
  | 'draft_orders' 
  | 'locations';

export interface MetafieldSet {
  id: string;
  title: string;
  name: string;
  namespace?: string;
  key?: string;
  description?: string;
  type: 'single_line_text' | 'multi_line_text' | 'rich_text' | 'number' | 'url' | 'email' | 'color' | 'date' | 'date_time' | 'boolean' | 'weight' | 'dimension' | 'volume' | 'money' | 'rating' | 'reference' | 'json';
  category: MetafieldEntityType;
  group: string;
  order: number;
  filter: boolean;
  config: {
    placeholder?: string;
    min?: number;
    max?: number;
    unit?: string;
    options?: string[];
    reference_type?: string;
  };
  inputConfig?: Record<string, unknown>;
  required?: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetafieldValue {
  id: string;
  setId: string;
  metafieldSetId: string;
  entityId: string;
  entityType: string;
  value: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const METAFIELD_CATEGORIES = [
  { id: 'products', name: 'Products' },
  { id: 'items', name: 'Items' },
  { id: 'collections', name: 'Collections' },
  { id: 'customers', name: 'Customers' },
  { id: 'orders', name: 'Orders' },
  { id: 'draft_orders', name: 'Draft orders' },
  { id: 'locations', name: 'Locations' },
] as const;
