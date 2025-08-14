# Deal File Attachments Implementation

This implementation adds file upload functionality to deals, storing files in Supabase storage with proper organization and cleanup.

## Features

✅ **File Upload System**: Upload car license, driver license, and car transfer documents when creating deals
✅ **Storage Organization**: Files are stored in the 'deals' bucket, organized by deal ID folders
✅ **Automatic Cleanup**: When a deal is deleted, its associated files are automatically removed
✅ **Bulk Delete Support**: Bulk deletion also cleans up all associated files
✅ **Error Handling**: Graceful handling of upload and deletion errors

## File Organization

```
Storage Bucket: 'deals'
├── {deal-id-1}/
│   ├── car_license.pdf
│   ├── driver_license.jpg
│   └── car_transfer_document.pdf
├── {deal-id-2}/
│   ├── car_license.png
│   └── driver_license.pdf
└── ...
```

## Database Changes

The primary column added to the `deals` table:

- `attachments` (JSONB) - Array of attachment objects with metadata

### Attachment Object Structure:

```json
{
  "type": "car_license" | "driver_license" | "car_transfer_document" | "document",
  "name": "car_license.pdf",
  "url": "/deals/123/car_license.pdf",
  "uploadedAt": "2025-06-24T10:30:00Z",
  "size": 2048576,
  "mimeType": "application/pdf"
}
```

### Legacy Support:

For backwards compatibility, the following individual URL columns are also supported:

- `car_license_url` (TEXT) - Relative path to the car license document
- `driver_license_url` (TEXT) - Relative path to the driver license document
- `car_transfer_document_url` (TEXT) - Relative path to the car transfer document

### Path Format:

Files are stored using relative paths like `/deals/7/car_license.pdf` where:

- `deals` = bucket name
- `7` = deal ID (folder name)
- `car_license.pdf` = file name

This approach provides flexibility for:

- Changing storage providers
- Moving files between environments
- Generating URLs dynamically based on configuration

## Setup Instructions

1. **Run Database Migration**:

    ```sql
    -- Run the contents of migrations/add_deal_attachments.sql
    ```

2. **Setup Storage Bucket**:

    ```sql
    -- Run the contents of migrations/setup_deals_storage.sql
    ```

3. **Verify Storage Bucket**: Go to your Supabase dashboard > Storage and ensure the 'deals' bucket is created with public access.

## How It Works

### File Upload Process:

1. User selects files in the deal creation form
2. Deal is created first to generate an ID
3. Files are uploaded to `deals/{deal-id}/` folder
4. Deal record is updated with file URLs
5. User sees success message

### File Deletion Process:

1. When a deal is deleted (single or bulk)
2. Deal record is removed from database
3. Entire folder `deals/{deal-id}/` is deleted from storage
4. User sees success message

## File Types Supported

- **Images**: JPG, JPEG, PNG, GIF
- **Documents**: PDF, DOC, DOCX
- **Size Limit**: 10MB per file

## Error Handling

- Upload errors are logged but don't prevent deal creation
- File deletion errors are logged but don't prevent deal deletion
- User-friendly error messages are shown for validation issues
- Network/storage errors are handled gracefully

## Components Modified

1. **`/utils/file-upload.ts`** - Enhanced utility functions for file operations with attachment helpers
2. **`/app/(defaults)/deals/add/page.tsx`** - Updated to handle file uploads and store attachments array
3. **`/app/(defaults)/deals/page.tsx`** - Updated to handle file cleanup on deletion and display attachments
4. **`/types/index.ts`** - New shared type definitions for attachments and deals
5. **`/components/attachments/attachments-display.tsx`** - New component for displaying attachments in the UI
6. **Database migrations** - Added attachments JSON column and storage setup

## UI Features

### Attachments Display

- **Compact view**: Shows attachment count with 📎 icon in deals list
- **Detailed view**: Shows each attachment with:
    - File type icon (🖼️ for images, 📄 for PDFs, etc.)
    - Attachment type (Car License, Driver License, etc.)
    - File name and size
    - Preview button for images
    - Download button for all files

### File Management

- **Upload validation**: File type and size restrictions
- **Progress indication**: Shows upload status during file processing
- **Error handling**: Graceful handling of upload failures
- **Automatic cleanup**: Files are deleted when deals are removed

## Testing

To test the implementation:

1. Create a new deal with file attachments
2. Verify files are uploaded to the correct storage location
3. Verify file URLs are stored in the database
4. Delete the deal and verify files are cleaned up
5. Test bulk deletion and verify all files are cleaned up

## Security

- Files are stored in a public bucket but organized by deal ID
- Only authenticated users can upload/delete files (RLS policies)
- File type restrictions are enforced
- File size limits are enforced (10MB)

## Future Enhancements

- Add file preview functionality
- Add drag-and-drop file upload
- Add progress indicators for large file uploads
- Add file compression for images
- Add audit trail for file operations
