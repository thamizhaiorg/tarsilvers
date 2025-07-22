import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Config, validateR2Config, generateFileKey, getPublicUrl } from './r2-config';
import { log, trackError, PerformanceMonitor } from './logger';

export enum UploadErrorType {
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  FILE_READ = 'file_read',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  errorType?: UploadErrorType;
}

export interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

class R2Service {
  private client: S3Client | null = null;

  constructor() {
    this.initializeClient();
  }

  // Debug method to check configuration
  getConfigurationStatus(): { isValid: boolean; missingFields: string[]; config: Partial<R2Config> } {
    const missingFields: string[] = [];
    const config: Partial<R2Config> = {};

    // Check each required field
    if (!r2Config.accountId) missingFields.push('accountId');
    else config.accountId = r2Config.accountId.substring(0, 8) + '...'; // Show partial for security

    if (!r2Config.accessKeyId) missingFields.push('accessKeyId');
    else config.accessKeyId = r2Config.accessKeyId.substring(0, 8) + '...';

    if (!r2Config.secretAccessKey) missingFields.push('secretAccessKey');
    else config.secretAccessKey = '***';

    if (!r2Config.bucketName) missingFields.push('bucketName');
    else config.bucketName = r2Config.bucketName;

    if (!r2Config.endpoint) missingFields.push('endpoint');
    else config.endpoint = r2Config.endpoint;

    config.region = r2Config.region;

    return {
      isValid: missingFields.length === 0,
      missingFields,
      config
    };
  }

  private initializeClient() {
    if (!validateR2Config()) {
      return;
    }

    this.client = new S3Client({
      region: r2Config.region,
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true, // Required for R2
    });
  }

  async uploadFile(file: MediaFile, prefix: string = 'media'): Promise<UploadResult> {
    // Check client initialization
    if (!this.client) {
      const configValid = validateR2Config();
      return {
        success: false,
        error: `R2 client not initialized - ${configValid ? 'client initialization failed' : 'configuration missing or invalid'}`,
        errorType: UploadErrorType.CONFIGURATION
      };
    }

    // Validate file input
    if (!file || !file.uri) {
      return { 
        success: false, 
        error: 'Invalid file provided', 
        errorType: UploadErrorType.FILE_READ 
      };
    }

    try {
      // Generate unique key for the file
      const key = generateFileKey(file.name, prefix);

      // Read file content with improved error handling
      let body: Uint8Array;
      try {
        const response = await fetch(file.uri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        // Try arrayBuffer first (most reliable for React Native)
        try {
          const arrayBuffer = await response.arrayBuffer();
          body = new Uint8Array(arrayBuffer);
        } catch (arrayBufferError) {
          // Fallback to blob
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          body = new Uint8Array(arrayBuffer);
        }
      } catch (fileReadError) {
        return {
          success: false,
          error: `Failed to read file: ${fileReadError instanceof Error ? fileReadError.message : 'Unknown file read error'}`,
          errorType: UploadErrorType.FILE_READ
        };
      }

      // Validate file content
      if (!body || body.byteLength === 0) {
        return {
          success: false,
          error: 'File appears to be empty or corrupted',
          errorType: UploadErrorType.FILE_READ
        };
      }

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: body,
        ContentType: file.type,
        ContentLength: body.byteLength,
      });

      await this.client.send(command);

      // Generate public URL
      const url = getPublicUrl(key);

      return { success: true, url, key };

    } catch (error) {
      // Categorize error type
      const errorType = this.categorizeError(error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      trackError(error as Error, 'R2Service', {
        fileName: file.name,
        fileSize: file.size,
        errorType
      });

      return {
        success: false,
        error: errorMessage,
        errorType
      };
    }
  }

  private categorizeError(error: unknown): UploadErrorType {
    if (!error) return UploadErrorType.UNKNOWN;

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Configuration errors
    if (errorMessage.includes('credentials') || 
        errorMessage.includes('access denied') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('invalid access key') ||
        errorMessage.includes('signature')) {
      return UploadErrorType.CONFIGURATION;
    }

    // Network errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('enotfound') ||
        errorMessage.includes('econnrefused')) {
      return UploadErrorType.NETWORK;
    }

    // File reading errors
    if (errorMessage.includes('file') && 
        (errorMessage.includes('read') || errorMessage.includes('access') || errorMessage.includes('not found'))) {
      return UploadErrorType.FILE_READ;
    }

    // Server errors (5xx status codes)
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') || 
        errorMessage.includes('504') ||
        errorMessage.includes('internal server error')) {
      return UploadErrorType.SERVER;
    }

    return UploadErrorType.UNKNOWN;
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;

    } catch (error) {
      return false;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;

    } catch (error) {
      return false;
    }
  }

  // Upload multiple files
  async uploadFiles(files: MediaFile[], prefix: string = 'media'): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await this.uploadFile(file, prefix);
      results.push(result);
    }

    return results;
  }

  // Extract key from URL
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // Remove leading slash
      return key;
    } catch (error) {
      return null;
    }
  }

  // Generate structured path for file management
  generateStructuredPath(
    userId: string,
    category: string,
    fileName: string | undefined,
    reference?: string
  ): string {
    // Sanitize user ID (remove symbols)
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '');

    // Sanitize category name (lowercase, no spaces/symbols)
    let sanitizedCategory = (category || 'general').toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

    // If reference is provided, use it to determine more specific category
    if (reference) {
      if (reference.includes('product')) sanitizedCategory = 'products';
      else if (reference.includes('collection')) sanitizedCategory = 'collections';
      else if (reference.includes('option')) sanitizedCategory = 'options';
    }

    // Generate random number for uniqueness
    const randomNumber = Math.floor(Math.random() * 1000000000);

    // Clean filename (remove spaces and special characters, keep extension)
    const safeName = fileName || `file_${Date.now()}`;
    const cleanFileName = safeName.toLowerCase().replace(/[^a-zA-Z0-9.-]/g, '');

    return `${sanitizedUserId}/${sanitizedCategory}/${randomNumber}/${cleanFileName}`;
  }

  // Upload file with structured path
  async uploadFileWithStructuredPath(
    file: MediaFile,
    userId: string,
    category: string,
    reference?: string
  ): Promise<UploadResult> {
    const structuredPath = this.generateStructuredPath(userId, category, file.name, reference);

    // Use the structured path as the key directly
    return this.uploadFileWithCustomKey(file, structuredPath);
  }

  // Upload file with custom key (internal method)
  private async uploadFileWithCustomKey(file: MediaFile, key: string): Promise<UploadResult> {
    // Check client initialization
    if (!this.client) {
      return { 
        success: false, 
        error: 'R2 client not initialized - check configuration', 
        errorType: UploadErrorType.CONFIGURATION 
      };
    }

    // Validate file input
    if (!file || !file.uri) {
      return { 
        success: false, 
        error: 'Invalid file provided', 
        errorType: UploadErrorType.FILE_READ 
      };
    }

    try {
      // Read file content with improved error handling
      let body: Uint8Array;
      try {
        const response = await fetch(file.uri);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        // Try arrayBuffer first (most reliable for React Native)
        try {
          const arrayBuffer = await response.arrayBuffer();
          body = new Uint8Array(arrayBuffer);
        } catch (arrayBufferError) {
          // Fallback to blob
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          body = new Uint8Array(arrayBuffer);
        }
      } catch (fileReadError) {
        return {
          success: false,
          error: `Failed to read file: ${fileReadError instanceof Error ? fileReadError.message : 'Unknown file read error'}`,
          errorType: UploadErrorType.FILE_READ
        };
      }

      // Validate file content
      if (!body || body.byteLength === 0) {
        return {
          success: false,
          error: 'File appears to be empty or corrupted',
          errorType: UploadErrorType.FILE_READ
        };
      }

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: body,
        ContentType: file.type,
        ContentLength: body.byteLength,
      });

      await this.client.send(command);

      // Generate public URL
      const url = getPublicUrl(key);

      return { success: true, url, key };

    } catch (error) {
      // Categorize error type
      const errorType = this.categorizeError(error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      trackError(error as Error, 'R2Service', {
        fileName: file.name,
        fileSize: file.size,
        customKey: key,
        errorType
      });

      return {
        success: false,
        error: errorMessage,
        errorType
      };
    }
  }

  // Generate signed URL for reading files (for private buckets)
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      return null;
    }
  }

  // Get accessible URL (signed URL for private buckets, public URL for public buckets)
  async getAccessibleUrl(key: string): Promise<string | null> {
    // For now, always use signed URLs since the bucket appears to be private
    return this.getSignedUrl(key);
  }

  // File management utilities

  // Replace existing file (delete old, upload new)
  async replaceFile(
    oldKey: string,
    newFile: MediaFile,
    userId: string,
    category: string,
    reference?: string
  ): Promise<UploadResult> {
    try {
      // Upload new file first
      const uploadResult = await this.uploadFileWithStructuredPath(newFile, userId, category, reference);

      if (uploadResult.success) {
        // Delete old file after successful upload
        await this.deleteFile(oldKey);
      }

      return uploadResult;
    } catch (error) {
      trackError(error as Error, 'R2Service', {
        oldKey,
        newFileName: newFile.name
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File replacement failed'
      };
    }
  }

  // Check if file is referenced (utility for safe deletion)
  async isFileReferenced(fileUrl: string, db: any): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      if (!key) return false;

      // Check if file is referenced in products, collections, or options
      // This would need to be implemented based on your specific schema
      // For now, return true to prevent accidental deletion
      return true;
    } catch (error) {
      log.error('Error checking file references', 'R2Service', { error });
      return true; // Err on the side of caution
    }
  }

  // Batch delete files (for cleanup operations)
  async deleteFiles(keys: string[]): Promise<{ success: boolean; deletedKeys: string[]; errors: string[] }> {
    const deletedKeys: string[] = [];
    const errors: string[] = [];

    for (const key of keys) {
      try {
        const success = await this.deleteFile(key);
        if (success) {
          deletedKeys.push(key);
        } else {
          errors.push(`Failed to delete ${key}`);
        }
      } catch (error) {
        errors.push(`Error deleting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      deletedKeys,
      errors
    };
  }

  // Get file metadata without downloading
  async getFileMetadata(key: string): Promise<{ size?: number; lastModified?: Date; contentType?: string } | null> {
    if (!this.client) {
      return null;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType
      };
    } catch (error) {
      log.error(`Failed to get metadata for ${key}`, 'R2Service', { error });
      return null;
    }
  }

  // Generate unique handle for file entity
  generateFileHandle(fileName: string | undefined, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);

    // Handle undefined or null fileName
    const safeName = fileName || `file_${timestamp}`;
    const cleanName = safeName.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    const nameWithoutExt = cleanName.split('.')[0];

    return `${sanitizedUserId}-${nameWithoutExt}-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const r2Service = new R2Service();
export default r2Service;