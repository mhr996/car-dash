import React, { useState, useRef } from 'react';
import IconUpload from '@/components/icon/icon-upload';
import IconX from '@/components/icon/icon-x';
import IconEye from '@/components/icon/icon-eye';
import { getTranslation } from '@/i18n';

interface FileItem {
    file: File;
    preview?: string;
    id: string;
}

interface SingleFileUploadProps {
    file: FileItem | null;
    onFileChange: (file: FileItem | null) => void;
    accept?: string;
    title: string;
    description?: string;
    className?: string;
}

const SingleFileUpload = ({ file, onFileChange, accept = 'image/*,.pdf,.doc,.docx', title, description, className = '' }: SingleFileUploadProps) => {
    const { t } = getTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (selectedFiles: FileList) => {
        const selectedFile = selectedFiles[0];
        if (!selectedFile) return;

        const fileItem: FileItem = {
            file: selectedFile,
            id: Date.now() + Math.random().toString(),
        };

        // Create preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                fileItem.preview = e.target?.result as string;
                onFileChange(fileItem);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            onFileChange(fileItem);
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleFileSelect(droppedFiles);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            handleFileSelect(selectedFiles);
        }
    };

    const handleRemoveFile = () => {
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handlePreview = (fileItem: FileItem) => {
        if (fileItem.preview) {
            // Open image in new tab
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`<img src="${fileItem.preview}" style="max-width: 100%; height: auto;" />`);
            }
        } else if (fileItem.file.type === 'application/pdf') {
            // Open PDF in new tab
            const url = URL.createObjectURL(fileItem.file);
            window.open(url, '_blank');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) {
            return '🖼️';
        } else if (file.type === 'application/pdf') {
            return '📄';
        } else if (file.type.includes('document') || file.type.includes('word')) {
            return '📝';
        }
        return '📎';
    };

    return (
        <div className={`file-upload-container ${className}`}>
            {/* Title and Description */}
            <div className="mb-3">
                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light">{title}</h6>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
            </div>

            {/* Upload Area */}
            {!file && (
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                        isDragging ? 'border-primary bg-primary/10 dark:bg-primary/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="space-y-3">
                        <IconUpload className="w-10 h-10 mx-auto text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('drag_drop_files')} <span className="text-primary font-medium">{t('browse')}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {t('max_files')}: 1 • {t('supported_formats')}: {accept}
                            </p>
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
                </div>
            )}

            {/* File Display */}
            {file && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {file.preview ? (
                                <img src={file.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                            ) : (
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-lg">{getFileIcon(file.file)}</div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.file.name}>
                                    {file.file.name}
                                </p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.file.size)}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {(file.preview || file.file.type === 'application/pdf') && (
                                <button type="button" onClick={() => handlePreview(file)} className="text-blue-600 hover:text-blue-800 p-1" title={t('preview')}>
                                    <IconEye className="w-4 h-4" />
                                </button>
                            )}
                            <button type="button" onClick={handleRemoveFile} className="text-red-600 hover:text-red-800 p-1" title={t('remove')}>
                                <IconX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Replace File Button */}
            {file && (
                <div className="mt-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-primary hover:text-primary/80 font-medium">
                        {t('replace_file')}
                    </button>
                    <input ref={fileInputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
                </div>
            )}
        </div>
    );
};

export default SingleFileUpload;
