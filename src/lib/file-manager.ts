import { db, getCurrentTimestamp } from './instant';
import { r2Service } from './r2-service';
import { id } from '@instantdb/react-native';
import { log, trackError } from './logger';

export interface FileRecord {
  id: string;
  title: string;
  url: string;
  handle: string;
  alt?: string;
  type: string;
  size: number;
  reference?: string;
  dateAdded: Date;
  storeId: string;
  userId?: string;
}

export interface FileUploadOptions {
  storeId: string;
  userId?: string;
  category: string;
  reference?: string;
  title?: string;
  alt?: string;
}

export interface FileReplaceOptions extends FileUploadOptions {
  existingFileId: string;
}

export class FileManager {
  
  // Create a new file record in the database
  async createFileRecord(
    file: any,
    uploadResult: any,
    options: FileUploadOptions
  ): Promise<FileRecord> {
    const fileId = id();
    const handle = r2Service.generateFileHandle(file.name, options.userId);

    // Creating file record with metadata

    // Fix file type - ensure proper MIME type
    let fileType = file.type || file.mimeType || 'application/octet-stream';
    if (fileType === 'image') {
      fileType = 'image/jpeg'; // Default to JPEG for generic "image" type
    } else if (fileType === 'video') {
      fileType = 'video/mp4'; // Default to MP4 for generic "video" type
    }

    const fileRecord: FileRecord = {
      id: fileId,
      title: options.title || file.name,
      url: uploadResult.url,
      handle,
      alt: options.alt || '',
      type: fileType,
      size: file.size || 0,
      reference: options.reference || '',
      dateAdded: getCurrentTimestamp(),
      storeId: options.storeId,
      ...(options.userId && { userId: options.userId })
    };

    // File record prepared for saving

    await db.transact([
      db.tx.files[fileId].update(fileRecord)
    ]);

    log.info('File record created', 'FileManager', { fileId, handle });
    return fileRecord;
  }

  // Upload a new file and create database record
  async uploadFile(file: any, options: FileUploadOptions): Promise<{ success: boolean; fileRecord?: FileRecord; error?: string }> {
    try {
      // Upload to R2 with structured path
      const uploadResult = await r2Service.uploadFileWithStructuredPath(
        file,
        options.userId,
        options.category,
        options.reference
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Create database record
      const fileRecord = await this.createFileRecord(file, uploadResult, options);

      return { success: true, fileRecord };
    } catch (error) {
      trackError(error as Error, 'FileManager', { fileName: file.name });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  // Replace an existing file
  async replaceFile(
    newFile: any, 
    options: FileReplaceOptions
  ): Promise<{ success: boolean; fileRecord?: FileRecord; error?: string }> {
    try {
      // Get existing file record
      const { data: existingData } = await db.useQuery({
        files: {
          $: { where: { id: options.existingFileId } }
        }
      });

      const existingFile = existingData?.files?.[0];
      if (!existingFile) {
        return { success: false, error: 'Existing file not found' };
      }

      // Extract old key from URL
      const oldKey = r2Service.extractKeyFromUrl(existingFile.url);

      // Upload new file with structured path
      const uploadResult = await r2Service.uploadFileWithStructuredPath(
        newFile,
        options.userId,
        options.category,
        options.reference
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Update existing file record
      const updatedRecord: Partial<FileRecord> = {
        title: options.title || newFile.name,
        url: uploadResult.url,
        alt: options.alt || existingFile.alt,
        type: newFile.type || newFile.mimeType || 'application/octet-stream',
        size: newFile.size || 0,
        reference: options.reference || existingFile.reference,
        dateAdded: getCurrentTimestamp() // Update date when replaced
      };

      await db.transact([
        db.tx.files[options.existingFileId].update(updatedRecord)
      ]);

      // Delete old file from R2 (if key exists)
      if (oldKey) {
        await r2Service.deleteFile(oldKey);
      }

      const fileRecord = { ...existingFile, ...updatedRecord } as FileRecord;
      log.info('File replaced successfully', 'FileManager', { 
        fileId: options.existingFileId, 
        oldKey, 
        newKey: uploadResult.key 
      });

      return { success: true, fileRecord };
    } catch (error) {
      trackError(error as Error, 'FileManager', { 
        fileId: options.existingFileId,
        fileName: newFile.name 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Replace failed' 
      };
    }
  }

  // Get files by reference (static method for use outside React components)
  async getFilesByReference(reference: string, storeId: string): Promise<FileRecord[]> {
    try {
      // Since we can't use useQuery outside React components, we'll need to implement this differently
      // For now, return empty array - this would need to be called from within a React component
      log.warn('getFilesByReference called outside React component context', 'FileManager');
      return [];
    } catch (error) {
      log.error('Failed to get files by reference', 'FileManager', { reference, error });
      return [];
    }
  }

  // Check if a file is referenced by any entity
  async isFileReferenced(fileId: string, storeId: string): Promise<boolean> {
    try {
      // For now, always return true to prevent accidental deletion
      // This would need to be implemented with proper database queries
      // that can be called outside React component context
      log.warn('isFileReferenced called - returning true for safety', 'FileManager', { fileId });
      return true;
    } catch (error) {
      log.error('Error checking file references', 'FileManager', { fileId, error });
      return true; // Err on the side of caution
    }
  }

  // Safe delete - only delete if not referenced
  async safeDeleteFile(fileId: string, storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if file is referenced
      const isReferenced = await this.isFileReferenced(fileId, storeId);
      if (isReferenced) {
        return { 
          success: false, 
          error: 'File is still referenced and cannot be deleted' 
        };
      }

      // For now, skip the database query since we can't use useQuery outside React
      // This method should be called from within a React component that can provide the file data
      log.warn('safeDeleteFile called outside React component context', 'FileManager');
      return { success: false, error: 'Method must be called from React component context' };
      if (!file) {
        return { success: false, error: 'File not found' };
      }

      // Extract key and delete from R2
      const key = r2Service.extractKeyFromUrl(file.url);
      if (key) {
        await r2Service.deleteFile(key);
      }

      // Delete from database
      await db.transact([
        db.tx.files[fileId].delete()
      ]);

      log.info('File safely deleted', 'FileManager', { fileId, key });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'FileManager', { fileId });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      };
    }
  }

  // Cleanup unreferenced files (maintenance operation)
  async cleanupUnreferencedFiles(storeId: string): Promise<{ 
    deletedCount: number; 
    errors: string[]; 
    skippedCount: number 
  }> {
    let deletedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    try {
      // For now, skip cleanup since we can't use useQuery outside React
      log.warn('cleanupUnreferencedFiles called outside React component context', 'FileManager');
      return { deletedCount: 0, errors: ['Method must be called from React component context'], skippedCount: 0 };

      for (const file of files) {
        try {
          const isReferenced = await this.isFileReferenced(file.id, storeId);
          
          if (!isReferenced) {
            const result = await this.safeDeleteFile(file.id, storeId);
            if (result.success) {
              deletedCount++;
            } else {
              errors.push(`Failed to delete ${file.title}: ${result.error}`);
            }
          } else {
            skippedCount++;
          }
        } catch (error) {
          errors.push(`Error processing ${file.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      log.info('Cleanup completed', 'FileManager', { 
        deletedCount, 
        skippedCount, 
        errorCount: errors.length 
      });

      return { deletedCount, errors, skippedCount };
    } catch (error) {
      trackError(error as Error, 'FileManager', { storeId });
      return { 
        deletedCount, 
        errors: [error instanceof Error ? error.message : 'Cleanup failed'], 
        skippedCount 
      };
    }
  }

  // Update file metadata
  async updateFileMetadata(
    fileId: string, 
    updates: Partial<Pick<FileRecord, 'title' | 'alt' | 'reference'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.transact([
        db.tx.files[fileId].update(updates)
      ]);

      log.info('File metadata updated', 'FileManager', { fileId, updates });
      return { success: true };
    } catch (error) {
      trackError(error as Error, 'FileManager', { fileId, updates });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      };
    }
  }
}

export const fileManager = new FileManager();
export default fileManager;
