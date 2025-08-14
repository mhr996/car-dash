import { SVGProps } from 'react';

const IconFilter = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M3 6h18" />
            <path d="M6 12h12" />
            <path d="M9 18h6" />
        </svg>
    );
};

export default IconFilter;
