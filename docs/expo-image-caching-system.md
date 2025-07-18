# Expo Image Caching System

## Overview

TAR POS uses Expo Image throughout the application with a permanent caching system for optimal performance. All image displays leverage Expo Image's built-in optimizations combined with our custom R2Image wrapper component.

## Implementation Status

✅ **Fully Implemented** - All components use Expo Image:

### Direct Expo Image Usage
- `src/screens/peoplea.tsx` - User profile images
- `src/components/menu.tsx` - Menu avatar images  
- `src/components/media/picker.tsx` - Media picker component

### R2Image Wrapper Usage
- `src/components/products.tsx` - Product images
- `src/components/collections.tsx` - Collection images
- `src/components/ui/file-upload.tsx` - File upload previews
- `src/components/ui/media-selection-modal.tsx` - Media selection
- `src/components/ui/primary-image-selection-modal.tsx` - Primary image selection

## R2Image Component

### Location
`src/components/ui/r2-image.tsx`

### Features
- **Permanent Caching**: No expiry - images cached for entire app session
- **Signed URL Management**: Handles Cloudflare R2 signed URL generation
- **Error Handling**: Graceful fallbacks for failed loads
- **Loading States**: Visual feedback during image loading
- **Memory Optimization**: Efficient Map-based cache storage

### Cache Implementation
```typescript
// Permanent in-memory cache (no expiry)
const urlCache = new Map<string, string>();
```

### Usage Example
```tsx
import R2Image from './ui/r2-image';

<R2Image
  url={product.image}
  style={{ width: 48, height: 48 }}
  resizeMode="cover"
  fallback={<DefaultImageComponent />}
  onLoad={() => console.log('Image loaded')}
  onError={(error) => console.log('Image error', error)}
/>
```

## Benefits

### Performance
- **Instant Loading**: Images display immediately after first fetch
- **Reduced Network**: No repeated requests for same images
- **Memory Efficient**: Optimized cache structure
- **Better UX**: Smooth image transitions and loading

### Expo Image Features
- **Built-in Caching**: Native caching optimizations
- **Content Fit Options**: cover, contain, fill, none
- **Placeholder Support**: Loading state management
- **Error Handling**: Automatic retry and fallback mechanisms
- **Memory Management**: Automatic cleanup and optimization

## Cache Behavior

### First Load
1. Check permanent cache for existing URL
2. If not cached, generate R2 signed URL
3. Store in permanent cache
4. Display image

### Subsequent Loads
1. Retrieve from permanent cache
2. Display instantly (no network request)

### Cache Lifecycle
- **Duration**: Entire app session
- **Clearing**: Only on app restart
- **Storage**: In-memory Map structure
- **Capacity**: No artificial limits (memory-based)

## Configuration

### Package Dependencies
```json
{
  "expo-image": "~2.3.2"
}
```

### Import Pattern
```typescript
import { Image } from 'expo-image';  // Direct usage
import R2Image from './ui/r2-image'; // R2 wrapper
```

## Best Practices

### When to Use R2Image
- Cloudflare R2 stored images
- Images requiring signed URLs
- Product/collection images
- User-uploaded content

### When to Use Direct Expo Image
- Static assets (icons, logos)
- Public URLs
- Simple image displays without R2 integration

### Performance Tips
- Use appropriate `contentFit` values
- Implement proper fallback components
- Handle loading and error states
- Optimize image dimensions before upload

## Troubleshooting

### Common Issues
1. **Images not loading**: Check R2 service configuration
2. **Cache not working**: Verify URL consistency
3. **Memory issues**: Monitor cache size in development

### Debug Information
The R2Image component includes comprehensive logging for development debugging.

## Migration Notes

All React Native Image components have been successfully migrated to Expo Image. No further migration work is required.

## Related Documentation
- [R2 Profile Image Setup](./r2-profile-image-setup.md)
- Expo Image Documentation: https://docs.expo.dev/versions/latest/sdk/image/