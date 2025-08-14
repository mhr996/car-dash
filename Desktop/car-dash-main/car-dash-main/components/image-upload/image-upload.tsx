import React, { useRef, useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import IconUpload from '@/components/icon/icon-camera';

interface ImageUploadProps {
    userId: string;
    url: string | null;
    bucket: string;
    placeholderImage?: string;
    onUploadComplete: (url: string) => void;
    onError?: (error: string) => void;
    buttonLabel?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ userId, url, bucket, placeholderImage = '/assets/images/img-placeholder-fallback.webp', onUploadComplete, onError, buttonLabel }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

            if (!fileExt || !allowedExtensions.includes(fileExt)) {
                throw new Error('Invalid file type. Please upload an image file.');
            }

            // Generate unique filename using provided userId instead of session
            const fileName = `${userId}/${Date.now()}.${fileExt}`;

            // Delete old file if exists
            const { data: oldFiles } = await supabase.storage.from(bucket).list(userId);

            if (oldFiles?.length) {
                await Promise.all(oldFiles.map((file) => supabase.storage.from(bucket).remove([`${userId}/${file.name}`])));
            }

            // Upload new file
            const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
            });

            if (uploadError) throw uploadError;

            // Get public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from(bucket).getPublicUrl(fileName);

            onUploadComplete(publicUrl);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error uploading avatar';
            onError?.(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative group cursor-pointer">
            {!buttonLabel ? (
                <>
                    <img src={url || placeholderImage} alt="Profile" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32" />

                    {/* Overlay */}
                    <div
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <IconUpload className="h-6 w-6 text-white" />
                    </div>
                </>
            ) : (
                <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading...' : buttonLabel}
                </button>
            )}

            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} onChange={uploadAvatar} accept="image/*" className="hidden" disabled={uploading} />

            {uploading && buttonLabel === undefined && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
