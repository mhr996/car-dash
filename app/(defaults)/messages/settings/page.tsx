'use client';

import { useState, useEffect } from 'react';
import IconSettings from '@/components/icon/icon-settings';
import IconSave from '@/components/icon/icon-save';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconChecks from '@/components/icon/icon-checks';
import IconRefresh from '@/components/icon/icon-refresh';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconUser from '@/components/icon/icon-user';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconRouter from '@/components/icon/icon-router';
import IconPlus from '@/components/icon/icon-plus';
import IconTrash from '@/components/icon/icon-trash';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';
import type { MessageTemplate } from '../message-templates';
import { DEFAULT_TEMPLATE_KEYS } from '../message-templates';

const TEMPLATES_STORAGE_KEY = 'msg_templates';

export default function MessageSettingsPage() {
    const { t } = getTranslation();
    const [settings, setSettings] = useState({
        provider: '019SMS',
        username: '',
        token: '',
        lastValidated: null as string | null,
        status: 'disconnected' as 'disconnected' | 'connected' | 'checking',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [templatesSaveSuccess, setTemplatesSaveSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'connection' | 'templates'>('connection');

    useEffect(() => {
        const stored = sessionStorage.getItem('msg_api_settings');
        if (stored) {
            const parsed = JSON.parse(stored);
            setSettings({
                provider: '019SMS',
                username: parsed.username || '',
                token: parsed.token || '',
                lastValidated: parsed.lastValidated || null,
                status: parsed.status || 'disconnected',
            });
        }
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
    }, [t]);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            const newSettings = {
                ...settings,
                lastValidated: new Date().toLocaleString(),
                status: (settings.token.length > 5 && settings.username.length > 0) ? 'connected' : 'disconnected',
            };
            sessionStorage.setItem('msg_api_settings', JSON.stringify(newSettings));
            setSettings(newSettings as typeof settings);
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }, 1500);
    };

    const handleSaveTemplates = () => {
        sessionStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        setTemplatesSaveSuccess(true);
        setTimeout(() => setTemplatesSaveSuccess(false), 3000);
    };

    const addTemplate = () => {
        setTemplates([...templates, { id: 'tpl_' + Date.now(), label: '', content: '' }]);
    };

    const updateTemplate = (id: string, field: 'label' | 'content', value: string) => {
        setTemplates(templates.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    };

    const removeTemplate = (id: string) => {
        setTemplates(templates.filter((t) => t.id !== id));
    };

    const moveTemplate = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= templates.length) return;
        const arr = [...templates];
        [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
        setTemplates(arr);
    };

    const statusLabel = settings.status === 'connected' ? t('connected') : settings.status === 'checking' ? t('checking') : t('disconnected');

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <IconSettings className="w-8 h-8 text-primary" />
                        {t('message_settings_title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('message_settings_description')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-[#191e3a]">
                <button
                    type="button"
                    onClick={() => setActiveTab('connection')}
                    className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
                        activeTab === 'connection'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <IconRouter className="w-4 h-4" />
                        {t('connection_settings')}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
                        activeTab === 'templates'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <IconMenuChat className="w-4 h-4" />
                        {t('fixed_messages')}
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'connection' && (
                    <div className="panel p-8 space-y-8">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#191e3a] pb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('connection_settings')}</h3>
                            <div
                                className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium ${
                                    settings.status === 'connected'
                                        ? 'bg-success/10 text-success'
                                        : settings.status === 'checking'
                                        ? 'bg-warning/10 text-warning'
                                        : 'bg-gray-100 dark:bg-[#191e3a] text-gray-500'
                                }`}
                            >
                                <div
                                    className={`w-2 h-2 rounded-full animate-pulse ${
                                        settings.status === 'connected' ? 'bg-success' : settings.status === 'checking' ? 'bg-warning' : 'bg-gray-400'
                                    }`}
                                />
                                {statusLabel}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <IconLockDots className="w-4 h-4" />
                                    {t('token_019')}
                                </label>
                                <input
                                    type="password"
                                    value={settings.token}
                                    onChange={(e) => setSettings({ ...settings, token: e.target.value })}
                                    placeholder={t('enter_token_placeholder')}
                                    className="form-input w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <IconUser className="w-4 h-4" />
                                    {t('username_019')}
                                </label>
                                <input
                                    type="text"
                                    value={settings.username}
                                    onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                                    placeholder={t('enter_username_placeholder')}
                                    className="form-input w-full"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="btn btn-primary w-full flex items-center justify-center gap-3"
                            >
                                {isSaving ? (
                                    <>
                                        <IconRefresh className="w-5 h-5 animate-spin" />
                                        {t('saving_and_validating')}
                                    </>
                                ) : (
                                    <>
                                        <IconSave className="w-5 h-5" />
                                        {t('save_settings')}
                                    </>
                                )}
                            </button>
                            {saveSuccess && (
                                <div className="mt-4 p-4 bg-success/10 text-success rounded-lg flex items-center gap-3 text-sm font-medium">
                                    <IconChecks className="w-5 h-5" />
                                    {t('settings_saved_success')}
                                </div>
                            )}
                        </div>
                    </div>
                    )}

                    {activeTab === 'templates' && (
                    <div className="panel p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#191e3a] pb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <IconMenuChat className="w-5 h-5 text-primary" />
                                    {t('fixed_messages')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('fixed_messages_description')}</p>
                            </div>
                            <button type="button" onClick={addTemplate} className="btn btn-sm btn-primary">
                                <IconPlus className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                                {t('add_message')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {templates.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-[#191e3a] rounded-lg">
                                    {t('no_templates_yet')}
                                </div>
                            ) : (
                                templates.map((tpl, index) => (
                                    <div key={tpl.id} className="p-4 rounded-lg border border-gray-200 dark:border-[#191e3a] space-y-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={tpl.label}
                                                onChange={(e) => updateTemplate(tpl.id, 'label', e.target.value)}
                                                placeholder={t('template_label_placeholder')}
                                                className="form-input flex-1"
                                            />
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => moveTemplate(index, 'up')}
                                                    disabled={index === 0}
                                                    className="btn btn-sm btn-outline-secondary p-2"
                                                    title={t('move_up')}
                                                >
                                                    <IconCaretDown className="w-4 h-4 rotate-180" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveTemplate(index, 'down')}
                                                    disabled={index === templates.length - 1}
                                                    className="btn btn-sm btn-outline-secondary p-2"
                                                    title={t('move_down')}
                                                >
                                                    <IconCaretDown className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTemplate(tpl.id)}
                                                    className="btn btn-sm btn-outline-danger p-2"
                                                    title={t('delete')}
                                                >
                                                    <IconTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={tpl.content}
                                            onChange={(e) => updateTemplate(tpl.id, 'content', e.target.value)}
                                            placeholder={t('template_content_placeholder')}
                                            rows={3}
                                            className="form-textarea w-full resize-none text-sm"
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        {templates.length > 0 && (
                            <div className="pt-4">
                                <button onClick={handleSaveTemplates} className="btn btn-primary flex items-center gap-2">
                                    <IconSave className="w-4 h-4" />
                                    {t('save_templates')}
                                </button>
                                {templatesSaveSuccess && (
                                    <span className="ltr:ml-3 rtl:mr-3 text-success text-sm">{t('templates_saved')}</span>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {activeTab === 'connection' && (
                <div className="space-y-6">
                    <div className="panel p-8 space-y-6 bg-primary/5 border border-primary/20">
                        <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
                            <IconLockDots className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('data_security')}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 leading-relaxed">{t('api_keys_stored_securely')}</p>
                        </div>
                        <div className="pt-4 flex items-center justify-between border-t border-gray-200 dark:border-[#191e3a] text-xs text-gray-500">
                            <span>{t('last_validated')}:</span>
                            <span>{settings.lastValidated || t('never')}</span>
                        </div>
                    </div>

                    <div className="panel p-8 space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-[#191e3a] pb-4">{t('quick_guide')}</h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#191e3a] flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">1</div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('guide_step_1')}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#191e3a] flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">2</div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('guide_step_2')}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#191e3a] flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">3</div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('guide_step_3')}</p>
                            </div>
                        </div>
                        <div className="bg-warning/10 p-4 rounded-lg border border-warning/20 flex gap-3 text-warning">
                            <IconInfoCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-xs leading-relaxed">{t('sms_cost_notice')}</p>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
