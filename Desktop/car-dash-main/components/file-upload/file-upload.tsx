import React, { useState, useRef } from 'react';
import IconUpload from '@/components/icon/icon-upload';
import IconX from '@/components/icon/icon-x';
import IconEye from '@/components/icon/icon-eye';
import IconDownload from '@/components/icon/icon-download';
import { getTranslation } from '@/i18n';

interface FileItem {
    file: File;
    preview?: string;
    id: string;
}

interface FileUploadProps {
    files: FileItem[];
    onFilesChange: (files: FileItem[]) => void;
    accept?: string;
    maxFiles?: number;
    title: string;
    description?: string;
    className?: string;
}

const FileUpload = ({ files, onFilesChange, accept = 'image/*,.pdf,.doc,.docx', maxFiles = 10, title, description, className = '' }: FileUploadProps) => {
    const { t } = getTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (selectedFiles: FileList) => {
        const newFiles: FileItem[] = [];

        Array.from(selectedFiles).forEach((file) => {
            if (files.length + newFiles.length < maxFiles) {
                const fileItem: FileItem = {
                    file,
                    id: Date.now() + Math.random().toString(),
                };

                // Create preview for images
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        fileItem.preview = e.target?.result as string;
                        onFilesChange([...files, ...newFiles.filter((f) => f.id !== fileItem.id), fileItem]);
                    };
                    reader.readAsDataURL(file);
                }

                newFiles.push(fileItem);
            }
        });

        if (newFiles.length > 0) {
            onFilesChange([...files, ...newFiles]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const removeFile = (fileId: string) => {
        onFilesChange(files.filter((f) => f.id !== fileId));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return '📄';
            case 'doc':
            case 'docx':
                return '📝';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return '🖼️';
            default:
                return '📎';
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
                {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
            >
                <IconUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('upload_files')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('drag_drop_or_click')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                    {t('max_files')}: {maxFiles} • {t('supported_formats')}: PDF, DOC, DOCX, JPG, PNG
                </p>

                <input ref={fileInputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files)} />
            </div>

            {/* Files List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <h5 className="text-md font-medium text-gray-900 dark:text-white">
                        {t('uploaded_files')} ({files.length}/{maxFiles})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {files.map((fileItem) => (
                            <div key={fileItem.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {fileItem.preview ? (
                                    <img src={fileItem.preview} alt={fileItem.file.name} className="w-12 h-12 object-cover rounded border" />
                                ) : (
                                    <div className="w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded text-2xl">{getFileIcon(fileItem.file.name)}</div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileItem.file.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(fileItem.file.size)}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {fileItem.preview && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(fileItem.preview, '_blank')}
                                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            title={t('preview')}
                                        >
                                            <IconEye className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => removeFile(fileItem.id)}
                                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        title={t('remove')}
                                    >
                                        <IconX className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
