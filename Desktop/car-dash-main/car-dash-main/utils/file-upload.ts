import supabase from '@/lib/supabase';

interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

/**
 * Upload a file to Supabase storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param folder - The folder path within the bucket
 * @param fileName - Optional custom filename, if not provided, will use original name with timestamp
 * @returns Promise with upload result
 */
export const uploadFile = async (file: File, bucket: string, folder: string, fileName?: string): Promise<UploadResult> => {
    try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const finalFileName = fileName || `${Date.now()}_${file.name}`;
        const filePath = `${folder}/${finalFileName}`;

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { success: false, error: uploadError.message };
        }

        // Return relative path instead of full URL
        return { success: true, url: `/${bucket}/${filePath}` };
    } catch (error) {
        console.error('File upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown upload error',
        };
    }
};

/**
 * Upload multiple files to a specific folder in Supabase storage
 * @param files - Array of files with their intended names
 * @param bucket - The storage bucket name
 * @param folder - The folder path within the bucket
 * @returns Promise with array of upload results
 */
export const uploadMultipleFiles = async (files: { file: File; name: string }[], bucket: string, folder: string): Promise<{ [key: string]: UploadResult }> => {
    const results: { [key: string]: UploadResult } = {};

    for (const { file, name } of files) {
        results[name] = await uploadFile(file, bucket, folder, name);
    }

    return results;
};

/**
 * Delete a file from Supabase storage
 * @param bucket - The storage bucket name
 * @param filePath - The full path to the file within the bucket
 * @returns Promise with deletion result
 */
export const deleteFile = async (bucket: string, filePath: string): Promise<boolean> => {
    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('File deletion error:', error);
        return false;
    }
};

/**
 * Delete an entire folder from Supabase storage
 * @param bucket - The storage bucket name
 * @param folderPath - The folder path to delete
 * @returns Promise with deletion result
 */
export const deleteFolder = async (bucket: string, folderPath: string): Promise<boolean> => {
    try {
        // List all files in the folder
        const { data: files, error: listError } = await supabase.storage.from(bucket).list(folderPath);

        if (listError) {
            console.error('List error:', listError);
            return false;
        }

        if (!files || files.length === 0) {
            return true; // Folder is empty or doesn't exist
        }

        // Delete all files in the folder
        const filePaths = files.map((file) => `${folderPath}/${file.name}`);
        const { error: deleteError } = await supabase.storage.from(bucket).remove(filePaths);

        if (deleteError) {
            console.error('Delete folder error:', deleteError);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Folder deletion error:', error);
        return false;
    }
};

/**
 * Extract file path from a Supabase storage URL
 * @param url - The full storage URL
 * @param bucket - The storage bucket name
 * @returns The file path within the bucket, or null if invalid URL
 */
export const extractFilePathFromUrl = (url: string, bucket: string): string | null => {
    try {
        // Supabase storage URLs typically follow this pattern:
        // https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');

        // Find the bucket name in the path
        const bucketIndex = pathSegments.findIndex((segment) => segment === bucket);
        if (bucketIndex === -1 || bucketIndex === pathSegments.length - 1) {
            return null;
        }

        // Extract everything after the bucket name
        const filePath = pathSegments.slice(bucketIndex + 1).join('/');
        return filePath || null;
    } catch (error) {
        console.error('Error extracting file path from URL:', error);
        return null;
    }
};

/**
 * Get attachment type display name for UI
 * @param type - The attachment type
 * @returns Display name for the attachment type
 */
export const getAttachmentTypeDisplayName = (type: string): string => {
    const typeMap: { [key: string]: string } = {
        car_license: 'Car License',
        driver_license: 'Driver License',
        car_transfer_document: 'Car Transfer Document',
        document: 'Document',
    };
    return typeMap[type] || 'Document';
};

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if a file type is an image
 * @param mimeType - The MIME type of the file
 * @returns True if the file is an image
 */
export const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
};

/**
 * Get file icon component name based on MIME type
 * @param mimeType - The MIME type of the file
 * @returns Icon component name for the file type
 */
export const getFileIconName = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'IconImage';
    if (mimeType === 'application/pdf') return 'IconFile';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'IconNotesEdit';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'IconChartSquare';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'IconZipFile';
    if (mimeType.includes('text')) return 'IconTxtFile';
    return 'IconPaperclip';
};

/**
 * Convert relative storage path to full public URL
 * @param relativePath - The relative path stored in database (e.g., "/deals/7/image.jpg")
 * @param bucket - The storage bucket name (optional, will be extracted from path if not provided)
 * @returns Full public URL for the file
 */
export const getPublicUrlFromPath = (relativePath: string, bucket?: string): string => {
    if (!relativePath) return '';

    // Remove leading slash if present
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    // Extract bucket from path if not provided
    const pathParts = cleanPath.split('/');
    const bucketName = bucket || pathParts[0];
    const filePath = bucket ? cleanPath : pathParts.slice(1).join('/');

    // Get public URL from Supabase
    const {
        data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return publicUrl;
};
