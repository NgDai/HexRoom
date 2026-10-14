import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import i18n from '@/i18n';
import { getCached, translateBatch } from '@/lib/translate-api';
import { LanguageContext, type AppLanguage } from './language-context-ref';

// ── Persistent on-screen text registry ───────────────────────────────────────
// Always contains EVERY text currently rendered by <T> components.
const textRegistry = new Set<string>();

// Pending queue for auto-batch after language is already 'en' (new content loads)
const pendingSet = new Set<string>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<AppLanguage>(() => {
        const stored = localStorage.getItem('ez_lang') as AppLanguage | null;
        return stored === 'en' ? 'en' : 'vi';
    });
    const [isTranslating, setIsTranslating] = useState(false);
    const [epoch, setEpoch] = useState(0);
    const langRef = useRef(language);
    langRef.current = language;

    useEffect(() => {
        i18n.changeLanguage(language);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const bump = useCallback(() => setEpoch((e) => e + 1), []);

    const registerText = useCallback((text: string) => {
        if (!text || !text.trim()) return;
        textRegistry.add(text);

        if (langRef.current === 'en' && getCached(text, 'vi', 'en') === undefined) {
            pendingSet.add(text);
            if (batchTimer) clearTimeout(batchTimer);
            batchTimer = setTimeout(async () => {
                const toTranslate = [...pendingSet].filter(
                    (t) => getCached(t, 'vi', 'en') === undefined,
                );
                pendingSet.clear();
                if (toTranslate.length === 0) return;
                setIsTranslating(true);
                try {
                    await translateBatch(toTranslate, 'vi', 'en');
                } finally {
                    setIsTranslating(false);
                    setEpoch((e) => e + 1);
                }
            }, 150);
        }
     
    }, []);

    const unregisterText = useCallback((text: string) => {
        textRegistry.delete(text);
        pendingSet.delete(text);
    }, []);

    const tDyn = useCallback(
        (text: string | null | undefined): string => {
            void epoch;
            if (!text) return text ?? '';
            if (language === 'vi') return text;
            return getCached(text, 'vi', 'en') ?? text;
        },
        [language, epoch],
    );

    const switchLanguage = useCallback(
        async (lang: AppLanguage) => {
            if (lang === language) return;

            await i18n.changeLanguage(lang);
            localStorage.setItem('ez_lang', lang);

            if (lang === 'vi') {
                setLanguage('vi');
                langRef.current = 'vi';
                return;
            }

            const allTexts = [...textRegistry].filter(
                (t) => t.trim() && getCached(t, 'vi', 'en') === undefined,
            );

            setIsTranslating(true);
            try {
                if (allTexts.length > 0) {
                    await translateBatch(allTexts, 'vi', 'en');
                }
            } finally {
                langRef.current = 'en';
                setLanguage('en');
                bump();
                setIsTranslating(false);
            }
        },
        [language, bump],
    );

    return (
        <LanguageContext.Provider
            value={{ language, isTranslating, switchLanguage, tDyn, registerText, unregisterText }}
        >
            {children}
        </LanguageContext.Provider>
    );
}
