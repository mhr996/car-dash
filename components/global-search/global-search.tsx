'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClickAway } from 'react-use';
import IconSearch from '@/components/icon/icon-search';
import IconUser from '@/components/icon/icon-user';
import IconCar from '@/components/icon/icon-car';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconTxtFile from '@/components/icon/icon-txt-file';
import IconXCircle from '@/components/icon/icon-x-circle';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';

interface SearchResult {
    id: string;
    type: 'customer' | 'car' | 'deal' | 'bill';
    title: string;
    subtitle: string;
    metadata: string;
    link: string;
}

const GlobalSearch = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useClickAway(searchRef, () => {
        setIsOpen(false);
        setSelectedIndex(-1);
    });

    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    };

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const results: SearchResult[] = [];

            // Search customers - multiple approaches to catch all matches
            const customerQueries = await Promise.all([
                // Search by name, phone, car_number (text fields)
                supabase.from('customers').select('id, name, phone, id_number, car_number, customer_type').or(`name.ilike.%${query}%, phone.ilike.%${query}%, car_number.ilike.%${query}%`).limit(10),
                // Search by exact ID number if query is numeric
                ...(isNaN(Number(query))
                    ? []
                    : [
                          supabase.from('customers').select('id, name, phone, id_number, car_number, customer_type').eq('id_number', Number(query)).limit(5),
                          // Also search by internal customer ID
                          supabase.from('customers').select('id, name, phone, id_number, car_number, customer_type').eq('id', Number(query)).limit(1),
                      ]),
                // Search by partial ID number (as text)
                supabase.from('customers').select('id, name, phone, id_number, car_number, customer_type').ilike('id_number::text', `%${query}%`).limit(5),
            ]);

            const allCustomers = customerQueries.reduce((acc, { data }) => {
                if (data) acc.push(...data);
                return acc;
            }, [] as any[]);

            // Remove duplicates based on customer ID
            const uniqueCustomers = allCustomers.filter((customer, index, self) => index === self.findIndex((c) => c.id === customer.id));

            if (uniqueCustomers.length > 0) {
                console.log('Found customers:', uniqueCustomers.length, uniqueCustomers);
                uniqueCustomers.forEach((customer) => {
                    results.push({
                        id: customer.id.toString(),
                        type: 'customer',
                        title: customer.name || 'Unnamed Customer',
                        subtitle: customer.phone || '',
                        metadata: customer.id_number ? `ID: ${customer.id_number}` : customer.car_number ? `Car: ${customer.car_number}` : customer.customer_type || '',
                        link: `/customers/preview/${customer.id}`,
                    });
                });
            }

            // Search cars
            const { data: cars } = await supabase
                .from('cars')
                .select('id, title, brand, year, car_number, type, status, sale_price')
                .or(`title.ilike.%${query}%, brand.ilike.%${query}%, car_number.ilike.%${query}%, type.ilike.%${query}%`)
                .limit(10);

            if (cars) {
                cars.forEach((car) => {
                    results.push({
                        id: car.id.toString(),
                        type: 'car',
                        title: car.title || `${car.brand} ${car.year}`,
                        subtitle: car.car_number || '',
                        metadata: `${car.type || ''} • ${car.status || ''} • ₪${car.sale_price?.toLocaleString() || '0'}`,
                        link: `/cars/preview/${car.id}`,
                    });
                });
            }

            // Search deals
            const { data: deals } = await supabase
                .from('deals')
                .select(
                    `
                    id, title, deal_type, amount, status, customer_name,
                    customers(name),
                    cars(title, brand, car_number)
                `,
                )
                .or(`title.ilike.%${query}%, customer_name.ilike.%${query}%, deal_type.ilike.%${query}%`)
                .limit(10);

            if (deals) {
                deals.forEach((deal: any) => {
                    const customerName = deal.customers?.name || deal.customer_name || '';
                    const carInfo = deal.cars ? `${deal.cars.title || deal.cars.brand} ${deal.cars.car_number || ''}`.trim() : '';

                    results.push({
                        id: deal.id.toString(),
                        type: 'deal',
                        title: deal.title || `${deal.deal_type} Deal`,
                        subtitle: customerName,
                        metadata: `${deal.deal_type || ''} • ${deal.status || ''} • ₪${deal.amount?.toLocaleString() || '0'}`,
                        link: `/sales-deals/preview/${deal.id}`,
                    });
                });
            }

            // Search bills - include bill_payments data
            const billQueries = await Promise.all([
                // Search bills table directly
                supabase
                    .from('bills')
                    .select('id, customer_name, bill_type, total_with_tax, total, status, car_details')
                    .or(`customer_name.ilike.%${query}%, bill_type.ilike.%${query}%, car_details.ilike.%${query}%`)
                    .limit(10),

                // Search bills through bill_payments (for transfer_number, check_number, etc.)
                supabase
                    .from('bill_payments')
                    .select(
                        `
                        bill_id,
                        transfer_number,
                        check_number,
                        approval_number,
                        transfer_bank_name,
                        check_bank_name,
                        check_holder_name,
                        transfer_holder_name,
                        bills!inner(id, customer_name, bill_type, total_with_tax, total, status, car_details)
                    `,
                    )
                    .or(
                        `transfer_number.ilike.%${query}%, check_number.ilike.%${query}%, approval_number.ilike.%${query}%, transfer_bank_name.ilike.%${query}%, check_bank_name.ilike.%${query}%, check_holder_name.ilike.%${query}%, transfer_holder_name.ilike.%${query}%, transfer_account_number.ilike.%${query}%, check_account_number.ilike.%${query}%`,
                    )
                    .limit(10),
            ]);

            const [directBills, paymentBills] = billQueries;
            const allBills: any[] = [];

            // Add direct bill matches
            if (directBills.data) {
                allBills.push(...directBills.data);
            }

            // Add bills found through payments
            if (paymentBills.data) {
                paymentBills.data.forEach((payment: any) => {
                    if (payment.bills) {
                        const matchInfo = payment.transfer_number || payment.check_number || payment.approval_number || payment.transfer_bank_name || payment.check_bank_name;
                        allBills.push({
                            ...payment.bills,
                            payment_match: matchInfo,
                        });
                    }
                });
            }

            // Remove duplicate bills
            const uniqueBills = allBills.filter((bill, index, self) => index === self.findIndex((b) => b.id === bill.id));

            if (uniqueBills.length > 0) {
                uniqueBills.forEach((bill: any) => {
                    const matchInfo = bill.payment_match ? ` (${bill.payment_match})` : '';
                    results.push({
                        id: bill.id.toString(),
                        type: 'bill',
                        title: `${bill.bill_type || 'Bill'} - ${bill.customer_name || 'Unknown'}${matchInfo}`,
                        subtitle: bill.car_details || '',
                        metadata: `₪${(bill.total_with_tax || bill.total || 0).toLocaleString()}`,
                        link: `/bills/preview/${bill.id}`,
                    });
                });
            }

            // Sort results by relevance (exact matches first, then partial matches)
            const sortedResults = results.sort((a, b) => {
                const queryLower = query.toLowerCase();
                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();

                // For numeric queries, prioritize exact ID matches
                if (!isNaN(Number(query))) {
                    const queryNum = Number(query);

                    // Check if this is an exact ID number match in metadata
                    const aExactId = a.metadata?.includes(`ID: ${queryNum}`);
                    const bExactId = b.metadata?.includes(`ID: ${queryNum}`);

                    if (aExactId && !bExactId) return -1;
                    if (bExactId && !aExactId) return 1;
                }

                // Exact title matches first
                if (aTitle === queryLower && bTitle !== queryLower) return -1;
                if (bTitle === queryLower && aTitle !== queryLower) return 1;

                // Title starts with query
                if (aTitle.startsWith(queryLower) && !bTitle.startsWith(queryLower)) return -1;
                if (bTitle.startsWith(queryLower) && !aTitle.startsWith(queryLower)) return 1;

                // By type priority: customers first, then cars, deals, bills
                const typeOrder = { customer: 1, car: 2, deal: 3, bill: 4 };
                return typeOrder[a.type] - typeOrder[b.type];
            });

            setSearchResults(sortedResults.slice(0, 15)); // Limit to 15 results
            console.log('Final search results:', sortedResults.length, sortedResults);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const debouncedSearch = useCallback(debounce(performSearch, 300), [performSearch]);

    useEffect(() => {
        if (searchQuery.trim()) {
            debouncedSearch(searchQuery);
            setIsOpen(true);
        } else {
            setSearchResults([]);
            setIsOpen(false);
        }
        setSelectedIndex(-1);
    }, [searchQuery, debouncedSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || searchResults.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                    handleResultClick(searchResults[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    const handleResultClick = (result: SearchResult) => {
        router.push(result.link);
        setIsOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
    };

    const getResultIcon = (type: string) => {
        switch (type) {
            case 'customer':
                return <IconUser className="w-4 h-4 text-blue-500" />;
            case 'car':
                return <IconCar className="w-4 h-4 text-green-500" />;
            case 'deal':
                return <IconMenuInvoice className="w-4 h-4 text-orange-500" />;
            case 'bill':
                return <IconTxtFile className="w-4 h-4 text-purple-500" />;
            default:
                return <IconSearch className="w-4 h-4 text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'customer':
                return t('customer');
            case 'car':
                return t('car');
            case 'deal':
                return t('deal');
            case 'bill':
                return t('bill');
            default:
                return '';
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-md">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchQuery.trim() && setIsOpen(true)}
                    className="form-input w-full bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4"
                    placeholder={t('search')}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ltr:left-0 rtl:right-2">
                    <IconSearch className="w-4 h-4 text-gray-400" />
                </div>
                {searchQuery && (
                    <button type="button" onClick={clearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 rtl:right-auto rtl:left-2">
                        <IconXCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {isOpen && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0e1726] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{t('searching')}...</span>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="py-2">
                            {searchResults.map((result, index) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result)}
                                    className={`w-full border-b border-black/10 dark:border-gray-700 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">{getResultIcon(result.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    {getTypeLabel(result.type)}
                                                </span>
                                            </div>
                                            {result.subtitle && <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">{result.subtitle}</p>}
                                            {result.metadata && <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{result.metadata}</p>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <IconSearch className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('no_results_found')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
