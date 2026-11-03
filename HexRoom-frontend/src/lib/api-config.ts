/** Centralized API base URL for all backend requests */
export const getApiBaseUrl = (): string => {
    const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (envUrl) {
        return envUrl;
    }
    // In production container where Nginx proxies /api and /socket.io, default to current origin
    if (import.meta.env.PROD && typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:8080';
};

export const getApiUrl = (path: string): string => {
    const origin = getApiBaseUrl().replace(/\/$/, '');
    const base = origin.endsWith('/api') ? origin : `${origin}/api`;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
};
