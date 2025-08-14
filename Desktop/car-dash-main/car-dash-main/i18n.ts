const cookieObj = typeof window === 'undefined' ? require('next/headers') : require('universal-cookie');

import en from './public/locales/en.json';
import ae from './public/locales/ae.json';
import he from './public/locales/he.json';

const langObj: any = { en, ae, he };

const getLang = () => {
    let lang = null;
    if (typeof window !== 'undefined') {
        const cookies = new cookieObj(null, { path: '/' });
        lang = cookies.get('i18nextLng');

        // If no language cookie is set, set Arabic as default
        if (!lang) {
            cookies.set('i18nextLng', 'ae');
            lang = 'ae';
        }
    } else {
        const cookies = cookieObj.cookies();
        lang = cookies.get('i18nextLng')?.value;
    }
    return lang;
};

export const getTranslation = () => {
    const lang = getLang();
    const defaultLang = 'ae'; // Set Arabic as default
    const currentLang = lang || defaultLang;
    const data: any = langObj[currentLang];

    const t = (key: string) => {
        return data[key] ? data[key] : key;
    };

    const initLocale = (themeLocale: string) => {
        const lang = getLang();
        i18n.changeLanguage(lang || themeLocale || defaultLang);
    };

    const i18n = {
        language: currentLang,
        changeLanguage: (lang: string) => {
            const cookies = new cookieObj(null, { path: '/' });
            cookies.set('i18nextLng', lang);
        },
    };

    return { t, i18n, initLocale };
};
