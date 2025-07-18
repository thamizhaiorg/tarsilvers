# R2 Profile Image Upload Setup Guide

## Overview
This document outlines the complete setup and implementation of Cloudflare R2 storage for profile image uploads in the TAR POS application. The system handles image upload, storage, and display with proper error handling and signed URL generation for private buckets.

## Architecture

### Components
- **R2 Service** (`src/lib/r2-service.ts`) - Core upload/download functionality
- **R2 Config** (`src/lib/r2-config.ts`) - Configuration and URL generation
- **Profile Screen** (`src/screens/peoplea.tsx`) - Image upload UI
- **Menu Component** (`src/components/menu.tsx`) - Image display in menu

### Data Flow
1. User selects image → Image Picker
2. Image uploaded to R2 → Signed URL generated
3. R2 URL saved to InstantDB → Profile updated
4. Image displayed using signed URLs → Automatic refresh

## Environment Configuration

### Required Environment Variables
```env
# Cloudflare R2 Configuration
EXPO_PUBLIC_R2_ACCOUNT_ID=your-account-id
EXPO_PUBLIC_R2_ACCESS_KEY_ID=your-access-key
EXPO_PUBLIC_R2_SECRET_ACCESS_KEY=your-secret-key
EXPO_PUBLIC_R2_BUCKET_NAME=your-bucket-name
EXPO_PUBLIC_R2_REGION=auto
EXPO_PUBLIC_R2_ENDPOINT=https://your-endpoint.r2.cloudflarestorage.com
```

### R2 Bucket Setup
- **Bucket Type**: Private (default)
- **Access**: Via signed URLs only
- **CORS**: Configured for web access if needed
- **Lifecycle**: Optional - set expiration for old files

## Implementation Details

### 1. R2 Service (`src/lib/r2-service.ts`)

#### Key Features
- **Error Categorization**: Configuration, Network, File Read, Server errors
- **File Reading**: React Native compatible with multiple fallback methods
- **Signed URLs**: 1-hour expiry for secure access
- **Structured Paths**: Organized file storage with user/category structure

#### Upload Process
```typescript
async uploadFile(file: MediaFile, prefix: string = 'media'): Promise<UploadResult>
```

**Steps:**
1. Validate client initialization and file input
2. Generate unique file key with timestamp and random ID
3. Read file content (arrayBuffer → blob fallback)
4. Upload to R2 using S3-compatible API
5. Generate public URL (placeholder for signed URL generation)
6. Return success result with URL and key

#### Error Handling
```typescript
enum UploadErrorType {
  CONFIGURATION = 'configuration',
  NETWORK = 'network', 
  FILE_READ = 'file_read',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}
```

### 2. Profile Image Upload (`src/screens/peoplea.tsx`)

#### Upload Flow
1. **Permission Check**: Request media library access
2. **Image Selection**: Launch image picker with 1:1 aspect ratio
3. **Immediate Preview**: Show local image for better UX
4. **Upload Process**: 
   - Validate R2 configuration
   - Upload to R2 with 'profiles' prefix
   - Update form data with R2 URL
5. **Error Recovery**: Revert to original image on failure

#### Error User Experience
- **Configuration Error**: "Storage not configured, contact support"
- **Network Error**: "Check connection" + Retry option
- **File Error**: "Try different image"
- **Server Error**: "Try again later" + Retry option

#### Signed URL Generation
```typescript
useEffect(() => {
  const generateDisplayUrl = async () => {
    if (formData.profileImage?.includes('r2.cloudflarestorage.com')) {
      const key = r2Service.extractKeyFromUrl(formData.profileImage);
      const signedUrl = await r2Service.getSignedUrl(key, 3600);
      setDisplayImageUrl(signedUrl || formData.profileImage);
    }
  };
  generateDisplayUrl();
}, [formData.profileImage]);
```

### 3. Menu Display (`src/components/menu.tsx`)

#### Image Display Logic
- Same signed URL generation as profile screen
- Fallback to empty gray circle (no placeholder text)
- Error handling with console logging
- Automatic refresh when profile updates

## File Structure

```
src/
├── lib/
│   ├── r2-service.ts          # Core R2 functionality
│   ├── r2-config.ts           # Configuration & URL generation
│   └── auth-context.tsx       # Profile data management
├── screens/
│   └── peoplea.tsx            # Profile editing with image upload
├── components/
│   └── menu.tsx               # Menu with profile image display
└── __tests__/
    └── manual-validation.md   # Testing guide
```

## Key Technical Decisions

### 1. Private Bucket + Signed URLs
**Why**: Security and access control
- Images not publicly accessible
- Signed URLs expire (1 hour)
- Can revoke access if needed

### 2. Error Categorization
**Why**: Better user experience
- Specific error messages for different failure types
- Retry options for recoverable errors
- Clear guidance for users

### 3. Immediate Preview
**Why**: Better UX during upload
- Show local image immediately
- Revert on upload failure
- Loading states with spinner

### 4. React Native File Reading
**Why**: Cross-platform compatibility
- ArrayBuffer primary method
- Blob fallback for compatibility
- Error handling for each method

## Common Issues & Solutions

### 1. Images Not Displaying
**Cause**: Using direct R2 URLs instead of signed URLs
**Solution**: Always generate signed URLs for display

### 2. Upload Failures
**Cause**: Various (network, config, file issues)
**Solution**: Comprehensive error categorization and user feedback

### 3. File Reading Errors
**Cause**: React Native file access differences
**Solution**: Multiple fallback methods (arrayBuffer → blob)

### 4. CORS Issues (Web)
**Cause**: Browser security restrictions
**Solution**: Configure R2 bucket CORS settings

## Security Considerations

### 1. Environment Variables
- Never commit R2 credentials to version control
- Use Expo's secure environment variable system
- Rotate keys regularly

### 2. Signed URLs
- Short expiry times (1 hour)
- Generate on-demand, not stored
- Automatic refresh when needed

### 3. File Validation
- Validate file types and sizes
- Sanitize file names
- Check file content integrity

## Performance Optimizations

### 1. Image Compression
- Quality: 0.8 (80% quality)
- Aspect ratio: 1:1 for profiles
- Remove EXIF data

### 2. Caching Strategy
- Signed URLs cached in component state
- Automatic refresh on profile updates
- Memory management for large images

### 3. Upload Optimization
- Show immediate preview
- Background upload process
- Progress indicators

## Testing Strategy

### Manual Testing Checklist
- [ ] Successful upload and display
- [ ] Network error handling
- [ ] File error handling
- [ ] Configuration error handling
- [ ] Image reversion on failure
- [ ] Signed URL generation
- [ ] Cross-screen image display
- [ ] Loading states

### Automated Testing
- Unit tests for R2Service methods
- Integration tests for upload flow
- Error scenario testing
- Mock R2 responses

## Deployment Considerations

### 1. Environment Setup
- Configure R2 bucket and credentials
- Set up environment variables in deployment
- Test configuration validation

### 2. Monitoring
- Track upload success/failure rates
- Monitor signed URL generation
- Log error patterns for debugging

### 3. Backup Strategy
- Regular bucket backups
- Image cleanup policies
- Disaster recovery procedures

## Future Enhancements

### 1. Image Processing
- Automatic resizing/optimization
- Multiple image sizes (thumbnails)
- Format conversion (WebP support)

### 2. Advanced Features
- Image cropping interface
- Multiple image support
- Batch upload capabilities

### 3. Performance
- CDN integration
- Progressive image loading
- Offline image caching

## Troubleshooting

### Common Error Messages

#### "R2 client not initialized"
- Check environment variables
- Verify R2 configuration
- Ensure validateR2Config() returns true

#### "Failed to read file"
- Check file permissions
- Verify file exists and is accessible
- Try different image format

#### "Network request failed"
- Check internet connection
- Verify R2 endpoint URL
- Check firewall/proxy settings

#### "Invalid access key credentials"
- Verify R2 access key and secret
- Check account ID and bucket name
- Ensure credentials have proper permissions

### Debug Logging
Enable detailed logging by checking console output:
- Upload process steps
- Signed URL generation
- Error categorization
- File reading attempts

## Conclusion

This R2 profile image setup provides a robust, secure, and user-friendly image upload system with comprehensive error handling and optimal user experience. The implementation follows React Native best practices and provides a solid foundation for future image-related features.