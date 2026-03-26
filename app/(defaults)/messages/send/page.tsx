'use client';

import { useState, useEffect } from 'react';
import type { MessageTemplate } from '../message-templates';
import { DEFAULT_TEMPLATE_KEYS } from '../message-templates';
import IconSend from '@/components/icon/icon-send';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconUser from '@/components/icon/icon-user';
import IconMenuScrumboard from '@/components/icon/menu/icon-menu-scrumboard';
import IconChecks from '@/components/icon/icon-checks';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconClock from '@/components/icon/icon-clock';
import IconSearch from '@/components/icon/icon-search';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';

type DefaultMessageType = 'collection' | 'promotion' | 'holiday' | 'other';
type TargetType = 'all' | 'group' | 'individual';

const TEMPLATES_STORAGE_KEY = 'msg_templates';
const OTHER_TYPE_ID = 'other';

export default function SendMessagePage() {
    const { t } = getTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [targetType, setTargetType] = useState<TargetType>('individual');
    const [selectedGroup, setSelectedGroup] = useState<string>('private');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [messageType, setMessageType] = useState<string>(OTHER_TYPE_ID);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const { data, error } = await supabase.from('customers').select('id, name, phone, customer_type').order('name');
                if (error) throw error;
                const list = (data || []).map((c: any) => ({ id: c.id, name: c.name, type: c.customer_type || 'private', phone: c.phone || '', email: '' }));
                setCustomers(list);

                const customerId = searchParams?.get('customerId');
                const matchedCustomer = customerId ? list.find((c: any) => String(c.id) === String(customerId)) : null;
                if (matchedCustomer) {
                    setSelectedCustomerId(String(matchedCustomer.id));
                    setTargetType('individual');
                    setSearchTerm(matchedCustomer.name || '');
                }
            } catch (e) {
                console.error('Failed to load customers:', e);
            }
        };
        loadCustomers();
        const storedTemplates = sessionStorage.getItem(TEMPLATES_STORAGE_KEY);
        if (storedTemplates) {
            const parsed = JSON.parse(storedTemplates) as MessageTemplate[];
            setTemplates(parsed);
        } else {
            setTemplates(
                DEFAULT_TEMPLATE_KEYS.map(({ id, labelKey, contentKey }) => ({
                    id,
                    label: t(labelKey),
                    content: t(contentKey),
                }))
            );
        }
    }, [t, searchParams]);

    const handleMessageTypeSelect = (type: string) => {
        setMessageType(type);
        if (type === OTHER_TYPE_ID) {
            setSubject('');
            setContent('');
        } else {
            const tpl = templates.find((t) => t.id === type);
            setSubject(tpl?.label ?? '');
            setContent(tpl?.content ?? '');
        }
    };

    const filteredCustomers = customers.filter(
        (c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm)
    );

    const handleSend = async () => {
        if (!content) return;
        setIsSending(true);

        try {
            const recipient =
                targetType === 'all'
                    ? t('all_customers')
                    : targetType === 'group'
                    ? `${t('group')} ${selectedGroup}`
                    : customers.find((c) => String(c.id) === String(selectedCustomerId))?.name || t('customer');

            let phoneNumbers: string[] = [];
            if (targetType === 'individual' && selectedCustomerId) {
                const customer = customers.find((c) => String(c.id) === String(selectedCustomerId));
                if (customer?.phone) phoneNumbers = [customer.phone];
            } else if (targetType === 'group') {
                phoneNumbers = customers
                    .filter((c) => (c.type || 'private') === selectedGroup && c.phone)
                    .map((c) => c.phone!);
            } else if (targetType === 'all') {
                phoneNumbers = customers.filter((c) => c.phone).map((c) => c.phone!);
            }

            if (phoneNumbers.length === 0) {
                alert(t('no_phone_numbers') || 'No valid phone numbers for selected recipients.');
                setIsSending(false);
                return;
            }

            const isTemplate = messageType !== OTHER_TYPE_ID;
            const typeForDb = isTemplate ? (templates.find((t) => t.id === messageType)?.label || messageType) : t('other');

            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient,
                    type: typeForDb,
                    content,
                    target_type: targetType,
                    customer_id: targetType === 'individual' ? selectedCustomerId : undefined,
                    phone_numbers: phoneNumbers,
                    group_filter: targetType === 'group' ? selectedGroup : undefined,
                }),
            });

            const text = await res.text();
            let json: { error?: string } = {};
            try {
                json = JSON.parse(text);
            } catch {
                json = { error: text || 'Unknown error' };
            }
            if (!res.ok) {
                const errMsg = json.error || t('send_failed') || 'Failed to send';
                console.error('Send message error:', res.status, json);
                alert(errMsg);
                setIsSending(false);
                return;
            }

            setIsSending(false);
            setSendSuccess(true);
            setTimeout(() => {
                setSendSuccess(false);
                router.push('/messages/history');
            }, 2000);
        } catch (e) {
            console.error('Failed to save message:', e);
            alert(t('send_failed') || 'Failed to send');
            setIsSending(false);
        }
    };

    const allMessageTypes = [...templates.map((t) => t.id), OTHER_TYPE_ID];

    const getMessageTypeLabel = (type: string) => {
        if (type === OTHER_TYPE_ID) return t('other');
        const tpl = templates.find((t) => t.id === type);
        return tpl?.label || type;
    };

    if (sendSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                <div className="w-24 h-24 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
                    <IconChecks className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('messages_sent_success')}</h2>
                <p className="text-gray-500 dark:text-gray-400">{t('redirecting_to_history')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <IconSend className="w-8 h-8 text-primary" />
                        {t('send_messages_to_customers')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('manage_customer_communication')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="panel p-8 space-y-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-[#191e3a] pb-4 mb-6">1. {t('who_to_send')}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setTargetType('individual')}
                                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                    targetType === 'individual' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-[#191e3a] hover:border-gray-300'
                                }`}
                            >
                                <IconUser className="w-8 h-8" />
                                <span className="font-semibold">{t('single_customer')}</span>
                            </button>
                            <button
                                onClick={() => setTargetType('group')}
                                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                    targetType === 'group' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-[#191e3a] hover:border-gray-300'
                                }`}
                            >
                                <IconMenuScrumboard className="w-8 h-8" />
                                <span className="font-semibold">{t('customer_group')}</span>
                            </button>
                            <button
                                onClick={() => setTargetType('all')}
                                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                    targetType === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-[#191e3a] hover:border-gray-300'
                                }`}
                            >
                                <IconUsersGroup className="w-8 h-8" />
                                <span className="font-semibold">{t('all_customers')}</span>
                            </button>
                        </div>

                        {targetType === 'individual' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <IconSearch className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={t('search_customer_placeholder')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="form-input w-full ltr:pl-12 rtl:pr-12"
                                    />
                                </div>
                                {searchTerm && filteredCustomers.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-[#191e3a] rounded-lg p-2 max-h-48 overflow-y-auto">
                                        {filteredCustomers.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomerId(String(c.id));
                                                    setSearchTerm('');
                                                }}
                                                className={`w-full text-start p-3 rounded-lg hover:bg-white dark:hover:bg-[#0e1726] flex items-center justify-between ${
                                                    String(selectedCustomerId) === String(c.id) ? 'bg-white dark:bg-[#0e1726] ring-1 ring-primary' : ''
                                                }`}
                                            >
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.phone || t('no_phone')}</p>
                                                </div>
                                                {String(selectedCustomerId) === String(c.id) && <IconChecks className="w-5 h-5 text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedCustomerId && !searchTerm && (
                                    <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                                <IconUser className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {customers.find((c) => String(c.id) === String(selectedCustomerId))?.name}
                                                </p>
                                                <p className="text-xs text-primary">
                                                    {customers.find((c) => String(c.id) === String(selectedCustomerId))?.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedCustomerId('')} className="text-gray-500 hover:text-danger text-sm">
                                            {t('change_customer')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {targetType === 'group' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('select_group')}</label>
                                <select
                                    value={selectedGroup}
                                    onChange={(e) => setSelectedGroup(e.target.value)}
                                    className="form-select w-full"
                                >
                                    <option value="private">{t('private_customers')}</option>
                                    <option value="business">{t('business_customers')}</option>
                                    <option value="general">{t('general')}</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="panel p-8 space-y-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-[#191e3a] pb-4 mb-6">2. {t('what_to_send')}</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('message_type')}</label>
                            <div className="flex flex-wrap gap-3">
                                {allMessageTypes.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleMessageTypeSelect(type)}
                                        className={`px-6 py-3 rounded-full font-semibold text-sm transition-all ${
                                            messageType === type ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-[#191e3a] text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {getMessageTypeLabel(type)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('message_subject_optional')}</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('subject_placeholder')}
                                className="form-input w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('message_content')}</label>
                            <textarea
                                rows={6}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={t('content_placeholder')}
                                className="form-textarea w-full resize-none"
                            />
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>{t('characters')}: {content.length}</span>
                                <span>{t('estimated_messages')}: {Math.ceil(content.length / 160) || 1}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="panel p-8 sticky top-6">
                        <div className="pb-6 border-b border-gray-200 dark:border-[#191e3a] mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <IconMenuChat className="w-5 h-5 text-primary" />
                                {t('preview')}
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-100 dark:bg-[#191e3a] rounded-xl p-6">
                                <p className="text-xs text-gray-500 mb-2 uppercase">{t('preview_label')}</p>
                                <div className="space-y-2">
                                    {subject && <p className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 pb-2 mb-2">{subject}</p>}
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{content || t('content_preview_placeholder')}</p>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-4">{new Date().toLocaleTimeString()}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#191e3a] rounded-lg">
                                    <div className="flex items-center gap-3 text-gray-500">
                                        <IconUsersGroup className="w-5 h-5" />
                                        <span className="text-sm">{t('target_audience')}:</span>
                                    </div>
                                    <span className="font-semibold text-primary">
                                        {targetType === 'all'
                                            ? t('all_customers')
                                            : targetType === 'group'
                                            ? selectedGroup
                                            : selectedCustomerId
                                            ? customers.find((c) => String(c.id) === String(selectedCustomerId))?.name
                                            : t('not_selected')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#191e3a] rounded-lg">
                                    <div className="flex items-center gap-3 text-gray-500">
                                        <IconInfoCircle className="w-5 h-5" />
                                        <span className="text-sm">{t('type')}:</span>
                                    </div>
                                    <span className="font-semibold text-primary">{getMessageTypeLabel(messageType)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={isSending || !content || (targetType === 'individual' && !selectedCustomerId)}
                                className="btn btn-primary w-full flex items-center justify-center gap-3 py-4"
                            >
                                {isSending ? (
                                    <>
                                        <IconClock className="w-6 h-6 animate-spin" />
                                        {t('sending')}
                                    </>
                                ) : (
                                    <>
                                        <IconSend className="w-6 h-6" />
                                        {t('send_messages_btn')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
