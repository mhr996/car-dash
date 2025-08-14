'use client';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { IRootState } from '@/store';
import { toggleRTL, toggleTheme, toggleMenu, toggleLayout, toggleAnimation, toggleNavbar, toggleSemidark } from '@/store/themeConfigSlice';
import Loading from '@/components/layouts/loading';
import { getTranslation } from '@/i18n';
import { getCurrentUser } from '@/lib/auth';

function App({ children }: PropsWithChildren) {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const { initLocale } = getTranslation();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initTheme = () => {
            // Theme configuration
            dispatch(toggleTheme(localStorage.getItem('theme') || themeConfig.theme));
            dispatch(toggleMenu(localStorage.getItem('menu') || themeConfig.menu));
            dispatch(toggleLayout(localStorage.getItem('layout') || themeConfig.layout));
            dispatch(toggleRTL(localStorage.getItem('rtlClass') || themeConfig.rtlClass));
            dispatch(toggleAnimation(localStorage.getItem('animation') || themeConfig.animation));
            dispatch(toggleNavbar(localStorage.getItem('navbar') || themeConfig.navbar));
            dispatch(toggleSemidark(localStorage.getItem('semidark') || themeConfig.semidark));
            // locale
            initLocale(themeConfig.locale);
        };

        const checkAuth = async () => {
            initTheme();

            const publicPages = ['/login', '/reset-password', '/update-password'];
            if (pathname && publicPages.includes(pathname)) {
                setIsLoading(false);
                return;
            }

            const { user, error } = await getCurrentUser();
            if (error || !user) {
                router.push('/login');
            } else {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [
        dispatch,
        initLocale,
        router,
        pathname,
        themeConfig.theme,
        themeConfig.menu,
        themeConfig.layout,
        themeConfig.rtlClass,
        themeConfig.animation,
        themeConfig.navbar,
        themeConfig.locale,
        themeConfig.semidark,
    ]);

    return (
        <div
            className={`${(themeConfig.sidebar && 'toggle-sidebar') || ''} ${themeConfig.menu} ${themeConfig.layout} ${
                themeConfig.rtlClass
            } main-section relative font-almarai text-sm font-normal antialiased`}
        >
            {isLoading ? <Loading /> : children}
        </div>
    );
}

export default App;
