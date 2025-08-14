'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import { updatePassword } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getTranslation } from '@/i18n';

const ComponentsAuthUpdatePasswordForm = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            setError(t('fill_all_fields'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('passwords_not_match'));
            return;
        }

        if (password.length < 6) {
            setError(t('password_min_length'));
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const result = await updatePassword(password);

            if (result.error) {
                setError(result.error);
            } else {
                setMessage(t('password_updated_successfully'));
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
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
                <label htmlFor="password" className="dark:text-white">
                    {t('new_password')}
                </label>
                <div className="relative text-white-dark">
                    <input
                        id="password"
                        type="password"
                        placeholder={t('enter_new_password')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>

            <div>
                <label htmlFor="confirmPassword" className="dark:text-white">
                    {t('confirm_password')}
                </label>
                <div className="relative text-white-dark">
                    <input
                        id="confirmPassword"
                        type="password"
                        placeholder={t('confirm_new_password')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            {message && <div className="text-green-500 text-sm mt-2">{message}</div>}

            <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" disabled={loading}>
                {loading ? t('updating') : t('update_password_btn')}
            </button>
        </form>
    );
};

export default ComponentsAuthUpdatePasswordForm;
