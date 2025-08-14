import { FC } from 'react';

interface IconPdfProps {
    className?: string;
}

const IconPdf: FC<IconPdfProps> = ({ className }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Document outline */}
            <path
                d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Document corner fold */}
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* PDF text */}
            <text x="12" y="16" textAnchor="middle" fontSize="6" fontWeight="bold" fill="currentColor" fontFamily="Arial, sans-serif">
                PDF
            </text>
        </svg>
    );
};

export default IconPdf;
