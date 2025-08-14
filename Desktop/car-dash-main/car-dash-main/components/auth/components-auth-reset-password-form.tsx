'use client';
import IconMail from '@/components/icon/icon-mail';
import { useState } from 'react';
import { resetPassword } from '@/lib/auth';
import { getTranslation } from '@/i18n';

const ComponentsAuthResetPasswordForm = () => {
    const { t } = getTranslation();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError(t('enter_email_reset'));
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const result = await resetPassword(email);

            if (result.error) {
                setError(result.error);
            } else {
                setMessage(t('password_reset_link_sent'));
                setEmail('');
            }
        } catch (err) {
            setError(t('unexpected_error'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
                <label htmlFor="Email" className="dark:text-white">
                    {t('email')}
                </label>
                <div className="relative text-white-dark">
                    <input
                        id="Email"
                        type="email"
                        placeholder={t('enter_email')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            {message && <div className="text-green-500 text-sm mt-2">{message}</div>}

            <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" disabled={loading}>
                {loading ? t('sending') : t('recover')}
            </button>
        </form>
    );
};

export default ComponentsAuthResetPasswordForm;
