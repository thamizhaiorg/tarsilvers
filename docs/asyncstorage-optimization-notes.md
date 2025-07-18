# AsyncStorage Optimization Notes

## Platform-Specific Limits

**Android**: Default limit is around 6MB, but can be increased
**iOS**: No hard limit, but performance degrades with large amounts of data
**Web**: Limited by browser's localStorage (typically 5-10MB)

## Increasing AsyncStorage Limit

### 1. Android Configuration (Expo Config Plugin)

Add this to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-async-storage/async-storage",
        {
          "AsyncStorageDBSize": 50
        }
      ]
    ]
  }
}
```

The `AsyncStorageDBSize` is in MB. This requires a development build (not Expo Go).

### 2. Alternative Storage Solutions

For larger data needs, consider these alternatives:

**Expo SQLite** - Better for structured data:
```bash
npx expo install expo-sqlite
```

**Expo FileSystem** - For large files:
```bash
npx expo install expo-file-system
```

**Expo SecureStore** - For sensitive data (limited to 2KB per item):
```bash
npx expo install expo-secure-store
```

## Best Practices for AsyncStorage

### 1. Data Optimization
```typescript
// Compress data before storing
import { compress, decompress } from 'lz-string';

const storeCompressedData = async (key: string, data: any) => {
  const compressed = compress(JSON.stringify(data));
  await AsyncStorage.setItem(key, compressed);
};

const getCompressedData = async (key: string) => {
  const compressed = await AsyncStorage.getItem(key);
  if (compressed) {
    return JSON.parse(decompress(compressed));
  }
  return null;
};
```

### 2. Data Chunking
```typescript
// Split large data into chunks
const storeInChunks = async (key: string, data: any, chunkSize = 1000000) => {
  const jsonString = JSON.stringify(data);
  const chunks = [];
  
  for (let i = 0; i < jsonString.length; i += chunkSize) {
    chunks.push(jsonString.slice(i, i + chunkSize));
  }
  
  await AsyncStorage.setItem(`${key}_count`, chunks.length.toString());
  
  for (let i = 0; i < chunks.length; i++) {
    await AsyncStorage.setItem(`${key}_${i}`, chunks[i]);
  }
};
```

### 3. Hybrid Approach for TAR POS

Given your InstantDB setup, consider this strategy:

```typescript
// Store critical offline data in AsyncStorage
// Use InstantDB for real-time sync
// Use Expo FileSystem for large media cache

const storageStrategy = {
  // Small, critical data (user preferences, auth tokens)
  critical: AsyncStorage,
  
  // Large datasets (product catalogs, order history)
  bulk: 'InstantDB with local cache',
  
  // Media files (product images)
  media: 'Cloudflare R2 with FileSystem cache'
};
```

## For TAR POS App

Since you're already using InstantDB for real-time data, recommended approach:

1. Keep AsyncStorage for user preferences and app state
2. Use InstantDB's offline capabilities for business data
3. Implement smart caching strategies
4. Consider Expo SQLite for complex offline queries

## Implementation Notes

- AsyncStorage is best for small, frequently accessed data
- For large datasets, prefer InstantDB with proper indexing
- Media files should use FileSystem with R2 cloud storage
- Consider data compression for storage efficiency
- Implement proper error handling for storage operations