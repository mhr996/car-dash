import React from 'react';
import Image from 'next/image';
import { DealAttachment } from '@/types';
import { getAttachmentTypeDisplayName, formatFileSize, getFileIconName, isImageFile, getPublicUrlFromPath } from '@/utils/file-upload';
import { getTranslation } from '@/i18n';
import IconEye from '@/components/icon/icon-eye';
import IconPaperclip from '@/components/icon/icon-paperclip';
import IconImage from '@/components/icon/icon-image';
import IconFile from '@/components/icon/icon-file';
import IconNotesEdit from '@/components/icon/icon-notes-edit';
import IconChartSquare from '@/components/icon/icon-chart-square';
import IconZipFile from '@/components/icon/icon-zip-file';
import IconTxtFile from '@/components/icon/icon-txt-file';
import IconTrash from '@/components/icon/icon-trash';

interface AttachmentsDisplayProps {
    attachments: DealAttachment[];
    compact?: boolean;
    showDeleteButton?: boolean;
    onDeleteAttachment?: (attachment: DealAttachment) => void;
    isDeleting?: boolean;
}

const AttachmentsDisplay: React.FC<AttachmentsDisplayProps> = ({ attachments, compact = false, showDeleteButton = false, onDeleteAttachment, isDeleting = false }) => {
    const { t } = getTranslation();

    if (!attachments || attachments.length === 0) {
        return <span className="text-gray-400 text-sm">{t('no_attachments')}</span>;
    }

    const getFileIconComponent = (mimeType: string) => {
        const iconClass = 'w-5 h-5 text-gray-600';
        if (mimeType.startsWith('image/')) return <IconImage className={iconClass} />;
        if (mimeType === 'application/pdf') return <IconFile className={iconClass} />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <IconNotesEdit className={iconClass} />;
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <IconChartSquare className={iconClass} />;
        if (mimeType.includes('zip') || mimeType.includes('archive')) return <IconZipFile className={iconClass} />;
        if (mimeType.includes('text')) return <IconTxtFile className={iconClass} />;
        return <IconPaperclip className={iconClass} />;
    };

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                <IconPaperclip className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">{attachments.length}</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {attachments.map((attachment, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {/* File icon or image preview */}
                    <div className="flex-shrink-0">
                        {isImageFile(attachment.mimeType) ? (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                <Image src={getPublicUrlFromPath(attachment.url)} alt={attachment.name} fill className="object-cover" sizes="64px" />
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">{getFileIconComponent(attachment.mimeType)}</div>
                        )}
                    </div>

                    {/* File info */}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{getAttachmentTypeDisplayName(attachment.type)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {attachment.name} • {formatFileSize(attachment.size)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(attachment.uploadedAt).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            })}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {isImageFile(attachment.mimeType) && (
                            <button
                                type="button"
                                onClick={() => window.open(getPublicUrlFromPath(attachment.url), '_blank')}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                title={t('preview')}
                            >
                                <IconEye className="w-4 h-4" />
                            </button>
                        )}
                        {showDeleteButton && onDeleteAttachment && (
                            <button
                                type="button"
                                onClick={() => onDeleteAttachment(attachment)}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('delete')}
                            >
                                <IconTrash className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AttachmentsDisplay;
