/** Centralized API base URL for all backend requests */
export const getApiBaseUrl = (): string =>
    (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080';

export const getApiUrl = (path: string): string => {
    const origin = getApiBaseUrl().replace(/\/$/, '');
    const base = origin.endsWith('/api') ? origin : `${origin}/api`;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
};
