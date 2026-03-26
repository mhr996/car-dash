'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import { useRouter } from 'next/navigation';
import React from 'react';
import { getTranslation } from '@/i18n';

const ComponentsAuthUnlockForm = () => {
    const router = useRouter();
    const { t } = getTranslation();

    const submitForm = (e: any) => {
        e.preventDefault();
        router.push('/');
    };
    return (
        <form className="space-y-5" onSubmit={submitForm}>
            <div>
                <label htmlFor="Password" className="dark:text-white">
                    {t('password')}
                </label>
                <div className="relative text-white-dark">
                    <input id="Password" type="password" placeholder={t('enter_password')} className="form-input ps-10 placeholder:text-white-dark" />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>
            <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                {t('unlock')}
            </button>
        </form>
    );
};

export default ComponentsAuthUnlockForm;
