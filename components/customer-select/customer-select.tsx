import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

interface Customer {
    id: string;
    id_number?: string;
    name: string;
    phone: string;
    age: number;
}

interface CustomerSelectProps {
    selectedCustomer?: Customer | null;
    onCustomerSelect: (customer: Customer | null) => void;
    onCreateNew: () => void;
    className?: string;
}

const CustomerSelect = ({ selectedCustomer, onCustomerSelect, onCreateNew, className = 'form-select' }: CustomerSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && customers.length === 0) {
            fetchCustomers();
        }
    }, [isOpen]);

    useEffect(() => {
        const filtered = customers.filter((customer) => customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || (customer.phone && customer.phone.includes(searchTerm)));
        setFilteredCustomers(filtered);
    }, [customers, searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('customers').select('id, id_number, name, phone, age').order('name');

            if (error) throw error;
            setCustomers(data || []);
            setFilteredCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerSelect = (customer: Customer) => {
        onCustomerSelect(customer);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreateNew = () => {
        onCreateNew();
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedCustomer ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedCustomer ? (
                    <div className="flex items-center gap-3">
                        <IconUser className="w-4 h-4 text-primary" />
                        <div>
                            <div className="font-medium">{selectedCustomer.name}</div>
                            <div className="text-xs text-gray-500">{selectedCustomer.phone}</div>
                        </div>
                    </div>
                ) : (
                    <span>{t('select_customer')}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] max-h-80 overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200 dark:border-[#374151]">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none dark:bg-black dark:border-[#374151] dark:text-white-dark"
                            placeholder={t('search_customers')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Create New Customer Button */}
                    <div className="p-2 border-b border-gray-200 dark:border-[#374151]">
                        <button
                            onClick={handleCreateNew}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                        >
                            <IconPlus className="w-4 h-4" />
                            <span className="font-medium">{t('create_new_customer')}</span>
                        </button>
                    </div>

                    {/* Customers List */}
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">{t('loading')}</p>
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{searchTerm ? t('no_customers_found') : t('no_customers_available')}</p>
                            </div>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                    onClick={() => handleCustomerSelect(customer)}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconUser className="w-4 h-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-black dark:text-white truncate">{customer.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500">
                                                {customer.age} {t('years_old')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerSelect;
