'use client';

import { useEffect, useMemo, useState } from 'react';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconPlus from '@/components/icon/icon-plus';
import IconX from '@/components/icon/icon-x';

type BalanceTab = 'overview' | 'history' | 'payments';
type TxDirection = 'positive' | 'negative';

type MessageBalanceTransaction = {
    id: string;
    created_at: string;
    messages_count: number;
    amount: number;
    transaction_type: TxDirection;
    note: string | null;
};

const LOCAL_TRANSACTIONS_KEY = 'message_balance_transactions';

export default function MessageBalancePage() {
    const { t } = getTranslation();
    const [activeTab, setActiveTab] = useState<BalanceTab>('overview');
    const [transactions, setTransactions] = useState<MessageBalanceTransaction[]>([]);
    const [sentMessagesCount, setSentMessagesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
    const [form, setForm] = useState({
        messagesCount: '',
        amount: '',
        note: '',
    });
    const [saving, setSaving] = useState(false);
    const [errorText, setErrorText] = useState('');

    const balanceSummary = useMemo(() => {
        const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const totalMessages = transactions.reduce((sum, tx) => sum + Number(tx.messages_count || 0), 0);
        return {
            totalAmount,
            totalMessages,
        };
    }, [transactions]);

    const formatAmount = (value: number) =>
        new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

    const loadFromLocal = () => {
        try {
            const raw = sessionStorage.getItem(LOCAL_TRANSACTIONS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as MessageBalanceTransaction[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const saveToLocal = (list: MessageBalanceTransaction[]) => {
        sessionStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(list));
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [{ data: messagesData }, txRes] = await Promise.all([
                supabase.from('messages').select('id'),
                supabase.from('message_balance_transactions').select('*').order('created_at', { ascending: false }),
            ]);

            setSentMessagesCount((messagesData || []).length);

            if (!txRes.error) {
                setTransactions((txRes.data as MessageBalanceTransaction[]) || []);
                return;
            }

            setTransactions(loadFromLocal());
        } catch {
            setTransactions(loadFromLocal());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const resetForm = () => {
        setErrorText('');
        setForm({ messagesCount: '', amount: '', note: '' });
    };

    const openAddPaymentModal = () => {
        resetForm();
        setShowAddPaymentModal(true);
    };

    const openAddBalanceModal = () => {
        resetForm();
        setShowAddBalanceModal(true);
    };

    const submitTransaction = async (direction: TxDirection) => {
        setErrorText('');
        const rawMessages = Number(form.messagesCount);
        const rawAmount = Number(form.amount);

        if (!Number.isFinite(rawMessages) || rawMessages <= 0) {
            setErrorText(t('message_balance_messages_required'));
            return;
        }

        if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
            setErrorText(t('message_balance_amount_required'));
            return;
        }

        setSaving(true);
        const sign = direction === 'negative' ? -1 : 1;
        const txPayload = {
            messages_count: rawMessages * sign,
            amount: rawAmount * sign,
            transaction_type: direction,
            note: form.note || null,
        };

        try {
            const { data, error } = await supabase.from('message_balance_transactions').insert(txPayload).select('*').single();

            if (!error && data) {
                setTransactions((prev) => [data as MessageBalanceTransaction, ...prev]);
                setShowAddPaymentModal(false);
                setShowAddBalanceModal(false);
                return;
            }

            const localTx: MessageBalanceTransaction = {
                id: String(Date.now()),
                created_at: new Date().toISOString(),
                messages_count: txPayload.messages_count,
                amount: txPayload.amount,
                transaction_type: direction,
                note: txPayload.note,
            };
            setTransactions((prev) => {
                const next = [localTx, ...prev];
                saveToLocal(next);
                return next;
            });
            setShowAddPaymentModal(false);
            setShowAddBalanceModal(false);
        } catch {
            setErrorText(t('error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('message_balance')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('message_balance_description')}</p>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-[#191e3a]">
                {(['overview', 'history', 'payments'] as BalanceTab[]).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
                            activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {tab === 'overview' && t('message_balance_overview_tab')}
                        {tab === 'history' && t('message_balance_history_tab')}
                        {tab === 'payments' && t('message_balance_add_payment_tab')}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="panel p-6">
                        <p className="text-sm text-gray-500">{t('message_balance_total_amount')}</p>
                        <p className={`mt-2 text-3xl font-bold ${balanceSummary.totalAmount < 0 ? 'text-danger' : 'text-success'}`}>{formatAmount(balanceSummary.totalAmount)}</p>
                    </div>
                    <div className="panel p-6">
                        <p className="text-sm text-gray-500">{t('message_balance_total_messages')}</p>
                        <p className={`mt-2 text-3xl font-bold ${balanceSummary.totalMessages < 0 ? 'text-danger' : 'text-primary'}`}>{balanceSummary.totalMessages}</p>
                    </div>
                    <div className="panel p-6">
                        <p className="text-sm text-gray-500">{t('message_balance_sent_messages')}</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{sentMessagesCount}</p>
                    </div>
                </div>
            )}

            {(activeTab === 'history' || activeTab === 'payments') && (
                <div className="panel overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-[#191e3a] flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('message_balance_history_tab')}</h3>
                        {activeTab === 'payments' && (
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={openAddBalanceModal} className="btn btn-danger btn-sm flex items-center gap-2">
                                    <IconPlus className="w-4 h-4" />
                                    {t('message_balance_add_balance_btn')}
                                </button>
                                <button type="button" onClick={openAddPaymentModal} className="btn btn-primary btn-sm flex items-center gap-2">
                                    <IconPlus className="w-4 h-4" />
                                    {t('message_balance_add_payment_btn')}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-[#191e3a] border-b border-gray-200 dark:border-[#191e3a]">
                                    <th className="p-3 text-start">{t('date')}</th>
                                    <th className="p-3 text-start">{t('direction')}</th>
                                    <th className="p-3 text-start">{t('message_balance_total_messages')}</th>
                                    <th className="p-3 text-start">{t('amount')}</th>
                                    <th className="p-3 text-start">{t('description')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td className="p-6 text-center text-gray-500" colSpan={5}>
                                            {t('loading')}
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td className="p-6 text-center text-gray-500" colSpan={5}>
                                            {t('no_records')}
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="border-b border-gray-100 dark:border-[#191e3a]">
                                            <td className="p-3">{new Date(tx.created_at).toLocaleString()}</td>
                                            <td className="p-3">
                                                <span className={`badge ${tx.transaction_type === 'negative' ? 'badge-outline-danger' : 'badge-outline-success'}`}>
                                                    {tx.transaction_type === 'negative' ? t('deduction') : t('addition')}
                                                </span>
                                            </td>
                                            <td className={`p-3 font-semibold ${tx.messages_count < 0 ? 'text-danger' : 'text-success'}`}>{tx.messages_count}</td>
                                            <td className={`p-3 font-semibold ${tx.amount < 0 ? 'text-danger' : 'text-success'}`}>{formatAmount(tx.amount)}</td>
                                            <td className="p-3">{tx.note || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showAddPaymentModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
                    <div className="panel w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('message_balance_add_payment_modal_title')}</h3>
                            <button type="button" onClick={() => setShowAddPaymentModal(false)} className="text-gray-500 hover:text-danger">
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm">{t('message_balance_messages_count')}</label>
                            <input
                                type="number"
                                className="form-input w-full"
                                min={1}
                                value={form.messagesCount}
                                onChange={(e) => setForm((prev) => ({ ...prev, messagesCount: e.target.value }))}
                            />
                            <p className="mt-1 text-xs text-gray-500">{t('message_balance_messages_count_hint')}</p>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm">{t('message_balance_payment_amount')}</label>
                            <input
                                type="number"
                                className="form-input w-full"
                                min={0}
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                            />
                            <p className="mt-1 text-xs text-gray-500">{t('message_balance_manual_value_hint')}</p>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm">{t('description')}</label>
                            <textarea
                                rows={3}
                                className="form-textarea w-full resize-none"
                                value={form.note}
                                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                            />
                        </div>

                        {errorText && <p className="text-danger text-sm">{errorText}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddPaymentModal(false)}>
                                {t('cancel')}
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => submitTransaction('positive')} disabled={saving}>
                                {saving ? t('saving') : t('message_balance_add_payment_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddBalanceModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
                    <div className="panel w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('message_balance_add_balance_modal_title')}</h3>
                            <button type="button" onClick={() => setShowAddBalanceModal(false)} className="text-gray-500 hover:text-danger">
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm">{t('message_balance_messages_count')}</label>
                            <input
                                type="number"
                                className="form-input w-full"
                                min={1}
                                value={form.messagesCount}
                                onChange={(e) => setForm((prev) => ({ ...prev, messagesCount: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm">{t('message_balance_payment_amount')}</label>
                            <input
                                type="number"
                                className="form-input w-full"
                                min={0}
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm">{t('description')}</label>
                            <textarea
                                rows={3}
                                className="form-textarea w-full resize-none"
                                value={form.note}
                                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                            />
                        </div>

                        {errorText && <p className="text-danger text-sm">{errorText}</p>}

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddBalanceModal(false)}>
                                {t('cancel')}
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => submitTransaction('negative')} disabled={saving}>
                                {saving ? t('saving') : t('message_balance_add_balance_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
