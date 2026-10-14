/**
 * Holds the React context object and shared types for the language system.
 * Kept in a separate file so LanguageContext.tsx (component) and
 * useAppLanguage.ts (hook) can both import without creating circular deps
 * or violating Vite's Fast Refresh "consistent exports" requirement.
 */
import { createContext } from 'react';

export type AppLanguage = 'vi' | 'en';

export interface LanguageContextValue {
    language: AppLanguage;
    isTranslating: boolean;
    switchLanguage: (lang: AppLanguage) => Promise<void>;
    tDyn: (text: string | null | undefined) => string;
    registerText: (text: string) => void;
    unregisterText: (text: string) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
