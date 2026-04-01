import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

interface Provider {
    id: string | number;
    name: string;
    address?: string;
    phone?: string;
    id_number?: string;
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

    useEffect(() => {
        setSelectedProvider(defaultValue);
    }, [defaultValue]);

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

    const filteredProviders = providers.filter((provider) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            provider.name.toLowerCase().includes(searchLower) ||
            (provider.address || '').toLowerCase().includes(searchLower) ||
            (provider.phone || '').toLowerCase().includes(searchLower) ||
            (provider.id_number || '').toLowerCase().includes(searchLower)
        );
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

    const handleProviderSelect = (providerId: string | number) => {
        setSelectedProvider(String(providerId));
        setIsOpen(false);
        setSearchTerm('');
        if (onChange) {
            const event = {
                target: { value: String(providerId), name: name },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(event);
        }
    };

    const selected = providers.find((p) => String(p.id) === String(selectedProvider));

    const getSelectedLabel = () => {
        if (selected) {
            return (
                <div className="flex items-center gap-3 px-3 py-3">
                    <div className="p-2 rounded-full bg-primary/10">
                        <IconUser className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">{selected.name}</div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {selected.phone && (
                                <div className="flex items-center gap-1">
                                    <IconUser className="w-3 h-3" />
                                    <span className="truncate">{selected.phone}</span>
                                </div>
                            )}
                            {selected.id_number && <span className="truncate">{selected.id_number}</span>}
                            {selected.address && <span className="truncate">{selected.address}</span>}
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-3 px-3 py-3 text-gray-500 dark:text-gray-400">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <IconUser className="w-5 h-5" />
                </div>
                <span>{loading ? t('loading') + '...' : t('select_provider')}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="cursor-not-allowed rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-black min-h-[70px] flex items-center justify-between px-4">
                <div className="flex items-center gap-3 px-3 py-3 text-gray-500 dark:text-gray-400">
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <IconUser className="w-5 h-5" />
                    </div>
                    <span>{t('loading')}...</span>
                </div>
                <IconCaretDown className="w-4 h-4 text-gray-500" />
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                className={`${className} cursor-pointer rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-black hover:border-primary dark:hover:border-primary transition-all duration-200 min-h-[70px] flex items-center justify-between px-4 w-full`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {getSelectedLabel()}
                <IconCaretDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-[#374151] bg-white dark:bg-black shadow-lg shadow-black/10 dark:shadow-black/50">
                    {providers.length > 5 && (
                        <div className="p-2 border-b border-gray-200 dark:border-[#374151]">
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-300 dark:border-[#374151] p-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-black dark:text-white-dark"
                                placeholder={t('search_providers')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="max-h-80 overflow-y-auto p-2">
                        {filteredProviders.length > 0 ? (
                            filteredProviders.map((provider) => {
                                const isSelected = String(provider.id) === String(selectedProvider);
                                return (
                                    <div
                                        key={provider.id}
                                        className={`cursor-pointer rounded-lg p-4 mb-2 last:mb-0 hover:bg-gray-50 dark:hover:bg-[#1a2238] transition-all duration-200 ${
                                            isSelected ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'
                                        }`}
                                        onClick={() => handleProviderSelect(provider.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                                                <IconUser className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-semibold text-gray-900 dark:text-white ${isSelected ? 'text-primary' : ''}`}>{provider.name}</h4>
                                                {provider.phone && <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{provider.phone}</div>}
                                                {provider.id_number && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{provider.id_number}</div>}
                                                {provider.address && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{provider.address}</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t('no_providers_found')}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProviderSelect;
