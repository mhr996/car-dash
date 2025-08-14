import { FC } from 'react';

interface IconStoreProps {
    className?: string;
}

const IconStore: FC<IconStoreProps> = ({ className }) => {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M3 9.10998V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V9.10998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.80001 5.5L2.10001 9.10998H21.9L20.2 5.5C19.9 4.6 19.1 4 18.2 4H5.80001C4.90001 4 4.10001 4.6 3.80001 5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M12 15C13.933 15 15.5 13.433 15.5 11.5V9.09998H8.5V11.5C8.5 13.433 10.067 15 12 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default IconStore;
