import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/context/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string | string[];
    /** When true, user must be logged in with `isVip === true`. Others redirect to /vip-plans. */
    requireVip?: boolean;
}

/**
 * Guards a route behind authentication (and optionally a role check).
 *
 * Uses useEffect + useNavigate instead of rendering <Navigate> synchronously,
 * which avoids the ErrorResponseImpl that data-router (createBrowserRouter)
 * surfaces when a navigation is triggered mid-render.
 */
export function ProtectedRoute({ children, requiredRole, requireVip }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const userRole = (user as { role?: string } | null)?.role;

    const needsLogin = !isLoading && !user;
    const needsRoleRedirect = !isLoading && !!user && !!requiredRole && (() => {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        return !userRole || !roles.includes(userRole);
    })();
    const needsVipRedirect =
        !isLoading && !!user && requireVip === true && user.isVip !== true;

    useEffect(() => {
        if (needsLogin) {
            navigate('/login', { state: { from: location }, replace: true });
        } else if (needsRoleRedirect) {
            navigate('/home', { replace: true });
        } else if (needsVipRedirect) {
            navigate('/vip-plans', { state: { from: location }, replace: true });
        }
    }, [needsLogin, needsRoleRedirect, needsVipRedirect, navigate, location]);

    // While auth is loading, or while the redirect effect hasn't fired yet,
    // show a neutral loading screen so there's no content flash.
    if (isLoading || needsLogin || needsRoleRedirect || needsVipRedirect) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground font-medium">Đang tải...</p>
            </div>
        );
    }

    return <>{children}</>;
}
