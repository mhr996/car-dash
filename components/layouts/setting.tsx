'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { toggleAnimation, toggleLayout, toggleMenu, toggleNavbar, toggleRTL, toggleTheme, toggleSemidark, resetToggleSidebar } from '@/store/themeConfigSlice';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import IconSun from '@/components/icon/icon-sun';
import IconMoon from '@/components/icon/icon-moon';
import IconLaptop from '@/components/icon/icon-laptop';
import { getTranslation } from '@/i18n';

const Setting = () => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();
    const { t } = getTranslation();

    const [showCustomizer, setShowCustomizer] = useState(false);

    return (
        <div>
            <div className={`${(showCustomizer && '!block') || ''} fixed inset-0 z-[51] hidden bg-[black]/60 px-4 transition-[display]`} onClick={() => setShowCustomizer(false)}></div>

            <nav
                className={`${
                    (showCustomizer && 'ltr:!right-0 rtl:!left-0') || ''
                } fixed bottom-0 top-0 z-[51] w-full max-w-[400px] bg-white p-4 shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-[right] duration-300 ltr:-right-[400px] rtl:-left-[400px] dark:bg-black`}
            >
                <button
                    type="button"
                    className="absolute bottom-0 top-0 my-auto flex h-10 w-12 cursor-pointer items-center justify-center bg-primary text-white ltr:-left-12 ltr:rounded-bl-full ltr:rounded-tl-full rtl:-right-12 rtl:rounded-br-full rtl:rounded-tr-full"
                    onClick={() => setShowCustomizer(!showCustomizer)}
                >
                    <IconSettings className="h-5 w-5 animate-[spin_3s_linear_infinite]" />
                </button>

                <div className="perfect-scrollbar h-full overflow-y-auto overflow-x-hidden">
                    <div className="relative pb-5 text-center">
                        <button type="button" className="absolute top-0 opacity-30 hover:opacity-100 ltr:right-0 rtl:left-0 dark:text-white" onClick={() => setShowCustomizer(false)}>
                            <IconX className="h-5 w-5" />
                        </button>

                        <h4 className="mb-1 dark:text-white">{t('template_customizer')}</h4>
                        <p className="text-white-dark">{t('set_preferences_cookie')}</p>
                    </div>

                    <div className="mb-3 rounded-md border border-dashed border-white-light p-3 dark:border-[#1b2e4b]">
                        <h5 className="mb-1 text-base leading-none dark:text-white">{t('color_scheme')}</h5>
                        <p className="text-xs text-white-dark">{t('overall_light_dark')}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <button type="button" className={`${themeConfig.theme === 'light' ? 'btn-primary' : 'btn-outline-primary'} btn`} onClick={() => dispatch(toggleTheme('light'))}>
                                <IconSun className="h-5 w-5 shrink-0 ltr:mr-2 rtl:ml-2" />
                                {t('light')}
                            </button>

                            <button type="button" className={`${themeConfig.theme === 'dark' ? 'btn-primary' : 'btn-outline-primary'} btn`} onClick={() => dispatch(toggleTheme('dark'))}>
                                <IconMoon className="h-5 w-5 shrink-0 ltr:mr-2 rtl:ml-2" />
                                {t('dark')}
                            </button>

                            <button type="button" className={`${themeConfig.theme === 'system' ? 'btn-primary' : 'btn-outline-primary'} btn`} onClick={() => dispatch(toggleTheme('system'))}>
                                <IconLaptop className="h-5 w-5 shrink-0 ltr:mr-2 rtl:ml-2" />
                                {t('system')}
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 rounded-md border border-dashed border-white-light p-3 dark:border-[#1b2e4b]">
                        <h5 className="mb-1 text-base leading-none dark:text-white">{t('navigation_position')}</h5>
                        <p className="text-xs text-white-dark">{t('select_primary_navigation')}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                className={`${themeConfig.menu === 'horizontal' ? 'btn-primary' : 'btn-outline-primary'} btn`}
                                onClick={() => {
                                    dispatch(toggleMenu('horizontal'));
                                    dispatch(resetToggleSidebar());
                                }}
                            >
                                {t('horizontal')}
                            </button>

                            <button
                                type="button"
                                className={`${themeConfig.menu === 'vertical' ? 'btn-primary' : 'btn-outline-primary'} btn`}
                                onClick={() => {
                                    dispatch(toggleMenu('vertical'));
                                    dispatch(resetToggleSidebar());
                                }}
                            >
                                {t('vertical')}
                            </button>

                            <button
                                type="button"
                                className={`${themeConfig.menu === 'collapsible-vertical' ? 'btn-primary' : 'btn-outline-primary'} btn`}
                                onClick={() => {
                                    dispatch(toggleMenu('collapsible-vertical'));
                                    dispatch(resetToggleSidebar());
                                }}
                            >
                                {t('collapsible')}
                            </button>
                        </div>
                        <div className="mt-5 text-primary">
                            <label className="mb-0 inline-flex">
                                <input type="checkbox" className="form-checkbox" checked={themeConfig.semidark} onChange={(e) => dispatch(toggleSemidark(e.target.checked))} />
                                <span>{t('semi_dark_sidebar_header')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="mb-3 rounded-md border border-dashed border-white-light p-3 dark:border-[#1b2e4b]">
                        <h5 className="mb-1 text-base leading-none dark:text-white">{t('layout_style')}</h5>
                        <p className="text-xs text-white-dark">{t('select_primary_layout')}</p>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                className={`${themeConfig.layout === 'boxed-layout' ? 'btn-primary' : 'btn-outline-primary'} btn flex-auto`}
                                onClick={() => dispatch(toggleLayout('boxed-layout'))}
                            >
                                {t('box')}
                            </button>

                            <button type="button" className={`${themeConfig.layout === 'full' ? 'btn-primary' : 'btn-outline-primary'} btn flex-auto`} onClick={() => dispatch(toggleLayout('full'))}>
                                {t('full')}
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 rounded-md border border-dashed border-white-light p-3 dark:border-[#1b2e4b]">
                        <h5 className="mb-1 text-base leading-none dark:text-white">{t('direction')}</h5>
                        <p className="text-xs text-white-dark">{t('select_direction')}</p>
                        <div className="mt-3 flex gap-2">
                            <button type="button" className={`${themeConfig.rtlClass === 'ltr' ? 'btn-primary' : 'btn-outline-primary'} btn flex-auto`} onClick={() => dispatch(toggleRTL('ltr'))}>
                                {t('ltr')}
                            </button>

                            <button type="button" className={`${themeConfig.rtlClass === 'rtl' ? 'btn-primary' : 'btn-outline-primary'} btn flex-auto`} onClick={() => dispatch(toggleRTL('rtl'))}>
                                {t('rtl')}
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 rounded-md border border-dashed border-white-light p-3 dark:border-[#1b2e4b]">
                        <h5 className="mb-1 text-base leading-none dark:text-white">{t('navbar_type')}</h5>
                        <p className="text-xs text-white-dark">{t('sticky_or_floating')}</p>
                        <div className="mt-3 flex items-center gap-3 text-primary">
                            <label className="mb-0 inline-flex">
                                <input
                                    type="radio"
                                    checked={themeConfig.navbar === 'navbar-sticky'}
                                    value="navbar-sticky"
                                    className="form-radio"
                                    onChange={() => dispatch(toggleNavbar('navbar-sticky'))}
                                />
                                <span>{t('sticky')}</span>
                            </label>
                            <label className="mb-0 inline-flex">
                                <input
                                    type="radio"
                                    checked={themeConfig.navbar === 'navbar-floating'}
                                    value="navbar-floating"
                                    className="form-radio"
                                    onChange={() => dispatch(toggleNavbar('navbar-floating'))}
                                />
                                <span>{t('floating')}</span>
                            </label>
                            <label className="mb-0 inline-flex">
                                <input
                                    type="radio"
                                    checked={themeConfig.navbar === 'navbar-static'}
                                    value="navbar-static"
                                    className="form-radio"
                                    onChange={() => dispatch(toggleNavbar('navbar-static'))}
                                />
                                <span>{t('static')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="mb-3 rounded-md border border-dashed border-white-light p-3 dark:border-[#1b2e4b]">
                        <h5 className="mb-1 text-base leading-none dark:text-white">{t('router_transition')}</h5>
                        <p className="text-xs text-white-dark">{t('animation_main_content')}</p>
                        <div className="mt-3">
                            <select className="form-select border-primary text-primary" value={themeConfig.animation} onChange={(e) => dispatch(toggleAnimation(e.target.value))}>
                                <option value=" ">{t('none')}</option>
                                <option value="animate__fadeIn">{t('fade')}</option>
                                <option value="animate__fadeInDown">{t('fade_down')}</option>
                                <option value="animate__fadeInUp">{t('fade_up')}</option>
                                <option value="animate__fadeInLeft">{t('fade_left')}</option>
                                <option value="animate__fadeInRight">{t('fade_right')}</option>
                                <option value="animate__slideInDown">{t('slide_down')}</option>
                                <option value="animate__slideInLeft">{t('slide_left')}</option>
                                <option value="animate__slideInRight">{t('slide_right')}</option>
                                <option value="animate__zoomIn">{t('zoom_in')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Setting;
