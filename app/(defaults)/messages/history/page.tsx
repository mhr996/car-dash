'use client';

import { useState, useEffect } from 'react';
import IconArchive from '@/components/icon/icon-archive';
import IconSearch from '@/components/icon/icon-search';
import IconFilter from '@/components/icon/icon-filter';
import IconCalendar from '@/components/icon/icon-calendar';
import IconChecks from '@/components/icon/icon-checks';
import IconInfoTriangle from '@/components/icon/icon-info-triangle';
import IconClock from '@/components/icon/icon-clock';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconMail from '@/components/icon/icon-mail';
import IconSend from '@/components/icon/icon-send';
import IconUser from '@/components/icon/icon-user';
import IconMenuScrumboard from '@/components/icon/menu/icon-menu-scrumboard';
import IconUsersGroup from '@/components/icon/icon-users-group';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';

export default function MessageHistoryPage() {
    const { t } = getTranslation();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setMessages(data || []);
            } catch (e) {
                console.error('Failed to load messages:', e);
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, []);

    const filteredMessages = messages.filter((msg) => {
        const matchesSearch =
            msg.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) || msg.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || msg.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
                return <IconChecks className="w-4 h-4 text-success" />;
            case 'pending':
                return <IconClock className="w-4 h-4 text-warning" />;
            case 'failed':
                return <IconInfoTriangle className="w-4 h-4 text-danger" />;
            default:
                return <IconClock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTargetIcon = (recipient: string) => {
        if (recipient === t('all_customers')) return <IconUsersGroup className="w-4 h-4" />;
        if (recipient?.startsWith(t('group'))) return <IconMenuScrumboard className="w-4 h-4" />;
        return <IconUser className="w-4 h-4" />;
    };

    const typeLabels: Record<string, string> = {
        collection: t('collection'),
        promotion: t('promotion'),
        holiday: t('holiday_greetings'),
        other: t('other'),
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <IconArchive className="w-8 h-8 text-primary" />
                        {t('message_history')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('message_history_description')}</p>
                </div>
                <button
                    onClick={() => router.push('/messages/send')}
                    className="btn btn-primary flex items-center gap-3 self-start"
                >
                    <IconSend className="w-5 h-5" />
                    {t('send_new_message')}
                </button>
            </div>

            <div className="panel overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-[#191e3a] bg-gray-50/30 dark:bg-[#191e3a]/30 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <IconSearch className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('search_recipient_content')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input w-full ltr:pl-12 rtl:pr-12"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <IconFilter className="w-5 h-5 text-gray-400" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="form-select"
                            >
                                <option value="all">{t('all_types')}</option>
                                <option value="collection">{t('collection')}</option>
                                <option value="promotion">{t('promotion')}</option>
                                <option value="holiday">{t('holiday_greetings')}</option>
                                <option value="other">{t('other')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-[#191e3a] border-b border-gray-200 dark:border-[#191e3a]">
                                <th className="p-4 text-start font-semibold text-gray-600 dark:text-gray-400">{t('date')}</th>
                                <th className="p-4 text-start font-semibold text-gray-600 dark:text-gray-400">{t('recipient')}</th>
                                <th className="p-4 text-start font-semibold text-gray-600 dark:text-gray-400">{t('type')}</th>
                                <th className="p-4 text-start font-semibold text-gray-600 dark:text-gray-400">{t('message_content')}</th>
                                <th className="p-4 text-start font-semibold text-gray-600 dark:text-gray-400">{t('status')}</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-[#191e3a]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        {t('loading')}...
                                    </td>
                                </tr>
                            ) : filteredMessages.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-60">
                                            <IconMail className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
                                            <p className="text-xl font-bold text-gray-500 dark:text-gray-400">{t('no_messages_found')}</p>
                                            <p className="text-sm text-gray-400 mt-2">{t('messages_will_appear_here')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-[#191e3a]/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <IconCalendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : '-'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="text-primary">{getTargetIcon(msg.recipient)}</div>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{msg.recipient}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                                                    msg.type === 'collection'
                                                        ? 'bg-danger/10 text-danger'
                                                        : msg.type === 'promotion'
                                                        ? 'bg-success/10 text-success'
                                                        : 'bg-primary/10 text-primary'
                                                }`}
                                            >
                                                {typeLabels[msg.type] || msg.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 max-w-xs">{msg.content}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(msg.status)}
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{msg.status}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button className="text-gray-400 hover:text-primary transition-colors">
                                                <IconHorizontalDots className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
