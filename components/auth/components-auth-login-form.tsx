'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { signIn } from '@/lib/auth';
import Link from 'next/link';
import { getTranslation } from '@/i18n';
import ComponentsAuthOTPVerifyForm from './components-auth-otp-verify-form';
import supabase from '@/lib/supabase';

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

const ComponentsAuthLoginForm = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOTPVerification, setShowOTPVerification] = useState(false);

    const validateForm = () => {
        const newErrors: FormErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            newErrors.email = t('email_required');
        } else if (!emailRegex.test(email)) {
            newErrors.email = t('email_invalid');
        }

        // Password validation
        if (!password) {
            newErrors.password = t('password_required');
        }

        return newErrors;
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            // First verify credentials without logging in
            const { error } = await signIn(email, password);

            if (error) {
                setErrors({ general: t('invalid_credentials') });
                setIsSubmitting(false);
                return;
            }

            // Credentials are valid, sign out immediately to prevent auto-login
            await supabase.auth.signOut();

            // Send OTP to user's email
            const otpResponse = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const otpData = await otpResponse.json();

            if (!otpResponse.ok) {
                setErrors({ general: otpData.error || t('otp_send_failed') || 'Failed to send verification code' });
                setIsSubmitting(false);
                return;
            }

            // Show OTP verification form
            setShowOTPVerification(true);
        } catch (error) {
            console.error('Login error:', error);
            setErrors({ general: t('unexpected_error') });
            setIsSubmitting(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToLogin = () => {
        setShowOTPVerification(false);
        setPassword('');
        setErrors({});
    };

    // Show OTP verification form if credentials are validated
    if (showOTPVerification) {
        return <ComponentsAuthOTPVerifyForm email={email} onBack={handleBackToLogin} />;
    }

    return (
        <form className="space-y-5 dark:text-white" onSubmit={submitForm}>
            {errors.general && <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-md mb-4">{errors.general}</div>}
            <div>
                <label htmlFor="Email">{t('email')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Email"
                        type="email"
                        placeholder={t('enter_email')}
                        className={`form-input rounded-3xl py-3 ps-10 placeholder:text-white-dark ${errors.email ? 'border-red-500' : ''}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
                {errors.email && <span className="text-red-500 text-sm mt-1">{errors.email}</span>}
            </div>
            <div>
                <label htmlFor="Password">{t('password')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Password"
                        type="password"
                        placeholder={t('enter_password')}
                        className={`form-input rounded-3xl py-3 ps-10 placeholder:text-white-dark ${errors.password ? 'border-red-500' : ''}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
                {errors.password && <span className="text-red-500 text-sm mt-1">{errors.password}</span>}
            </div>
            <div className="flex justify-between">
                <label className="flex cursor-pointer items-center">
                    <input type="checkbox" className="form-checkbox bg-white dark:bg-black" />
                    <span className="text-white-dark">{t('remember_me')}</span>
                </label>
                <Link href="/reset-password" className="text-primary hover:underline">
                    {t('forgot_password')}
                </Link>
            </div>
            <button type="submit" className="btn btn-gradient rounded-3xl py-3 !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" disabled={isSubmitting}>
                {isSubmitting ? t('signing_in') : t('sign_in')}
            </button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
