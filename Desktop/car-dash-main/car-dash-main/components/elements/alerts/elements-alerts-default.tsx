import IconX from '@/components/icon/icon-x';
import PanelCodeHighlight from '@/components/panel-code-highlight';
import React, { useEffect, useState } from 'react';

interface AlertProps {
    type: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    message: string;
    title?: string;
    onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, title, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isLeaving, setIsLeaving] = useState(false);

    const alertClasses = {
        primary: 'bg-primary-light text-primary dark:bg-primary-dark-light border-l-4 border-primary',
        secondary: 'bg-secondary-light text-secondary dark:bg-secondary-dark-light border-l-4 border-secondary',
        success: 'bg-success-light text-success dark:bg-success-dark-light border-l-4 border-success',
        warning: 'bg-warning-light text-warning dark:bg-warning-dark-light border-l-4 border-warning',
        danger: 'bg-danger-light text-danger dark:bg-danger-dark-light border-l-4 border-danger',
        info: 'bg-info-light text-info dark:bg-info-dark-light border-l-4 border-info',
    };

    useEffect(() => {
        if (onClose) {
            const timer = setTimeout(() => {
                setIsLeaving(true);
                // Wait for animation to complete before calling onClose
                setTimeout(() => {
                    setIsVisible(false);
                    onClose();
                }, 300);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [onClose]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onClose) onClose();
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`
                flex items-center rounded-lg p-4 mb-4 shadow-lg backdrop-blur-sm
                transition-all duration-300 transform
                ${isLeaving ? 'animate-slide-out-right' : 'animate-slide-in-right'}
                ${alertClasses[type]}
            `}
        >
            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                {title && <strong className="ltr:mr-1 rtl:ml-1 font-semibold">{title}!</strong>}
                <span className="text-sm">{message}</span>
            </span>
            {onClose && (
                <button type="button" className="hover:opacity-80 ltr:ml-auto rtl:mr-auto p-1 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10" onClick={handleClose}>
                    <IconX className="h-5 w-5" />
                </button>
            )}
        </div>
    );
};

const ElementsAlertsDefault = () => {
    // Example usage within the component
    return (
        <PanelCodeHighlight title="Default Alerts" codeHighlight={`<Alert type="primary" title="Primary" message="Lorem Ipsum is simply dummy text of the printing." />`}>
            <div className="mb-5 grid gap-5 lg:grid-cols-2">
                <Alert type="primary" title="Primary" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="secondary" title="Secondary" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="success" title="Success" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="warning" title="Warning" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="danger" title="Danger" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="info" title="Info" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
            </div>
        </PanelCodeHighlight>
    );
};

export default ElementsAlertsDefault;
export { Alert };
