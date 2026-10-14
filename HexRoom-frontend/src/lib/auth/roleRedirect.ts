/**
 * Role-based redirect configuration.
 * Open/Closed: add new roles by extending the map, no switch edits.
 */

const ROLE_REDIRECTS: Record<string, string> = {
    ADMIN: '/workspace',
    MODERATOR: '/workspace',
    LANDLORD: '/workspace',
    TENANT: '/home',
    GUEST: '/home',
};

const DEFAULT_REDIRECT = '/home';

export function getRedirectByRole(role?: string): string {
    if (!role) return DEFAULT_REDIRECT;
    return ROLE_REDIRECTS[role.toUpperCase()] ?? DEFAULT_REDIRECT;
}
