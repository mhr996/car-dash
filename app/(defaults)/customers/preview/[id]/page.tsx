'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconCalendar from '@/components/icon/icon-calendar';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { DataTable } from 'mantine-datatable';

interface Customer {
    id: string;
    created_at: string;
    name: string;
    phone: string;
    car_number: string;
    age: number;
    id_number: string;
    customer_type: string;
    balance: number;
}

interface Transaction {
    id: string;
    created_at: string;
    type: 'purchase' | 'payment' | 'refund' | 'adjustment';
    amount: number;
    description: string;
    reference_id?: string;
    balance_after: number;
}

const CustomerPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [transactionsLoading, setTransactionsLoading] = useState(true);

    useEffect(() => {
        const fetchCustomer = async () => {
            if (!params?.id) return;

            try {
                const { data, error } = await supabase.from('customers').select('*').eq('id', params.id).single();

                if (error) {
                    console.error('Error fetching customer:', error);
                    return;
                }

                setCustomer(data);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchTransactions = async () => {
            if (!params?.id) return;

            try {
                // Fetch real transaction data from customer_transactions table
                const { data, error } = await supabase.from('customer_transactions').select('*').eq('customer_id', params.id).order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching transactions:', error);
                    // If table doesn't exist yet, use empty array
                    setTransactions([]);
                } else {
                    // Convert the data to match our Transaction interface
                    const convertedTransactions: Transaction[] = (data || []).map((tx) => ({
                        id: tx.id,
                        created_at: tx.created_at,
                        type: getTransactionTypeFromDbType(tx.type),
                        amount: tx.amount,
                        description: tx.description || '',
                        reference_id: tx.reference_id,
                        balance_after: tx.balance_after,
                    }));
                    setTransactions(convertedTransactions);
                }
            } catch (error) {
                console.error('Error:', error);
                setTransactions([]);
            } finally {
                setTransactionsLoading(false);
            }
        };

        if (params?.id) {
            fetchCustomer();
            fetchTransactions();
        }
    }, [params?.id]);

    const getCustomerTypeBadgeClass = (type: string) => {
        return type === 'new' ? 'badge-outline-success' : 'badge-outline-primary';
    };

    // Helper function to convert database transaction types to UI types
    const getTransactionTypeFromDbType = (dbType: string): 'purchase' | 'payment' | 'refund' | 'adjustment' => {
        switch (dbType) {
            case 'deal_created':
                return 'purchase';
            case 'deal_deleted':
                return 'refund';
            case 'receipt_created':
                return 'payment';
            case 'receipt_deleted':
                return 'adjustment';
            default:
                return 'adjustment';
        }
    };

    const getTransactionTypeColor = (type: string) => {
        switch (type) {
            case 'purchase':
                return 'text-danger';
            case 'payment':
                return 'text-success';
            case 'refund':
                return 'text-info';
            case 'adjustment':
                return 'text-warning';
            default:
                return 'text-gray-600';
        }
    };

    const getTransactionTypeIcon = (type: string) => {
        switch (type) {
            case 'purchase':
                return <IconShoppingCart className="w-4 h-4" />;
            case 'payment':
                return <IconDollarSign className="w-4 h-4" />;
            case 'refund':
                return <IconTrendingUp className="w-4 h-4" />;
            case 'adjustment':
                return <IconEdit className="w-4 h-4" />;
            default:
                return <IconDollarSign className="w-4 h-4" />;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">{t('customer_not_found')}</h3>
                    <Link href="/customers" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        {t('back_to_customers')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    {/* Breadcrumb Navigation */}
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/customers" className="text-primary hover:underline">
                                {t('customers')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('customer_details')}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('customer_details')}</h1>
                        <p className="text-gray-500">{customer ? customer.name : t('loading')}</p>
                    </div>
                    {customer && (
                        <Link href={`/customers/edit/${customer.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            {t('edit_customer')}
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customer Information */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Basic Info */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('basic_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary mb-2">{customer.name}</h2>
                                    <span className={`badge ${getCustomerTypeBadgeClass(customer.customer_type)}`}>{t(`customer_type_${customer.customer_type}`)}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('phone')}:</span>
                                        <span className="font-medium">{customer.phone}</span>
                                    </div>
                                    {customer.car_number && (
                                        <div className="flex items-center">
                                            <IconShoppingCart className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                            <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('car_number')}:</span>
                                            <span className="font-medium">{customer.car_number}</span>
                                        </div>
                                    )}
                                    {customer.age && (
                                        <div className="flex items-center">
                                            <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                            <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('age')}:</span>
                                            <span className="font-medium">
                                                {customer.age} {t('years_old')}
                                            </span>
                                        </div>
                                    )}
                                    {customer.id_number && (
                                        <div className="flex items-center">
                                            <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                            <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('id_number')}:</span>
                                            <span className="font-medium">{customer.id_number}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <IconCalendar className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('member_since')}:</span>
                                        <span className="font-medium">
                                            {new Date(customer.created_at).toLocaleDateString('en-GB', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Balance Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('balance_information')}</h3>
                            </div>

                            <div className="text-center">
                                <div className={`text-3xl font-bold mb-2 ${customer.balance >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(customer.balance)}</div>
                                <p className="text-gray-500 text-sm">{t('current_balance')}</p>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{t('total_transactions')}:</span>
                                        <span className="font-medium">{transactions.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="lg:col-span-2">
                        <div className="panel h-full">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('transaction_history')}</h3>
                            </div>

                            <div className="datatables">
                                <DataTable
                                    className={`${transactionsLoading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
                                    records={transactions}
                                    columns={[
                                        {
                                            accessor: 'created_at',
                                            title: t('date'),
                                            sortable: true,
                                            render: ({ created_at }) => (
                                                <span>
                                                    {new Date(created_at).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </span>
                                            ),
                                        },
                                        {
                                            accessor: 'type',
                                            title: t('type'),
                                            sortable: true,
                                            render: ({ type }) => (
                                                <div className={`flex items-center gap-2 ${getTransactionTypeColor(type)}`}>
                                                    {getTransactionTypeIcon(type)}
                                                    <span className="capitalize">{t(`transaction_type_${type}`)}</span>
                                                </div>
                                            ),
                                        },
                                        {
                                            accessor: 'description',
                                            title: t('description'),
                                            sortable: false,
                                            render: ({ description }) => (
                                                <span className="text-sm truncate max-w-[200px] block" title={description}>
                                                    {description}
                                                </span>
                                            ),
                                        },
                                        {
                                            accessor: 'amount',
                                            title: t('amount'),
                                            sortable: true,
                                            render: ({ amount }) => (
                                                <span className={amount >= 0 ? 'text-success' : 'text-danger'}>
                                                    {amount >= 0 ? '+' : ''}
                                                    {formatCurrency(amount)}
                                                </span>
                                            ),
                                        },
                                        {
                                            accessor: 'balance_after',
                                            title: t('balance_after'),
                                            sortable: true,
                                            render: ({ balance_after }) => <span className={balance_after >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(balance_after)}</span>,
                                        },
                                    ]}
                                    minHeight={300}
                                    noRecordsText={t('no_transactions_found')}
                                />

                                {transactionsLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerPreview;
