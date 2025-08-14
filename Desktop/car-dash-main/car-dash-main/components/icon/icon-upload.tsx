import { FC } from 'react';

interface IconUploadProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconUpload: FC<IconUploadProps> = ({ className, fill = false, duotone = false }) => {
    if (fill) {
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                {/* Upload arrow - primary element */}
                <path
                    d="M12 2C12.5523 2 13 2.44772 13 3V14.1716L15.2929 11.8787C15.6834 11.4882 16.3166 11.4882 16.7071 11.8787C17.0976 12.2692 17.0976 12.9024 16.7071 13.2929L12.7071 17.2929C12.3166 17.6834 11.6834 17.6834 11.2929 17.2929L7.29289 13.2929C6.90237 12.9024 6.90237 12.2692 7.29289 11.8787C7.68342 11.4882 8.31658 11.4882 8.70711 11.8787L11 14.1716V3C11 2.44772 11.4477 2 12 2Z"
                    fill="currentColor"
                />
                {/* Base/platform - secondary element */}
                <path
                    d="M3 19C3 17.8954 3.89543 17 5 17H7C7.55228 17 8 17.4477 8 18C8 18.5523 7.55228 19 7 19H5V20H19V19H17C16.4477 19 16 18.5523 16 18C16 17.4477 16.4477 17 17 17H19C20.1046 17 21 17.8954 21 19V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V19Z"
                    fill="currentColor"
                    opacity={duotone ? '0.3' : '1'}
                />
            </svg>
        );
    }

    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Upload arrow - primary element */}
            <path d="M12 15L12 2M12 2L15 5M12 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Base platform - secondary elements */}
            <path d="M22 22H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={duotone ? '0.3' : '1'} />
            <path
                d="M22 19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={duotone ? '0.3' : '1'}
            />
        </svg>
    );
};

export default IconUpload;
