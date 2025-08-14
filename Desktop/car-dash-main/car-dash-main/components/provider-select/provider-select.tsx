import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

interface Provider {
    id: string;
    name: string;
    address: string;
    phone: string;
}

interface ProviderSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const ProviderSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name = 'provider', id }: ProviderSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(defaultValue);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedProvider when defaultValue changes
    useEffect(() => {
        setSelectedProvider(defaultValue);
    }, [defaultValue]);

    // Fetch providers from database
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const { data, error } = await supabase.from('providers').select('*').order('name', { ascending: true });

                if (error) throw error;
                setProviders(data || []);
            } catch (error) {
                console.error('Error fetching providers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProviders();
    }, []);

    // Filter providers based on search term
    const filteredProviders = providers.filter((provider) => {
        const searchLower = searchTerm.toLowerCase();
        return provider.name.toLowerCase().includes(searchLower) || provider.address.toLowerCase().includes(searchLower) || provider.phone.toLowerCase().includes(searchLower);
    });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProviderSelect = (providerId: string) => {
        setSelectedProvider(providerId);
        setIsOpen(false);
        setSearchTerm('');
        if (onChange) {
            const event = {
                target: { value: providerId, name: name },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(event);
        }
    };

    const getSelectedProviderName = () => {
        const selected = providers.find((provider) => provider.id === selectedProvider);
        return selected ? selected.name : t('select_provider');
    };

    if (loading) {
        return (
            <div className={`${className} cursor-not-allowed dark:bg-black dark:text-white-dark dark:border-[#191e3a] flex items-center justify-between`}>
                <span className="text-gray-400">{t('loading')}...</span>
                <IconCaretDown className="w-4 h-4" />
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative">
            <div className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#191e3a] flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <span>{getSelectedProviderName()}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#191e3a]">
                    <div className="p-2">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none dark:bg-black dark:border-[#191e3a] dark:text-white-dark"
                            placeholder={t('search_providers')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filteredProviders.length > 0 ? (
                            filteredProviders.map((provider) => (
                                <div
                                    key={provider.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#191e3a] last:border-b-0"
                                    onClick={() => handleProviderSelect(provider.id)}
                                >
                                    <div className="font-medium">{provider.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.address}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{provider.phone}</div>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">{t('no_providers_found')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProviderSelect;
