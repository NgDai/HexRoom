import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getRedirectByRole } from '@/lib/auth/roleRedirect';

/**
 * OAuth callback route: Google redirect here with #access_token=...
 * We must stay on this URL so the hash is preserved; Supabase parses it on getSession().
 * Then we redirect to /home (or /complete-signup if backend returns NEED_REGISTER).
 */
export function OAuthCallbackPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function handleCallback() {
            // Let Supabase consume the hash and store the session
            if (!supabase) { navigate('/login', { replace: true }); return; }
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (cancelled) return;

            if (sessionError) {
                setError('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
                return;
            }

            if (!session?.access_token) {
                // No hash or already consumed and no session – might be a direct visit
                setError('Không nhận được thông tin đăng nhập. Vui lòng thử đăng nhập lại.');
                return;
            }

            // Session is set; AuthContext will sync. Redirect by role.
            // If user is new, /auth/me will return NEED_REGISTER and AuthContext will redirect to /complete-signup
            navigate(getRedirectByRole(session.user?.user_metadata?.role as string | undefined), { replace: true });
        }

        handleCallback();
        return () => { cancelled = true; };
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
                <p className="text-destructive font-medium mb-4">{error}</p>
                <a href="/login" className="text-primary font-semibold hover:underline">
                    Quay lại đăng nhập
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" strokeWidth={2} />
            <p className="text-muted-foreground">Đang đăng nhập...</p>
        </div>
    );
}
