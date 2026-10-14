/**
 * <T> — Translate dynamic content (database strings) to the active app language.
 *
 * Usage:
 *   <T>{room.roomName}</T>
 *   <T className="text-sm">{room.description}</T>
 *
 * Behaviour:
 * - Registers its text in the global textRegistry on mount (always, regardless of language).
 * - Deregisters on unmount so stale texts don't accumulate.
 * - When language = 'vi': renders original text with zero overhead.
 * - When language = 'en': returns the cached translation instantly, or the
 *   original while the auto-batch fetch is in flight.
 */
import { useEffect, type ElementType } from 'react';
import { useAppLanguage } from '@/app/context/useAppLanguage';

interface TProps {
    children: string | null | undefined;
    className?: string;
    as?: ElementType;
    [key: string]: unknown;
}

export function T({ children, className, as: Tag, ...rest }: TProps) {
    const { tDyn, registerText, unregisterText } = useAppLanguage();

    // Register on mount/change, deregister on unmount.
    // This runs unconditionally so switchLanguage always sees the full registry.
    useEffect(() => {
        if (!children) return;
        registerText(children);
        return () => unregisterText(children);
    }, [children, registerText, unregisterText]);

    const output = tDyn(children);

    if (!Tag && !className) {
        return <>{output}</>;
    }

    const Element = Tag ?? 'span';
    return <Element className={className} {...rest}>{output}</Element>;
}
