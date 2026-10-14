import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

export const defaultNS = 'translation';

export const supportedLngs = ['vi', 'en'] as const;
export type SupportedLng = (typeof supportedLngs)[number];

i18n.use(initReactI18next).init({
    resources: {
        vi: { [defaultNS]: vi },
        en: { [defaultNS]: en },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    supportedLngs: supportedLngs as unknown as string[],
    defaultNS,
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
