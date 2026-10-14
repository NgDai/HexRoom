import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authFetch, clearStoredAuth, getStoredToken, loginWithEmail, logoutCurrentSessionRequest, setStoredAuth } from '@/lib/api';
import { AuthContext, type AuthUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(getStoredToken);
    const [isLoading, setIsLoading] = useState(!!getStoredToken());
    const [authVerified, setAuthVerified] = useState(!getStoredToken());
    const refreshUser = useCallback(async () => {
        const response = await authFetch('/auth/me');
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Không thể tải hồ sơ');
        setUser(body.data); setAccessToken(getStoredToken()); setAuthVerified(true);
    }, []);
    useEffect(() => {
        if (!getStoredToken()) return;
        let active = true;
        authFetch('/auth/me').then(async response => {
            const body = await response.json();
            if (!active) return;
            if (response.status === 401) { clearStoredAuth(); setAccessToken(null); }
            else if (response.ok) { setUser(body.data); setAccessToken(getStoredToken()); }
        }).catch(() => { /* Preserve the session during a temporary network outage. */ })
            .finally(() => { if (active) { setIsLoading(false); setAuthVerified(true); } });
        return () => { active = false; };
    }, []);
    const signInWithEmail = useCallback(async (email: string, password: string) => {
        const result = await loginWithEmail(email, password);
        setStoredAuth(result.accessToken, result.user);
        setUser({ ...result.user, avatarUrl: result.user.avatarUrl ?? undefined }); setAccessToken(result.accessToken); setAuthVerified(true);
    }, []);
    const signOut = useCallback(async () => {
        await logoutCurrentSessionRequest();
        clearStoredAuth(); setUser(null); setAccessToken(null); setAuthVerified(true);
    }, []);
    const signInWithGoogle = useCallback(async () => {
        throw new Error('Đăng nhập Google chưa được hỗ trợ. Vui lòng dùng email và mật khẩu.');
    }, []);
    return <AuthContext.Provider value={{ user, accessToken, session: null, isLoading, authVerified, refreshUser,
        signInWithEmail, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>;
}
