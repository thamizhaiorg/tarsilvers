# R2 Image Reading and Display in TAR POS

This document explains how images stored in Cloudflare R2 are read from InstantDB and displayed in the TAR POS application.

## Overview

The app uses a two-step process to display R2 images:
1. **Storage**: Image URLs are stored in InstantDB pointing to Cloudflare R2 objects
2. **Display**: When displaying images, the app generates signed URLs for secure access

## Image URL Flow

### 1. Image Storage in Database
- Images are uploaded to Cloudflare R2 using the `r2Service`
- The resulting R2 URL is stored in InstantDB fields like `profileImage`, `image`, etc.
- URLs follow the pattern: `https://[account-id].r2.cloudflarestorage.com/[bucket]/[key]`

### 2. Image Display Process

When a component needs to display an R2 image, it follows this pattern:

```typescript
const [displayImageUrl, setDisplayImageUrl] = useState<string>('');

useEffect(() => {
  const imageUrl = formData.profileImage || peopleaProfile?.profileImage;
  
  if (imageUrl) {
    if (imageUrl.includes('r2.cloudflarestorage.com')) {
      // Generate signed URL for R2 images
      const generateSignedUrl = async () => {
        try {
          const key = r2Service.extractKeyFromUrl(imageUrl);
          if (key) {
            const signedUrl = await r2Service.getSignedUrl(key, 3600);
            if (signedUrl) {
              setDisplayImageUrl(signedUrl);
              Image.prefetch(signedUrl); // Cache the image
            } else {
              setDisplayImageUrl(imageUrl); // Fallback to original URL
            }
          }
        } catch (error) {
          setDisplayImageUrl(imageUrl); // Fallback on error
        }
      };
      generateSignedUrl();
    } else {
      // Use non-R2 URLs directly
      setDisplayImageUrl(imageUrl);
      Image.prefetch(imageUrl);
    }
  } else {
    setDisplayImageUrl('');
  }
}, [imageUrl]);
```

### 3. Image Component Usage

```typescript
<Image
  source={
    displayImageUrl && displayImageUrl.length > 0
      ? { uri: displayImageUrl }
      : require('../../assets/adaptive-icon.png') // Fallback image
  }
  style={{ width: 120, height: 120 }}
  resizeMode="cover"
/>
```

## Key Components

### R2 Service Methods

#### `extractKeyFromUrl(url: string): string | null`
- Extracts the object key from an R2 URL
- Used to get the key needed for signed URL generation

#### `getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null>`
- Generates a signed URL for secure access to private R2 objects
- Default expiration is 1 hour (3600 seconds)
- Returns null if generation fails

#### `getAccessibleUrl(key: string): Promise<string | null>`
- Wrapper method that always uses signed URLs for private buckets
- Provides a consistent interface for getting accessible URLs

### URL Detection Logic

The app detects R2 URLs by checking if they contain `'r2.cloudflarestorage.com'`:

```typescript
if (imageUrl.includes('r2.cloudflarestorage.com')) {
  // Handle as R2 URL - generate signed URL
} else {
  // Handle as regular URL - use directly
}
```

## Implementation Examples

### Profile Images
- **Location**: `src/screens/profile.tsx`, `src/app/index.tsx`
- **Database Field**: `profileImage` in user/peoplea records
- **Display**: Avatar images in profile screen and dashboard header

### Product Images
- **Location**: `src/components/prod-form.tsx`
- **Database Field**: `image` in product records
- **Display**: Product thumbnails and detail images

### Collection Images
- **Location**: `src/components/col-form.tsx`
- **Database Field**: `image` in collection records
- **Display**: Collection cover images

## Security Considerations

### Private Bucket Access
- R2 bucket is configured as private
- All access requires signed URLs for security
- Signed URLs expire after 1 hour by default

### Fallback Handling
- If signed URL generation fails, falls back to original URL
- If no image is available, shows default placeholder image
- Error handling prevents app crashes from image loading issues

### Image Caching
- Uses `Image.prefetch()` to cache images locally
- Improves performance and reduces network requests
- Works with both signed URLs and regular URLs

## Performance Optimizations

### Signed URL Caching
- Signed URLs are generated once and reused until expiration
- Component state (`displayImageUrl`) prevents regeneration on re-renders

### Image Prefetching
- Images are prefetched immediately after URL generation
- Reduces loading time when images are actually displayed

### Error Recovery
- Multiple fallback levels prevent broken image displays
- Graceful degradation maintains app functionality

## Configuration

### Environment Variables
R2 configuration is managed through environment variables:
- `EXPO_PUBLIC_R2_ACCOUNT_ID`
- `EXPO_PUBLIC_R2_ACCESS_KEY_ID`
- `EXPO_PUBLIC_R2_SECRET_ACCESS_KEY`
- `EXPO_PUBLIC_R2_BUCKET_NAME`
- `EXPO_PUBLIC_R2_ENDPOINT`

### URL Structure
Generated R2 URLs follow this pattern:
```
https://[account-id].r2.cloudflarestorage.com/[bucket-name]/[structured-path]
```

Where structured path includes:
- User ID (sanitized)
- Category (products, collections, etc.)
- Random number for uniqueness
- Original filename (sanitized)

## Troubleshooting

### Common Issues

1. **Images not loading**: Check R2 configuration and network connectivity
2. **Signed URL generation fails**: Verify R2 credentials and permissions
3. **Images show briefly then disappear**: Signed URL may have expired
4. **Slow image loading**: Check network connection and consider image optimization

### Debug Information
The app includes logging for image operations:
- Upload success/failure
- Signed URL generation
- Image loading errors
- Performance metrics

This system ensures secure, efficient display of images stored in Cloudflare R2 while maintaining good user experience through caching and fallback mechanisms.