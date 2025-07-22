import { useMemo, useEffect } from 'react';
import { db } from '../lib/instant';
import { useStore } from '../lib/store-context';
import { fileManager, FileRecord } from '../lib/file-manager';
import { log } from '../lib/logger';

export interface UseFilesOptions {
  reference?: string;
  type?: 'images' | 'videos' | 'documents' | 'all';
}

export interface UseFilesResult {
  files: FileRecord[];
  isLoading: boolean;
  error: any;
  uploadFile: (file: any, options?: { reference?: string; title?: string; alt?: string }) => Promise<{ success: boolean; fileRecord?: FileRecord; error?: string }>;
  replaceFile: (existingFileId: string, newFile: any, options?: { reference?: string; title?: string; alt?: string }) => Promise<{ success: boolean; fileRecord?: FileRecord; error?: string }>;
  updateFileMetadata: (fileId: string, updates: Partial<Pick<FileRecord, 'title' | 'alt' | 'reference'>>) => Promise<{ success: boolean; error?: string }>;
  getFilesByReference: (reference: string) => FileRecord[];
  isFileReferenced: (fileId: string) => boolean;
}

export function useFiles(options: UseFilesOptions = {}): UseFilesResult {
  const { user } = db.useAuth();

  // Query all files (no store filtering needed)
  const query = {
    files: {}
  };

  // Removed debug log

  const { data: filesData, isLoading, error } = db.useQuery(query);

  const allFiles = filesData?.files || [];

  // Log files data for debugging
  useEffect(() => {
    // Removed debug logs
  }, [allFiles.length, isLoading, error, options]); // Removed currentStore dependency

  // Filter files based on options
  const files = useMemo(() => {
    let filtered = allFiles;
    // Removed debug logs
    // Filter by reference
    if (options.reference) {
      filtered = filtered.filter(file => file.reference === options.reference);
    }

    // Filter by type
    if (options.type && options.type !== 'all') {
      filtered = filtered.filter(file => {
        if (options.type === 'images') {
          return file.type.startsWith('image/') || file.type === 'image';
        }
        if (options.type === 'videos') {
          return file.type.startsWith('video/') || file.type === 'video';
        }
        if (options.type === 'documents') {
          return !file.type.startsWith('image/') &&
                 !file.type.startsWith('video/') &&
                 file.type !== 'image' &&
                 file.type !== 'video';
        }
        return true;
      });
    }

    // Sort by date added (newest first)
    const sorted = filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    return sorted;
  }, [allFiles, options.reference, options.type]);

  // Upload file function
  const uploadFile = async (
    file: any,
    uploadOptions: { reference?: string; title?: string; alt?: string } = {}
  ) => {
    if (!user) {
      return { success: false, error: 'User must be authenticated to upload files' };
    }

    const fileUploadOptions = {
      userId: user.id,
      category: 'general',
      reference: uploadOptions.reference || options.reference || '',
      title: uploadOptions.title || file.name || `file_${Date.now()}`,
      alt: uploadOptions.alt || ''
    };

    return await fileManager.uploadFile(file, fileUploadOptions);
  };

  // Replace file function
  const replaceFile = async (
    existingFileId: string,
    newFile: any,
    replaceOptions: { reference?: string; title?: string; alt?: string } = {}
  ) => {
    if (!user) {
      return { success: false, error: 'User must be authenticated to replace files' };
    }

    const fileReplaceOptions = {
      storeId: currentStore.id,
      userId: user.id,
      category: 'general',
      reference: replaceOptions.reference || options.reference || '',
      title: replaceOptions.title || newFile.name || `file_${Date.now()}`,
      alt: replaceOptions.alt || '',
      existingFileId
    };

    return await fileManager.replaceFile(newFile, fileReplaceOptions);
  };

  // Update file metadata
  const updateFileMetadata = async (
    fileId: string, 
    updates: Partial<Pick<FileRecord, 'title' | 'alt' | 'reference'>>
  ) => {
    return await fileManager.updateFileMetadata(fileId, updates);
  };

  // Get files by reference (from current files list)
  const getFilesByReference = (reference: string): FileRecord[] => {
    return allFiles.filter(file => file.reference === reference);
  };

  // Check if file is referenced (basic check within current files)
  const isFileReferenced = (fileId: string): boolean => {
    const file = allFiles.find(f => f.id === fileId);
    return file ? Boolean(file.reference) : false;
  };

  return {
    files,
    isLoading,
    error,
    uploadFile,
    replaceFile,
    updateFileMetadata,
    getFilesByReference,
    isFileReferenced
  };
}

// Hook specifically for file selection/management
export function useFileSelection() {
  const { user } = db.useAuth();

  const query = {
    files: {} // No store filtering needed
  };

  // Removed debug log

  const { data: filesData, isLoading, error } = db.useQuery(query);

  const files = filesData?.files || [];

  // Log file selection data for debugging
  useEffect(() => {
    // Removed debug logs
  }, [files.length, isLoading, error]); // Removed currentStore dependency

  const getFilesByType = (type: 'images' | 'videos' | 'documents' | 'all') => {
    if (type === 'all') return files;

    return files.filter(file => {
      if (type === 'images') {
        return file.type.startsWith('image/') || file.type === 'image';
      }
      if (type === 'videos') {
        return file.type.startsWith('video/') || file.type === 'video';
      }
      if (type === 'documents') {
        return !file.type.startsWith('image/') &&
               !file.type.startsWith('video/') &&
               file.type !== 'image' &&
               file.type !== 'video';
      }
      return true;
    });
  };

  const searchFiles = (query: string, type: 'images' | 'videos' | 'documents' | 'all' = 'all') => {
    const filteredFiles = getFilesByType(type);
    // Removed debug logs
    if (!query.trim()) return filteredFiles;
    const searchQuery = query.toLowerCase();
    const searchResult = filteredFiles.filter(file =>
      file.title.toLowerCase().includes(searchQuery) ||
      file.alt?.toLowerCase().includes(searchQuery) ||
      file.reference?.toLowerCase().includes(searchQuery)
    );
    return searchResult;
  };

  const getFileById = (fileId: string) => {
    return files.find(file => file.id === fileId);
  };

  const getFileByHandle = (handle: string) => {
    return files.find(file => file.handle === handle);
  };

  return {
    files,
    isLoading,
    error,
    getFilesByType,
    searchFiles,
    getFileById,
    getFileByHandle
  };
}

export default useFiles;
