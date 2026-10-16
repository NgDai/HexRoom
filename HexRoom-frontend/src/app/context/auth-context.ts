import { createContext } from 'react';

export interface AuthUser {
    id: string;
    email: string | undefined;
    fullName: string | undefined;
    avatarUrl: string | undefined;
    phone?: string | null;
    role?: string;
    gender?: string | null;
    status?: string;
    createdAt?: string;
    isVip?: boolean;
    vipExpiresAt?: string | null;
    isIdentityVerified?: boolean;
    identityCardNumber?: string | null;
    identityCardIssuedDate?: string | null;
    identityCardIssuedPlace?: string | null;
    identityCardFrontUrl?: string | null;
    identityCardBackUrl?: string | null;
    phoneVerified?: boolean;
    emailVerified?: boolean;
    permanentAddress?: string | null;
    dateOfBirth?: string | null;
    identityVerifiedAt?: string | null;
}

export interface AuthContextValue {
    user: AuthUser | null;
    session: unknown;
    accessToken: string | null;
    /** True when we know auth state: no token (guest) or /auth/me has already responded. Prevents firing /favorites and /recommend with an unverified token. */
    authVerified: boolean;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
