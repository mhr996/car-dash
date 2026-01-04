import { getTranslation } from '@/i18n';
import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';

interface RoleSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const RoleSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name }: RoleSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(defaultValue || 'Admin');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedRole when defaultValue changes
    useEffect(() => {
        if (defaultValue) {
            setSelectedRole(defaultValue);
        }
    }, [defaultValue]);

    const roles = [
        { value: 'Admin', label: t('admin') },
        { value: 'Sales', label: t('sales') },
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRoleSelect = (roleValue: string) => {
        setSelectedRole(roleValue);
        setIsOpen(false);
        if (onChange) {
            const event = {
                target: { value: roleValue, name: name || 'role' },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(event);
        }
    };

    const getSelectedRoleLabel = () => {
        const role = roles.find((r) => r.value === selectedRole);
        return role ? role.label : t('select_role');
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <span>{getSelectedRoleLabel()}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-1/2 rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151]">
                    <div className="max-h-60 overflow-y-auto">
                        {roles.map((role) => (
                            <div
                                key={role.value}
                                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] ${
                                    selectedRole === role.value ? 'bg-gray-100 dark:bg-[#191e3a]' : ''
                                }`}
                                onClick={() => handleRoleSelect(role.value)}
                            >
                                {role.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleSelect;
