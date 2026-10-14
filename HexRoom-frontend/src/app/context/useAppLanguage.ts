/**
 * Separate hook file — keeps LanguageContext.tsx component-only so Vite
 * React SWC Fast Refresh works without the "incompatible export" warning.
 */
import { useContext } from 'react';
import { LanguageContext, type LanguageContextValue, type AppLanguage } from './language-context-ref';

export type { AppLanguage, LanguageContextValue };

export function useAppLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useAppLanguage must be used inside <LanguageProvider>');
    return ctx;
}
