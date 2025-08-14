import { FC } from 'react';

interface IconCarProps {
    className?: string;
}

const IconCar: FC<IconCarProps> = ({ className }) => {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M7 17C8.10457 17 9 16.1046 9 15C9 13.8954 8.10457 13 7 13C5.89543 13 5 13.8954 5 15C5 16.1046 5.89543 17 7 17Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M17 17C18.1046 17 19 16.1046 19 15C19 13.8954 18.1046 13 17 13C15.8954 13 15 13.8954 15 15C15 16.1046 15.8954 17 17 17Z" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M5 15H3V13C3 11.8954 3.89543 11 5 11H6L7.44721 8.55279C7.78546 7.92443 8.46093 7.5 9.2 7.5H14.8C15.539 7.5 16.2145 7.92443 16.5528 8.55279L18 11H19C20.1046 11 21 11.8954 21 13V15H19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                opacity="0.5"
                d="M6 11L7.44721 8.55279C7.78546 7.92443 8.46093 7.5 9.2 7.5H14.8C15.539 7.5 16.2145 7.92443 16.5528 8.55279L18 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default IconCar;
