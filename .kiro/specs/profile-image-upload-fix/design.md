# Design Document

## Overview

The profile image upload functionality is failing because the R2 service's `uploadFile` method is returning `undefined` instead of a proper `UploadResult` object. The root cause appears to be in the complex nested async function structure within the `uploadFile` method, which may be causing execution flow issues or scope problems.

The fix involves simplifying the R2 service method structure, improving error handling, and ensuring consistent return values. Additionally, we'll enhance the profile screen's error handling to provide better user feedback.

## Architecture

### Current Issues Identified

1. **Complex Nested Structure**: The `uploadFile` method uses an immediately invoked async function expression (IIFE) that may be causing execution flow issues
2. **Inconsistent Return Handling**: The method structure makes it difficult to guarantee proper return values
3. **Error Handling Gaps**: Some error paths may not be properly returning structured responses
4. **React Native File Handling**: Multiple fallback approaches for file reading may be causing confusion

### Proposed Solution Architecture

```
PeopleaScreen
    ↓ (calls)
R2Service.uploadFile() [SIMPLIFIED]
    ↓ (returns)
UploadResult { success, url?, error? }
    ↓ (handled by)
PeopleaScreen Error/Success Handling
```

## Components and Interfaces

### R2Service Modifications

**Current Method Structure:**
```typescript
async uploadFile(file: MediaFile, prefix: string): Promise<UploadResult> {
  // Complex nested IIFE structure
  return await (async () => {
    // File processing logic
  });
}
```

**Proposed Simplified Structure:**
```typescript
async uploadFile(file: MediaFile, prefix: string): Promise<UploadResult> {
  // Direct implementation without nested functions
  // Clear error handling with guaranteed return values
}
```

### Enhanced Error Handling Interface

```typescript
interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  errorType?: 'config' | 'network' | 'file' | 'server' | 'unknown';
}
```

### PeopleaScreen Integration

The profile screen will be updated to handle the improved error responses and provide better user feedback based on error types.

## Data Models

### MediaFile Interface (Existing)
```typescript
interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}
```

### Enhanced UploadResult Interface
```typescript
interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  errorType?: 'config' | 'network' | 'file' | 'server' | 'unknown';
}
```

## Error Handling

### R2 Service Error Categories

1. **Configuration Errors**: Missing or invalid R2 configuration
2. **Network Errors**: Connectivity issues, timeouts
3. **File Errors**: Invalid file format, size issues, read failures
4. **Server Errors**: R2/S3 API errors, authentication failures
5. **Unknown Errors**: Unexpected errors that don't fit other categories

### Error Response Structure

Each error will include:
- Clear error message for user display
- Error type for programmatic handling
- Success flag for consistent response structure

### PeopleaScreen Error Handling

- Configuration errors: Guide user to contact support
- Network errors: Suggest retry and check connection
- File errors: Provide specific guidance (file size, format)
- Server errors: Generic retry message
- Unknown errors: Generic error with retry option

## Testing Strategy

### Unit Tests for R2Service

1. **Successful Upload Test**: Verify proper UploadResult with success=true and URL
2. **Configuration Error Test**: Test behavior when R2 config is invalid
3. **Network Error Test**: Mock network failures and verify error handling
4. **File Read Error Test**: Test various file reading failure scenarios
5. **Server Error Test**: Mock S3 API errors and verify response structure

### Integration Tests for PeopleaScreen

1. **Successful Image Upload Flow**: End-to-end test of image selection and upload
2. **Error Handling Flow**: Test various error scenarios and user feedback
3. **Loading State Test**: Verify loading indicators and disabled states
4. **Image Revert Test**: Verify image reverts to previous state on error

### Manual Testing Scenarios

1. **Happy Path**: Select image, upload successfully, verify display
2. **Network Offline**: Test behavior when device is offline
3. **Large File**: Test with large image files
4. **Invalid File**: Test with non-image files
5. **Configuration Issues**: Test with invalid R2 configuration

## Implementation Approach

### Phase 1: R2 Service Simplification
- Simplify the `uploadFile` method structure
- Remove nested async functions
- Implement direct, linear execution flow
- Add comprehensive error handling with typed responses

### Phase 2: Enhanced Error Handling
- Add error type categorization
- Improve error messages for user display
- Ensure all code paths return proper UploadResult objects

### Phase 3: PeopleaScreen Integration
- Update error handling to use new error types
- Improve user feedback messages
- Add retry mechanisms where appropriate

### Phase 4: Testing and Validation
- Add comprehensive unit tests
- Test all error scenarios
- Validate with real device testing