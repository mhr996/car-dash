'use client';

import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';

interface ViewToggleProps {
    view: 'list' | 'grid';
    onViewChange: (view: 'list' | 'grid') => void;
}

const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
    return (
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            <button
                type="button"
                onClick={() => onViewChange('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    view === 'list' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="List View"
            >
                <IconListCheck className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">List</span>
            </button>
            <button
                type="button"
                onClick={() => onViewChange('grid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    view === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Grid View"
            >
                <IconLayoutGrid className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Grid</span>
            </button>
        </div>
    );
};

export default ViewToggle;
