import React from 'react';
import IconStore from './icon/icon-store';
import IconMapPin from './icon/icon-map-pin';
import IconClock from './icon/icon-clock';
import IconImage from './icon/icon-image';

interface TabProps {
    tabs: {
        name: string;
        icon: string;
    }[];
    activeTab: number;
    onTabClick: (index: number) => void;
}

const Tabs: React.FC<TabProps> = ({ tabs, activeTab, onTabClick }) => {
    const renderIcon = (iconName: string) => {
        switch (iconName) {
            case 'store':
                return <IconStore className="h-5 w-5" />;
            case 'map-pin':
                return <IconMapPin className="h-5 w-5" />;
            case 'clock':
                return <IconClock className="h-5 w-5" />;
            case 'image':
                return <IconImage className="h-5 w-5" />;
            default:
                return null;
        }
    };

    return (
        <div className="border-b border-[#ebedf2] dark:border-[#191e3a]">
            <ul className="flex flex-wrap -mb-px">
                {tabs.map((tab, index) => (
                    <li className="mr-2" key={index}>
                        <button
                            type="button"
                            className={`inline-flex items-center px-4 py-3 text-sm border-b-2 rounded-t-lg active gap-2
                                ${
                                    activeTab === index
                                        ? 'text-primary border-primary dark:text-primary dark:border-primary'
                                        : 'border-transparent hover:text-primary hover:border-primary dark:hover:text-primary'
                                }`}
                            onClick={() => onTabClick(index)}
                        >
                            {renderIcon(tab.icon)}
                            {tab.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Tabs;
