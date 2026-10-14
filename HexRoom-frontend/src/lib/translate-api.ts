import { getApiUrl } from './api-config';

type LangPair = 'vi-en' | 'en-vi';

// ── In-memory translation cache ───────────────────────────────────────────────
const memCache = new Map<string, string>();

const SESSION_KEY = 'ez_tx_cache';
const CACHE_VERSION_KEY = 'ez_tx_cache_v';
const CACHE_VERSION = '3'; // bump this when translation logic changes to clear stale data
const MAX_SESSION_ENTRIES = 8000;

function loadSessionCache() {
    if (memCache.size > 0) return;
    try {
        // If the cache version doesn't match, discard stale cache
        const storedVersion = sessionStorage.getItem(CACHE_VERSION_KEY);
        if (storedVersion !== CACHE_VERSION) {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
            return;
        }
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
            const entries: [string, string][] = JSON.parse(raw);
            for (const [k, v] of entries) {
                // Skip "pass-through" translations where value equals the source text.
                // These are artefacts of earlier failed translation runs.
                // Key format: "vi-en:sourceText" or "en-vi:sourceText"
                const colonIdx = k.indexOf(':', 3);
                if (colonIdx !== -1) {
                    const sourceText = k.slice(colonIdx + 1);
                    if (v === sourceText) continue; // stale / failed translation
                }
                memCache.set(k, v);
            }
        }
    } catch {
        // sessionStorage unavailable or corrupt — ignore
    }
}

function saveSessionCache() {
    try {
        const entries = [...memCache.entries()];
        // Keep only the most-recent MAX_SESSION_ENTRIES items
        const trimmed = entries.slice(-MAX_SESSION_ENTRIES);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(trimmed));
    } catch {
        // quota exceeded or unavailable — ignore
    }
}

function ck(text: string, pair: LangPair) {
    return `${pair}:${text}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCached(text: string, from: string, to: string): string | undefined {
    loadSessionCache();
    return memCache.get(ck(text, `${from}-${to}` as LangPair));
}

export function setCached(text: string, from: string, to: string, translation: string) {
    memCache.set(ck(text, `${from}-${to}` as LangPair), translation);
}

export function clearTranslationCache() {
    memCache.clear();
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/**
 * Translate an array of strings via the backend /translate endpoint.
 * Already-cached items are resolved locally without a network call.
 * Returns the translated array in the same order as the input.
 */
export async function translateBatch(
    texts: string[],
    from: string,
    to: string,
): Promise<string[]> {
    loadSessionCache();
    if (from === to) return [...texts];

    const results: string[] = new Array(texts.length);
    const pending: string[] = [];
    const pendingIdx: number[] = [];

    for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        if (!t || !t.trim()) {
            results[i] = t ?? '';
            continue;
        }
        const cached = memCache.get(ck(t, `${from}-${to}` as LangPair));
        if (cached !== undefined) {
            results[i] = cached;
        } else {
            pending.push(t);
            pendingIdx.push(i);
        }
    }

    if (pending.length === 0) return results;

    try {
        const res = await fetch(getApiUrl('/translate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: pending, from, to }),
        });
        const data: { success: boolean; translations?: string[]; message?: string } = await res.json().catch(() => ({ success: false }));

        if (data.success && Array.isArray(data.translations)) {
            for (let j = 0; j < data.translations.length; j++) {
                const tr = data.translations[j] || pending[j];
                setCached(pending[j], from, to, tr);
                results[pendingIdx[j]] = tr;
            }
            saveSessionCache();
        } else {
            // Fallback — return originals on API error
            for (let j = 0; j < pending.length; j++) {
                results[pendingIdx[j]] = pending[j];
            }
        }
    } catch {
        // Network failure — return originals
        for (let j = 0; j < pending.length; j++) {
            results[pendingIdx[j]] = pending[j];
        }
    }

    return results;
}

/**
 * Translate an object's specific string fields in place (returns a new object).
 */
export async function translateObjectFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[],
    from: string,
    to: string,
): Promise<T> {
    if (from === to) return obj;
    const texts = fields.map((f) => (typeof obj[f] === 'string' ? (obj[f] as string) : ''));
    const translated = await translateBatch(texts, from, to);
    const result = { ...obj };
    for (let i = 0; i < fields.length; i++) {
        if (texts[i]) (result as Record<string, unknown>)[fields[i] as string] = translated[i];
    }
    return result;
}
