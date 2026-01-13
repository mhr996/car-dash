'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

interface OTPVerifyFormProps {
    email: string;
    onBack: () => void;
}

const ComponentsAuthOTPVerifyForm = ({ email, onBack }: OTPVerifyFormProps) => {
    const { t } = getTranslation();
    const router = useRouter();
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        // Countdown timer for resend button
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            // Focus previous input on backspace if current is empty
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();

        // Check if pasted data is 6 digits
        if (/^\d{6}$/.test(pastedData)) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            setError('');
            // Focus last input
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join('');

        if (otpCode.length !== 6) {
            setError(t('otp_incomplete') || 'Please enter all 6 digits');
            return;
        }

        setIsVerifying(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otpCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || t('otp_verification_failed') || 'Verification failed');
                setIsVerifying(false);
                return;
            }

            if (data.verified) {
                // Prefer verifying via token hash using Supabase client
                if (data.tokenHash) {
                    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                        type: 'magiclink',
                        token_hash: data.tokenHash,
                    });

                    if (verifyError) {
                        console.error('VerifyOtp error:', verifyError);
                        setError(t('session_creation_failed') || 'Failed to create session');
                        setIsVerifying(false);
                        return;
                    }

                    if (verifyData?.session) {
                        router.push('/');
                        return;
                    }
                }

                // Fallback: redirect the browser to the magic link to complete auth
                if (data.signInLink) {
                    window.location.href = data.signInLink;
                    return;
                }

                setError(t('session_creation_failed') || 'Failed to create session');
                setIsVerifying(false);
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError(t('unexpected_error') || 'An unexpected error occurred');
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setError('');
        setOtp(['', '', '', '', '', '']);

        try {
            const response = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || t('otp_resend_failed') || 'Failed to resend OTP');
            } else {
                setCountdown(60); // 60 seconds cooldown
                inputRefs.current[0]?.focus();
            }
        } catch (error) {
            console.error('Resend error:', error);
            setError(t('unexpected_error') || 'An unexpected error occurred');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={handleVerify}>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">{t('verify_email') || 'Verify Your Email'}</h2>
                <p className="text-white-dark">{t('otp_sent_to') || 'We sent a verification code to'}</p>
                <p className="font-semibold text-primary">{email}</p>
            </div>

            {error && <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-md mb-4 text-center">{error}</div>}

            <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => {
                            inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-primary focus:outline-none transition-colors dark:bg-gray-800 dark:border-gray-600"
                        disabled={isVerifying}
                    />
                ))}
            </div>

            <button type="submit" className="btn btn-gradient rounded-3xl py-3 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" disabled={isVerifying || otp.some((d) => !d)}>
                {isVerifying ? t('verifying') || 'Verifying...' : t('verify') || 'Verify'}
            </button>

            <div className="text-center mt-4">
                <button type="button" onClick={handleResend} disabled={isResending || countdown > 0} className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                    {isResending ? t('resending') || 'Resending...' : countdown > 0 ? `${t('resend_in') || 'Resend in'} ${countdown}s` : t('resend_code') || 'Resend Code'}
                </button>
            </div>

            <div className="text-center mt-4">
                <button type="button" onClick={onBack} className="text-white-dark hover:text-primary transition" disabled={isVerifying}>
                    ← {t('back_to_login') || 'Back to Login'}
                </button>
            </div>
        </form>
    );
};

export default ComponentsAuthOTPVerifyForm;
