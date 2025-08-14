import { FC } from 'react';

interface IconBuildingProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconBuilding: FC<IconBuildingProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path
                opacity={duotone ? '0.5' : '1'}
                d="M2 22H22V21C22 20.4477 21.5523 20 21 20H3C2.44772 20 2 20.4477 2 21V22Z"
                fill={fill ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path d="M6 2V20M18 8V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 2V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 5H10M14 5H15M9 8H10M14 8H15M9 11H10M14 11H15M9 14H10M14 14H15M9 17H10M14 17H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 2H18C18.5523 2 19 2.44772 19 3V7C19 7.55228 18.5523 8 18 8H6C5.44772 8 5 7.55228 5 7V3C5 2.44772 5.44772 2 6 2Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
};

export default IconBuilding;
