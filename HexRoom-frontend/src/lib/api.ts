import { adaptRoom } from '@/lib/room-adapter';
import type { ApiRoom } from '@/lib/hexroom-api';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api-config';

export { getApiBaseUrl } from '@/lib/api-config';

const HEXROOM_TOKEN_KEY = 'hexroom_token';

/**
 * Get current auth token for backend (Supabase OAuth or email/password JWT).
 * Prefer localStorage (backend JWT) first so email/password users are not blocked by Supabase.
 */
export async function getAccessToken(): Promise<string | null> {
    const stored = localStorage.getItem(HEXROOM_TOKEN_KEY);
    if (stored) return stored;
    if (!supabase) return null;
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) return session.access_token;
    } catch {
        // Supabase unreachable (e.g. timeout) – we already checked localStorage above
    }
    return null;
}

export function getStoredToken(): string | null {
    return localStorage.getItem(HEXROOM_TOKEN_KEY);
}

export function setStoredAuth(token: string, user: Record<string, unknown>): void {
    localStorage.setItem(HEXROOM_TOKEN_KEY, token);
    localStorage.setItem('hexroom_user', JSON.stringify(user));
}

export function clearStoredAuth(): void {
    localStorage.removeItem(HEXROOM_TOKEN_KEY);
    localStorage.removeItem('hexroom_user');
    localStorage.removeItem('hexroom_session_expires_at');
    localStorage.removeItem('hexroom_refresh_token');
}

/**
 * POST /auth/login – email/password login. Returns token and user.
 */
export async function loginWithEmail(
    email: string,
    password: string
): Promise<{ accessToken: string; user: { id: string; fullName: string; email: string; phone: string | null; role: string; status: string; avatarUrl: string | null; createdAt: string; gender?: string | null; isVip?: boolean } }> {
    const url = getApiUrl('/auth/login');
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Đăng nhập thất bại');
    const payload = data.data ?? data;
    const accessToken = payload?.accessToken || payload?.token;
    if (!data.success || !accessToken || !payload.user) throw new Error('Phản hồi không hợp lệ');
    return { accessToken, user: payload.user };
}

let refreshingSession: Promise<{ accessToken: string; user?: Record<string, unknown> }> | null = null;
export function refreshAccessTokenRequest(): Promise<{ accessToken: string; user?: Record<string, unknown> }> {
    if (!refreshingSession) refreshingSession = requestNewSession().finally(() => { refreshingSession = null; });
    return refreshingSession;
}
async function requestNewSession(): Promise<{ accessToken: string; user?: Record<string, unknown> }> {
    const res = await fetch(getApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.message || 'Không thể làm mới phiên đăng nhập');
    }
    const payload = data.data ?? data;
    const accessToken = payload?.accessToken || payload?.token;
    if (!accessToken) {
        throw new Error('Phản hồi làm mới phiên không hợp lệ');
    }
    return { accessToken, user: payload?.user };
}

export async function logoutCurrentSessionRequest(): Promise<void> {
    const response = await fetch(getApiUrl('/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Không thể đăng xuất. Vui lòng thử lại.');
}

export async function logoutAllSessionsRequest(): Promise<void> {
    await authFetch('/auth/logout-all', {
        method: 'POST',
    });
}

/**
 * GET /auth/suggest-password – get a suggested strong password.
 */
export async function suggestPasswordRequest(): Promise<{ suggestedPassword: string }> {
    const res = await fetch(getApiUrl('/auth/suggest-password'));
    const data = await res.json();
    if (!res.ok || !(data.data?.password ?? data.suggestedPassword)) throw new Error('Không thể tạo mật khẩu gợi ý');
    return { suggestedPassword: data.data?.password ?? data.suggestedPassword };
}

/**
 * POST /auth/forgot-password – request password reset email.
 */
export async function forgotPasswordRequest(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(getApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Yêu cầu thất bại');
    return { success: data.success, message: data.message };
}

/**
 * POST /auth/reset-password – set new password with token.
 */
export async function resetPasswordRequest(
    token: string,
    newPassword: string,
    confirmPassword: string
): Promise<{ success: boolean; message: string }> {
    const res = await fetch(getApiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Đặt lại mật khẩu thất bại');
    return { success: data.success, message: data.message };
}

/**
 * POST /auth/register – email/password registration. Returns the new user.
 */
export async function registerRequest(payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    role: 'TENANT' | 'LANDLORD';
}): Promise<{ success: boolean; user: Record<string, unknown>; message: string }> {
    const res = await fetch(getApiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.message || 'Đăng ký thất bại') as Error & { errors?: unknown[] };
        if (Array.isArray(data?.errors)) err.errors = data.errors;
        throw err;
    }
    return { ...data, user: data.data ?? data.user };
}

/**
 * POST /auth/register-oauth – complete signup after Google OAuth
 */
export async function registerOAuthRequest(payload: {
    email: string;
    fullName: string;
    phone?: string;
    role: 'TENANT' | 'LANDLORD';
}): Promise<{ success: boolean; user: Record<string, unknown> }> {
    const res = await fetch(getApiUrl('/auth/register-oauth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Đăng ký thất bại');
    return data;
}

/**
 * PATCH /auth/change-password – change current user's password.
 */
export async function changePasswordRequest(body: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}): Promise<{ success: boolean; message: string }> {
    const res = await authFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ ...body, confirmPassword: body.confirmNewPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data?.message || 'Đổi mật khẩu thất bại') as Error & { errors?: string[] };
        if (Array.isArray(data?.errors)) err.errors = data.errors;
        throw err;
    }
    return data;
}

/**
 * PATCH /auth/profile
 */
export async function updateProfileRequest(updates: { fullName?: string; phone?: string; avatarUrl?: string; gender?: string | null }) {
    const res = await authFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Cập nhật thất bại');
    return data;
}

/** Lifestyle profile – matches backend/DB (LifestyleProfile) */
export interface LifestyleProfileResponse {
    id?: string;
    smoking?: boolean;
    drinking?: boolean;
    pets_allowed?: boolean;
    sleep_schedule?: string | null;
    personalityType?: string | null;
    cleanliness?: string | null;
    noise_tolerance?: string | null;
    guest_frequency?: string | null;
    cooking_frequency?: string | null;
    work_from_home?: boolean;
    wake_time?: string | null;
    bedtime?: string | null;
    social_level?: string | null;
    occupation_type?: string | null;
    interests?: string[];
    languages?: string[];
    preferred_lease_months?: number | null;
    move_in_date?: string | null;
    temperature_preference?: string | null;
    quiet_hours_preference?: string | null;
    deal_breakers?: string | null;
}

/** User preference – matches backend/DB (UserPreference). Roommate matching uses profile gender (same gender). */
export interface UserPreferenceResponse {
    id?: string;
    budget_min?: number | null;
    budget_max?: number | null;
    preferredLocation?: string | null;
    preferred_districts?: string[];
    room_type?: string | null;
    preferred_amenities?: string[];
    must_have_amenities?: string[];
    preferred_lease_months?: number | null;
    move_in_date_min?: string | null;
    move_in_date_max?: string | null;
    max_distance_km?: number | null;
    transport_nearby?: boolean | null;
    pet_friendly?: boolean | null;
    preferred_gender?: string | null;
    preferred_roommate_age_min?: number | null;
    preferred_roommate_age_max?: number | null;
    lifestyle_match_weight?: number | null;
    safety_priority?: number | null;
}

export async function getLifestyleRequest(): Promise<{
    success: boolean;
    profile: LifestyleProfileResponse | null;
}> {
    const res = await authFetch('/auth/lifestyle');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Tải thất bại');
    return data;
}

export async function upsertLifestyleRequest(body: {
    smoking?: boolean;
    drinking?: boolean;
    pets_allowed?: boolean;
    sleep_schedule?: string | null;
    personalityType?: string | null;
    cleanliness?: string | null;
    noise_tolerance?: string | null;
    guest_frequency?: string | null;
    cooking_frequency?: string | null;
    work_from_home?: boolean;
    wake_time?: string | null;
    bedtime?: string | null;
    social_level?: string | null;
    occupation_type?: string | null;
    interests?: string[];
    languages?: string[];
    preferred_lease_months?: number | null;
    move_in_date?: string | null;
    temperature_preference?: string | null;
    quiet_hours_preference?: string | null;
    deal_breakers?: string | null;
}) {
    const res = await authFetch('/auth/lifestyle', { method: 'PUT', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lưu thất bại');
    return data;
}

export async function getPreferenceRequest(): Promise<{
    success: boolean;
    preference: UserPreferenceResponse | null;
}> {
    const res = await authFetch('/auth/preference');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Tải thất bại');
    return data;
}

export async function upsertPreferenceRequest(body: {
    budget_min?: number | null;
    budget_max?: number | null;
    preferredLocation?: string | null;
    preferred_districts?: string[];
    room_type?: string | null;
    preferred_amenities?: string[];
    must_have_amenities?: string[];
    preferred_lease_months?: number | null;
    move_in_date_min?: string | null;
    move_in_date_max?: string | null;
    max_distance_km?: number | null;
    transport_nearby?: boolean | null;
    pet_friendly?: boolean | null;
    preferred_gender?: string | null;
    preferred_roommate_age_min?: number | null;
    preferred_roommate_age_max?: number | null;
    lifestyle_match_weight?: number | null;
    safety_priority?: number | null;
}) {
    const res = await authFetch('/auth/preference', { method: 'PUT', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lưu thất bại');
    return data;
}

/** Options for authFetch; pass `token` to use a specific token (e.g. from auth state). */
export type AuthFetchOptions = RequestInit & { token?: string | null };

/**
 * Fetch from the backend with Authorization: Bearer <access_token>.
 * Use for any protected API route.
 * If no token is available (and none passed), returns a 401 Response without hitting the server.
 */
export async function authFetch(
    path: string,
    options: AuthFetchOptions = {}
): Promise<Response> {
    const { token: explicitToken, ...rest } = options;

    const fetchWithToken = async (token: string | null): Promise<Response> => {
        const url = getApiUrl(path);
        const headers: HeadersInit = {};

        if (!(rest.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (rest.headers) {
            Object.assign(headers, rest.headers);
        }

        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
        return fetch(url, {
            ...rest,
            headers,
            credentials: 'include',
        });
    };

    const token =
        explicitToken !== undefined && explicitToken !== null
            ? explicitToken
            : await getAccessToken();

    if (!token) {
        return new Response(
            JSON.stringify({ success: false, message: 'Chưa đăng nhập' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let response = await fetchWithToken(token);

    const shouldTryRefresh =
        response.status === 401 &&
        !!localStorage.getItem(HEXROOM_TOKEN_KEY) &&
        path !== '/auth/login' &&
        path !== '/auth/refresh' &&
        path !== '/auth/logout';

    if (!shouldTryRefresh) {
        return response;
    }

    try {
        const { accessToken } = await refreshAccessTokenRequest();
        localStorage.setItem(HEXROOM_TOKEN_KEY, accessToken);
        response = await fetchWithToken(accessToken);
    } catch {
        return response;
    }

    return response;
}

/**
 * GET /favorites – list current user's favorite rooms (auth required).
 * Pass token when available from auth context to avoid 401 from stale getAccessToken().
 */
export async function getMyFavoritesRequest(options?: { token?: string | null }): Promise<{
    success: boolean;
    data: Array<{
        id: string;
        title: string;
        roomName: string | null;
        price: number;
        area: number | null;
        address: string;
        images: string[];
        location: { district: string | null; city: string | null } | null;
        status: string;
        available: boolean;
    }>;
}> {
    const res = await authFetch('/favorites', { token: options?.token });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách yêu thích');
    return { ...data, data: (data.data ?? []).map((room: ApiRoom) => ({ ...room, area: room.sizeM2, available: room.status === "AVAILABLE" })) };
}

/**
 * GET /favorites/ids – list favorite room IDs only (auth required).
 */
export async function getFavoriteIdsRequest(): Promise<{ success: boolean; data: string[] }> {
    const res = await authFetch('/favorites/ids');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách yêu thích');
    return data;
}

/**
 * POST /favorites/:roomId – add room to favorites (auth required).
 */
export async function addFavoriteRequest(roomId: string, options?: { token?: string | null }): Promise<{ success: boolean; data: { roomId: string } }> {
    const res = await authFetch(`/favorites/${encodeURIComponent(roomId)}`, { method: 'POST', token: options?.token });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không thể thêm yêu thích');
    return data;
}

/**
 * DELETE /favorites/:roomId – remove room from favorites (auth required).
 */
export async function removeFavoriteRequest(roomId: string, options?: { token?: string | null }): Promise<{ success: boolean; data: { roomId: string } }> {
    const res = await authFetch(`/favorites/${encodeURIComponent(roomId)}`, { method: 'DELETE', token: options?.token });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không thể bỏ yêu thích');
    return data;
}

/** Wallet balance and PayOS top-up / withdraw (authenticated users). */
export interface WalletSummary {
    id: string;
    userId: string;
    balance: number;
    currency: string;
    createdAt: string;
}

export interface WalletTransactionItem {
    id: string;
    walletId: string;
    type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PREORDER' | 'REFUND' | 'PAYMENT';
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    amount: number;
    description: string;
    createdAt: string;
}

export async function getMyWalletRequest(): Promise<{ success: boolean; data: WalletSummary }> {
    const res = await authFetch('/wallet');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải ví');
    return data;
}

export async function getMyWalletTransactionsRequest(params?: {
    page?: number;
    limit?: number;
    type?: WalletTransactionItem['type'];
}): Promise<{
    success: boolean;
    data: WalletTransactionItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.type) search.set('type', params.type);
    const qs = search.toString();
    const res = await authFetch(`/wallet/transactions${qs ? `?${qs}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải lịch sử ví');
    return data;
}

export async function depositWalletRequest(body: {
    amount: number;
    description?: string;
}): Promise<{
    success: boolean;
    message: string;
    data: {
        wallet: WalletSummary;
        transaction: WalletTransactionItem;
        payment?: {
            provider: 'PAYOS';
            orderCode: string;
            checkoutUrl: string | null;
            qrCode: string | null;
            paymentLinkId: string | null;
            status: string;
        };
    };
}> {
    const res = await authFetch('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Nạp tiền thất bại');
    return data;
}

export async function withdrawWalletRequest(body: {
    amount: number;
    description?: string;
}): Promise<{
    success: boolean;
    message: string;
    data: { wallet: WalletSummary; transaction: WalletTransactionItem };
}> {
    const res = await authFetch('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Rút tiền thất bại');
    return data;
}

export async function verifyWalletDepositRequest(orderCode: string): Promise<{
    success: boolean;
    message: string;
    data: { confirmed?: boolean; alreadyConfirmed?: boolean; wallet: WalletSummary | null; payosStatus?: string };
}> {
    const res = await authFetch(`/wallet/verify-deposit?orderCode=${encodeURIComponent(orderCode)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Xác minh thất bại');
    return data;
}

/** Preorder / đặt cọc phòng (PayOS) */
export interface MyPreorderItem {
    id: string;
    userId: string;
    roomId: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
    paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
    depositAmount: number;
    refundStatus: 'NOT_APPLICABLE' | 'ELIGIBLE' | 'REFUNDED' | 'NOT_REFUNDABLE';
    createdAt: string;
    cancelReason: string | null;
    room: {
        id: string;
        room_name: string | null;
        price: number;
    } | null;
    rental: {
        id: string;
        title: string;
    } | null;
}

export interface CreatePreorderDepositPaymentRequest {
    roomId: string;
    depositMonths?: number;
    depositPercent?: number;
    depositAmount?: number;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
}

export interface CreatePreorderDepositPaymentResponse {
    success: boolean;
    message: string;
    data: {
        preorderId: string;
        roomId: string;
        depositAmount: number;
        depositPercent?: number;
        depositMonths?: number;
        payment: {
            provider: 'PAYOS';
            orderCode: string;
            checkoutUrl: string | null;
            qrCode: string | null;
            paymentLinkId: string | null;
            status: string;
        };
    };
}

export interface VerifyPreorderPaymentResponse {
    success: boolean;
    message: string;
    data: {
        status: 'success' | 'cancel' | 'pending';
        confirmed: boolean;
        preorderId: string;
        orderCode: string;
        paymentOrderStatus: string;
        preorderStatus: string | null;
        preorderPaymentStatus: string | null;
        depositAmount: number;
    };
}

export interface VerifyPreorderPaymentLegacyResponse {
    success: boolean;
    message: string;
    data: {
        preorder: MyPreorderItem | null;
        payment: {
            orderCode: string;
            status: string;
            payosStatus: string | null;
        };
    };
}

export async function createPreorderDepositPaymentRequest(
    body: CreatePreorderDepositPaymentRequest
): Promise<CreatePreorderDepositPaymentResponse> {
    const res = await authFetch('/preorders/deposit/pay', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không thể tạo thanh toán đặt cọc');
    return data;
}

export async function verifyPreorderPaymentRequest(params: {
    orderCode?: string;
    preorderId?: string;
}): Promise<VerifyPreorderPaymentResponse>;
export async function verifyPreorderPaymentRequest(
    preorderId: string,
    orderCode: string
): Promise<VerifyPreorderPaymentLegacyResponse>;
export async function verifyPreorderPaymentRequest(
    preorderIdOrParams: string | { orderCode?: string; preorderId?: string },
    maybeOrderCode?: string
): Promise<VerifyPreorderPaymentResponse | VerifyPreorderPaymentLegacyResponse> {
    const search = new URLSearchParams();
    const isObjectParams = typeof preorderIdOrParams === 'object' && preorderIdOrParams !== null;

    if (isObjectParams) {
        if (preorderIdOrParams.orderCode) search.set('orderCode', preorderIdOrParams.orderCode);
        if (preorderIdOrParams.preorderId) search.set('preorderId', preorderIdOrParams.preorderId);
    } else {
        const preorderId = preorderIdOrParams;
        if (preorderId) search.set('preorderId', preorderId);
        if (maybeOrderCode) search.set('orderCode', maybeOrderCode);
    }

    const qs = search.toString();
    const res = await authFetch(`/preorders/verify-payment${qs ? `?${qs}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không thể xác minh thanh toán đặt cọc');
    return data;
}

export async function resumePreorderPaymentRequest(preorderId: string): Promise<{
    success: boolean;
    data: {
        preorderId: string;
        roomId: string;
        depositAmount: number;
        room: { id: string; room_name: string | null; price: number } | null;
        payment: {
            provider: 'PAYOS';
            orderCode: string;
            checkoutUrl: string | null;
            status: string;
        };
    };
}> {
    const res = await authFetch(`/preorders/${encodeURIComponent(preorderId)}/resume-payment`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không thể lấy lại link thanh toán');
    return data;
}

export async function cancelUnpaidPreorderRequest(preorderId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    data: MyPreorderItem;
}> {
    const res = await authFetch(`/preorders/${encodeURIComponent(preorderId)}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không thể hủy thanh toán đặt cọc');
    return data;
}

export async function getMyPreordersRequest(params?: {
    page?: number;
    limit?: number;
    status?: MyPreorderItem['status'] | 'ALL';
    paymentStatus?: MyPreorderItem['paymentStatus'] | 'ALL';
}): Promise<{
    success: boolean;
    data: MyPreorderItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.status) search.set('status', params.status);
    if (params?.paymentStatus) search.set('paymentStatus', params.paymentStatus);

    const qs = search.toString();
    const res = await authFetch(`/preorders/mine${qs ? `?${qs}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách đặt cọc');
    return data;
}

/** Lịch sử thuê phòng (my-bookings) */
export interface MyBookingItem {
    id: string;
    rentalPeriodId: string;
    roomId: string;
    /** Chủ nhà — mở chat trực tiếp */
    landlordId?: string;
    roomName: string;
    propertyName: string;
    propertyImage: string;
    address: string;
    landlordName: string | null;
    startDate: string;
    endDate: string | null;
    status: 'active' | 'completed' | 'cancelled';
    hasReview: boolean;
    userRating?: number;
    feedbackId?: string;
    feedbackStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
    moderatorNote?: string;
    canReview: boolean;
    canReviewDisabled: boolean;
    roommates?: { id: string; fullName: string; email: string | null; phone: string | null; avatarUrl: string | null }[];
}

export async function getMyBookingsRequest(): Promise<{
    success: boolean;
    data: MyBookingItem[];
}> {
    const res = await authFetch('/rooms/my-bookings');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải lịch sử thuê phòng');
    return data;
}

/** Tenant: lấy userId chủ nhà để mở chat từ kỳ thuê (deep link ?booking=) */
export async function getLandlordPeerForRentalPeriodRequest(rentalPeriodId: string): Promise<{
    success: boolean;
    data: { landlordId: string };
}> {
    const res = await authFetch(
        `/rooms/rental-periods/${encodeURIComponent(rentalPeriodId)}/landlord-peer`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Không mở được chat với chủ nhà');
    return data;
}

/** Gửi đánh giá phòng */
export async function createFeedbackRequest(body: {
    rentalPeriodId: string;
    roomId: string;
    rating: number;
    comment: string;
    cleanlinessRating?: number;
    locationRating?: number;
    valueRating?: number;
    landlordRating?: number;
}): Promise<{
    success: boolean;
    message: string;
    data: { id: string; status: string; rating: number };
}> {
    const res = await authFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi đánh giá thất bại');
    return data;
}

/** Lấy feedback theo rental period */
export async function getFeedbackByRentalPeriodRequest(rentalPeriodId: string): Promise<{
    success: boolean;
    data: {
        id: string;
        rating: number;
        comment: string | null;
        cleanlinessRating: number | null;
        locationRating: number | null;
        valueRating: number | null;
        landlordRating: number | null;
        status: string;
        moderatorNote: string | null;
        createdAt: string;
    } | null;
}> {
    const res = await authFetch(`/feedback/by-rental-period/${encodeURIComponent(rentalPeriodId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải đánh giá');
    return data;
}

/** Roommate matching – same gender + lifestyle score */

export interface RoommateSuggestionItem {
    user: { id: string; fullName: string; avatarUrl: string | null; gender: string | null };
    lifestyle: {
        smoking: boolean | null;
        drinking: boolean | null;
        pets_allowed: boolean | null;
        sleep_schedule: string | null;
        work_from_home: boolean | null;
        personalityType: string | null;
        social_level: string | null;
        cleanliness: string | null;
        noise_tolerance: string | null;
        guest_frequency: string | null;
        interests: string[];
        deal_breakers: string | null;
        languages: string[];
    } | null;
    preference: { preferred_districts: string[]; room_type: string | null; budget_min: number | null; budget_max: number | null; preferredLocation: string | null } | null;
    matchScore: number;
    cfScore: number;
    experienceScore: number;
    wouldLiveAgainRate: number | null;
    isSameGender: boolean;
    matchStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | null;
}

export type LifestyleWeights = {
    smoking?: number;
    sleep_schedule?: number;
    pets_allowed?: number;
    noise_tolerance?: number;
    guest_frequency?: number;
    social_level?: number;
    cooking_frequency?: number;
    work_from_home?: number;
    personalityType?: number;
    interests?: number;
    cleanliness?: number;
};

export async function getRoommateSuggestionsRequest(limit?: number, weights?: LifestyleWeights): Promise<{
    success: boolean;
    data: RoommateSuggestionItem[];
    message?: string;
}> {
    const params = new URLSearchParams();
    if (limit != null) params.set('limit', String(limit));
    // Send weights as a JSON string — avoids bracket-encoding issues with Express query parser
    if (weights && Object.keys(weights).length > 0) {
        params.set('weights', JSON.stringify(weights));
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await authFetch(`/roommate/suggestions${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải gợi ý roommate');
    return data;
}

export interface RoommateMatchItem {
    id: string;
    status: string;
    createdAt: string;
    isRequester: boolean;
    roomId: string | null;
    otherUser: { id: string; fullName: string; avatarUrl: string | null; gender: string | null } | null;
}

export async function getRoommateMatchesRequest(): Promise<{ success: boolean; data: RoommateMatchItem[] }> {
    const res = await authFetch('/roommate/matches');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách match');
    return data;
}

export async function sendRoommateRequestRequest(targetId: string): Promise<{
    success: boolean;
    message: string;
    data: { id: string; requesterId: string; targetId: string; status: string; createdAt: string };
}> {
    const res = await authFetch(`/roommate/request/${encodeURIComponent(targetId)}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi lời mời thất bại');
    return data;
}

export async function updateRoommateMatchStatusRequest(
    matchId: string,
    status: 'ACCEPTED' | 'REJECTED'
): Promise<{ success: boolean; message: string; data: { id: string; status: string } }> {
    const res = await authFetch(`/roommate/matches/${encodeURIComponent(matchId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Cập nhật thất bại');
    return data;
}

export interface RoommatePublicProfile {
    user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        gender: string | null;
        memberSince: string | null;
    };
    lifestyle: {
        smoking: boolean | null;
        drinking: boolean | null;
        pets_allowed: boolean | null;
        sleep_schedule: string | null;
        work_from_home: boolean | null;
        personalityType: string | null;
        social_level: string | null;
        cleanliness: string | null;
        noise_tolerance: string | null;
        guest_frequency: string | null;
        cooking_frequency: string | null;
        wake_time: string | null;
        bedtime: string | null;
        occupation_type: string | null;
        temperature_preference: string | null;
        quiet_hours_preference: string | null;
        interests: string[];
        deal_breakers: string | null;
        languages: string[];
        preferred_lease_months: number | null;
    } | null;
    preference: {
        preferred_districts: string[];
        room_type: string | null;
        budget_min: number | null;
        budget_max: number | null;
        preferred_amenities: string[];
        must_have_amenities: string[];
        preferred_lease_months: number | null;
        pet_friendly: boolean | null;
        transport_nearby: boolean | null;
    } | null;
}

export async function getRoommateProfileRequest(userId: string): Promise<{
    success: boolean;
    data: RoommatePublicProfile;
}> {
    const res = await authFetch(`/roommate/profile/${encodeURIComponent(userId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải hồ sơ');
    return data;
}

/** "Có thể bạn quan tâm" — People You May Know (based on room interaction areas) */
export interface PymkReason {
    type: 'same_area_search' | 'random_suggestion';
    area?: string;
    activity?: {
        views: number;
        favorites: number;
        preorders: number;
        totalScore: number;
    };
}

export interface PeopleYouMayKnowItem {
    user: { id: string; fullName: string; avatarUrl: string | null; gender: string | null };
    lifestyle: {
        smoking: boolean | null;
        drinking: boolean | null;
        pets_allowed: boolean | null;
        sleep_schedule: string | null;
        personalityType: string | null;
        cleanliness: string | null;
        noise_tolerance: string | null;
        guest_frequency: string | null;
        interests: string[];
        deal_breakers: string | null;
    } | null;
    reasons: PymkReason[];
    matchStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | null;
    matchScore: number;
    areaName: string | null;
}

export async function getPeopleYouMayKnowRequest(): Promise<{
    success: boolean;
    data: PeopleYouMayKnowItem[];
    isRandom?: boolean;
    topAreas?: string[];
    groupedByArea?: { area: string; users: PeopleYouMayKnowItem[] }[];
}> {
    const res = await authFetch('/roommate/people-you-may-know');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải gợi ý "Có thể bạn quan tâm"');
    return data;
}

/** Danh sách phòng đang thuê (để mời roommate) */
export interface MyActiveRoomItem {
    rentalPeriodId: string;
    roomId: string;
    roomName: string;
    propertyName: string;
    price: number | null;
    address: string;
    image: string | null;
    startDate: string;
    endDate: string | null;
}

export async function getMyActiveRoomsRequest(): Promise<{
    success: boolean;
    data: MyActiveRoomItem[];
}> {
    const res = await authFetch('/roommate/my-active-rooms');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách phòng đang thuê');
    return data;
}

export async function inviteRoommateRequest(
    targetUserId: string,
    roomId: string
): Promise<{ success: boolean; message: string }> {
    const res = await authFetch(`/roommate/invite-room/${encodeURIComponent(targetUserId)}`, {
        method: 'POST',
        body: JSON.stringify({ roomId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi lời mời ở ghép thất bại');
    return data;
}

export async function createRoommateRatingRequest(body: {
    targetId: string;
    rentalPeriodId: string;
    overallRating: number;
    comment?: string;
}): Promise<{ success: boolean; message: string; data: { id: string } }> {
    const res = await authFetch('/roommate/experiences', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi đánh giá thất bại');
    return data;
}

export async function checkRoommateRatingRequest(
    targetId: string,
    rentalPeriodId: string
): Promise<{ success: boolean; data: { id: string; overall_rating: number; comment: string | null } | null }> {
    const params = new URLSearchParams({ targetId, rentalPeriodId });
    const res = await authFetch(`/roommate/experiences/check?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi kiểm tra đánh giá');
    return data;
}

/** AI Roommate Search (VIP only) */
export interface RoommateSearchResultItem {
    user: { id: string; fullName: string; avatarUrl: string | null; gender: string | null };
    lifestyle: {
        smoking: boolean | null;
        drinking: boolean | null;
        pets_allowed: boolean | null;
        sleep_schedule: string | null;
        work_from_home: boolean | null;
        personalityType: string | null;
        social_level: string | null;
        cleanliness: string | null;
        noise_tolerance: string | null;
        guest_frequency: string | null;
        interests: string[];
        deal_breakers: string | null;
    } | null;
    preference: {
        preferred_districts: string[];
        room_type: string | null;
        budget_min: number | null;
        budget_max: number | null;
        preferredLocation: string | null;
    } | null;
    similarityScore: number;
    aiReason: string | null;
}

export async function searchRoommatesRequest(
    query: string,
    limit?: number
): Promise<{ success: boolean; data: RoommateSearchResultItem[] }> {
    const params = new URLSearchParams({ q: query });
    if (limit != null) params.set('limit', String(limit));
    const res = await authFetch(`/roommate/search?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tìm kiếm AI');
    return data;
}

/** Top searchers by area (based on actual behavior) */

export interface AreaSearcherActivity {
    views: number;
    favorites: number;
    preorders: number;
    totalScore: number;
}

export interface AreaSearcherItem {
    user: { id: string; fullName: string; avatarUrl: string | null; gender: string | null };
    lifestyle: {
        smoking: boolean;
        drinking: boolean;
        pets_allowed: boolean;
        sleep_schedule: string | null;
        personalityType: string | null;
        cleanliness: string | null;
        noise_tolerance: string | null;
        guest_frequency: string | null;
        interests: string[];
        deal_breakers: string | null;
    } | null;
    preference: {
        preferred_districts: string[];
        room_type: string | null;
        budget_min: number | null;
        budget_max: number | null;
        preferredLocation: string | null;
    } | null;
    matchScore: number;
    isSameGender: boolean;
    matchStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | null;
    activityInArea: AreaSearcherActivity;
}

export async function getTopSearchersByAreaRequest(
    area: string,
    limit?: number
): Promise<{ success: boolean; data: AreaSearcherItem[]; area: string; totalRoomsInArea: number }> {
    const params = new URLSearchParams({ area });
    if (limit != null) params.set('limit', String(limit));
    const res = await authFetch(`/roommate/top-searchers-by-area?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tìm kiếm theo khu vực');
    return data;
}

/** Chat / messages */


export interface ConversationItem {
    peer: { id: string; fullName: string; avatarUrl: string | null };
    lastMessage: { id: string; content: string; created_at: string; isFromMe: boolean };
    unreadCount: number;
}

export async function getConversationsRequest(): Promise<{ success: boolean; data: ConversationItem[] }> {
    const res = await authFetch('/messages/conversations');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải hội thoại');
    return data;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    message_type: string;
    status: string;
    created_at: string;
    isFromMe: boolean;
    sender: { id: string; fullName: string; avatarUrl: string | null } | null;
}

export async function getThreadRequest(
    userId: string,
    options?: { limit?: number; before?: string }
): Promise<{
    success: boolean;
    data: {
        peer: { id: string; fullName: string; avatarUrl: string | null };
        messages: ChatMessage[];
        hasMore: boolean;
        nextCursor: string | null;
    };
}> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    const qs = params.toString();
    const res = await authFetch(`/messages/with/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải tin nhắn');
    return data;
}

export async function sendMessageRequest(
    receiverId: string,
    content: string
): Promise<{ success: boolean; data: ChatMessage }> {
    const res = await authFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId, content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi tin nhắn thất bại');
    return data;
}

/**
 * POST /upload/image – upload image file to Cloudinary via backend. Returns Cloudinary URL.
 */
export async function uploadImageRequest(file: File): Promise<{ url: string }> {
    const token = await getAccessToken();
    if (!token) throw new Error('Cần đăng nhập để tải ảnh lên');

    const form = new FormData();
    form.append('file', file);

    const res = await fetch(getApiUrl('/upload/image'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Tải ảnh lên thất bại');
    if (!data.url) throw new Error('Không nhận được URL ảnh');
    return { url: data.url };
}

/**
 * POST /upload/rental-image – upload rental image to Supabase Storage via backend.
 */
export async function uploadRentalImage(file: File): Promise<{ url: string }> {
    const token = await getAccessToken();
    if (!token) throw new Error('Cần đăng nhập để tải ảnh lên');

    const form = new FormData();
    form.append('file', file);

    const res = await fetch(getApiUrl('/upload/rental-image'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Tải ảnh lên thất bại');
    if (!data.url) throw new Error('Không nhận được URL ảnh');
    return { url: data.url };
}

/**
 * POST /rentals – create a new rental listing with files and image URLs.
 */
export async function createRentalRequest(body: {
    title: string;
    description?: string;
    city: string;
    district: string;
    address: string;
    imageUrls?: string[];     // URLs từ MultiImageUpload
    documentFiles?: File[];    // Files để upload Supabase
    documentTypes?: string[];  // Tương ứng 1-1 với documentFiles
}): Promise<{ success: boolean; data: Record<string, unknown>; message: string }> {
    const token = await getAccessToken();
    if (!token) throw new Error('Cần đăng nhập để tạo bài đăng');

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('title', body.title);
    formData.append('description', body.description || '');
    formData.append('city', body.city);
    formData.append('district', body.district);
    formData.append('address', body.address);

    // Add image URLs (as JSON, separate từ files)
    if (body.imageUrls && body.imageUrls.length > 0) {
        formData.append('images', JSON.stringify(body.imageUrls));
    }

    // Add document files kèm document_type tương ứng
    if (body.documentFiles && body.documentFiles.length > 0) {
        for (let i = 0; i < body.documentFiles.length; i++) {
            formData.append('file', body.documentFiles[i]);
            formData.append('document_type', body.documentTypes?.[i] ?? 'OTHER');
        }
    }

    const res = await authFetch('/rentals', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Tạo bài đăng thất bại');
    return data;
}

/**
 * GET /rentals/my-rentals – fetch current landlord's rentals.
 */
export async function getMyRentalsRequest(query?: {
    page?: number;
    limit?: number;
    status?: string;
}): Promise<{
    success: boolean;
    data: Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        createdAt: string;
        owner: { id: string; fullName: string; avatarUrl: string | null } | null;
        location: { id: string; address: string; district: string | null; city: string | null } | null;
        images: string[];
        imageCount: number;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.status) params.set('status', query.status);
    const qs = params.toString();

    const res = await authFetch(`/rentals/my-rentals${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lấy danh sách thất bại');
    return data;
}

/**
 * GET /rentals/:rentalId – fetch a single rental's details.
 */
export async function getRentalByIdRequest(rentalId: string): Promise<{
    success: boolean;
    data: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        createdAt: string;
        owner: { id: string; fullName: string; avatarUrl: string | null; email: string; phone: string | null } | null;
        location: { id: string; address: string; district: string | null; city: string | null } | null;
        rooms: Array<Record<string, unknown>>;
        images: string[];
    };
}> {
    const res = await authFetch(`/rentals/${rentalId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lấy chi tiết thất bại');
    return data;
}

/**
 * GET /rentals/:rentalId/landlord-documents – fetch landlord's own specific documents.
 */
export async function getLandlordRentalDocumentsRequest(rentalId: string): Promise<{
    success: boolean;
    data: {
        id: string;
        documents: Array<{
            id: string;
            documentType: string;
            status: string;
            signedUrl: string | null;
            uploadedAt: string;
        }>;
    };
}> {
    const res = await authFetch(`/rentals/${rentalId}/landlord-documents`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lấy giấy tờ thất bại');
    return data;
}


/**
 * GET /rentals/moderation – moderator fetches all rentals for review.
 */
export async function getRentalsForModeration(query?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}): Promise<{
    success: boolean;
    data: Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        createdAt: string;
        owner: { id: string; fullName: string; avatarUrl: string | null } | null;
        location: { id: string; address: string; district: string | null; city: string | null } | null;
        images: string[];
        documents?: Array<{
            id: string;
            documentType: string;
            imageUrl: string;
            status: string;
            note?: string | null;
        }>;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    const qs = params.toString();

    const res = await authFetch(`/rentals/moderation${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lấy danh sách duyệt thất bại');
    return data;
}

/**
 * PATCH /rentals/:rentalId/status – moderator approve/reject rental.
 */
export async function updateRentalStatusRequest(
    rentalId: string,
    status: string
): Promise<{ success: boolean; message: string; data: Record<string, unknown> }> {
    const res = await authFetch(`/rentals/${rentalId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Cập nhật trạng thái thất bại');
    return data;
}

/**
 * GET /rentals/rejection-info – landlord fetches rejection info for a target.
 */
export async function getRejectionInfoRequest(
    targetType: 'RENTAL' | 'ROOM',
    targetId: string
): Promise<{
    success: boolean;
    data: {
        hasRejection: boolean;
        reason?: string | null;
        moderatorName?: string | null;
        rejectedAt?: string;
        previousStatus?: string;
        newStatus?: string;
    };
}> {
    const params = new URLSearchParams({ targetType, targetId });
    const res = await authFetch(`/rentals/rejection-info?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi lấy thông tin từ chối');
    return data;
}

/**
 * PUT /rentals/:rentalId – landlord update their rental.
 */
export async function updateRentalRequest(
    rentalId: string,
    payload: {
        title?: string;
        description?: string;
        address?: string;
        district?: string;
        city?: string;
        images?: string[];
        status?: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';
        resubmit?: boolean;
        documentFiles?: File[];
        documentTypes?: string[];
        deletedDocuments?: string[];
    }
): Promise<{ success: boolean; message: string; data: Record<string, unknown> }> {
    const formData = new FormData();
    if (payload.title !== undefined) formData.append('title', payload.title);
    if (payload.description !== undefined) formData.append('description', payload.description);
    if (payload.address !== undefined) formData.append('address', payload.address);
    if (payload.district !== undefined) formData.append('district', payload.district);
    if (payload.city !== undefined) formData.append('city', payload.city);
    if (payload.status !== undefined) formData.append('status', payload.status);
    if (payload.resubmit !== undefined) formData.append('resubmit', String(payload.resubmit));
    if (payload.deletedDocuments && payload.deletedDocuments.length > 0) {
        formData.append('deleted_documents', JSON.stringify(payload.deletedDocuments));
    }

    if (payload.images && payload.images.length > 0) {
        formData.append('images', JSON.stringify(payload.images));
    }

    if (payload.documentFiles && payload.documentFiles.length > 0) {
        for (let i = 0; i < payload.documentFiles.length; i++) {
            formData.append('file', payload.documentFiles[i]);
            formData.append('document_type', payload.documentTypes?.[i] ?? 'OTHER');
        }
    }

    const res = await authFetch(`/rentals/${rentalId}`, {
        method: 'PUT',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Cập nhật bài đăng thất bại');
    return data;
}

/**
 * DELETE /rentals/:rentalId – landlord delete their rental.
 */
export async function deleteRentalRequest(
    rentalId: string
): Promise<{ success: boolean; message: string; data: { id: string; title: string } }> {
    const res = await authFetch(`/rentals/${rentalId}`, {
        method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Xóa bài đăng thất bại');
    return data;
}

/**
 * GET /public/rentals – list AVAILABLE rentals (no auth). For home & browse.
 */
export interface PublicRental {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    location: { id: string; address: string; district: string | null; city: string | null } | null;
    images: string[];
}

export type PublicRentalsSort = 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'title_desc';

export interface PublicHomeBannerConfig {
    enabled: boolean;
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaText: string;
    ctaLink: string;
}

export interface PublicHomeLayoutConfig {
    sections: Array<{
        key: 'hero' | 'aiFeature' | 'featuredRooms' | 'recommendedRooms' | 'popularAreas' | 'whyHexRoom';
        enabled: boolean;
    }>;
}

export interface PublicSiteConfig {
    homeBanner: PublicHomeBannerConfig;
    homeLayout: PublicHomeLayoutConfig;
    updatedAt: string | null;
}

/**
 * GET /public/room-types – distinct room types from available rentals. No auth.
 */
export async function getPublicRoomTypesRequest(): Promise<{
    success: boolean;
    data: Array<{ value: string; label: string }>;
}> {
    return { success: true, data: [{ value: 'PRIVATE', label: 'Phòng riêng' }, { value: 'SHARED', label: 'Ở ghép' }, { value: 'STUDIO', label: 'Studio' }, { value: 'APARTMENT', label: 'Căn hộ' }] };
}

export async function getPublicSiteConfigRequest(): Promise<{
    success: boolean;
    data: PublicSiteConfig;
}> {
    const res = await fetch(getApiUrl('/public/site-config'), { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'Loi tai cau hinh website');
    return json;
}

/**
 * GET /rooms/amenities – list amenities (public). Used for advanced search.
 */
export async function getRoomsAmenitiesRequest(): Promise<{
    success: boolean;
    data: Array<{ id: string; name: string; icon?: string }>;
}> {
    const res = await fetch(getApiUrl('/amenities'), { cache: 'default' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'Lỗi tải tiện nghi');
    return json;
}

/**
 * Room item returned from GET /rooms
 */
export interface PublicRoomItem {
    id: string;
    rentalId: string;
    roomName: string | null;
    description: string | null;
    roomType: string;
    price: number;
    sizeM2: number | null;
    maxPeople: number;
    status: string;
    createdAt: string;
    images: string[];
    amenities: Array<{ id: string; name: string }>;
    rental: {
        id: string;
        title: string;
        status: string;
        location: { address: string; district: string | null; city: string | null } | null;
    } | null;
    // flattened fields from backend
    title?: string;
    area?: number;
    thumbnail_url?: string | null;
}

/**
 * GET /rooms – list rooms (public, no auth).
 */
export type PublicRoomsSort = 'newest' | 'recommended' | 'price_asc' | 'price_desc';

export async function getPublicRoomsRequest(params?: {
    page?: number;
    limit?: number;
    roomType?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: PublicRoomsSort;
    keyword?: string;
    city?: string;
}): Promise<{
    success: boolean;
    data: PublicRoomItem[];
    pagination: { page: number; limit: number; total: number; pages: number };
}> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.roomType) search.set('roomType', params.roomType);
    if (params?.minPrice) search.set('minPrice', String(params.minPrice));
    if (params?.maxPrice) search.set('maxPrice', String(params.maxPrice));
    if (params?.sort && params.sort !== 'newest') search.set('sort', params.sort);
    if (params?.keyword) search.set('keyword', params.keyword);
    if (params?.city) search.set('city', params.city);
    const qs = search.toString();
    const url = getApiUrl(`/rooms${qs ? `?${qs}` : ''}`);
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        console.error('[getPublicRooms]', url, res.status, msg);
        throw new Error(msg);
    }
    const page = json.data;
    return { success: json.success, data: (page.items as ApiRoom[]).map(adaptRoom), pagination: { page: page.page, limit: page.limit, total: page.total, pages: page.totalPages } };
}

export async function getPublicRentalsRequest(params?: {
    page?: number;
    limit?: number;
    district?: string;
    city?: string;
    sort?: PublicRentalsSort;
}): Promise<{
    success: boolean;
    data: PublicRental[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.district) search.set('district', params.district);
    if (params?.city) search.set('city', params.city);
    if (params?.sort) search.set('sort', params.sort);
    const qs = search.toString();
    const url = getApiUrl(`/public/rentals${qs ? `?${qs}` : ''}`);
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        console.error('[getPublicRentals]', url, res.status, msg);
        throw new Error(msg);
    }
    return json;
}

export interface BlogPostItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    publishedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    author: { id: string; fullName: string | null; email: string | null; avatarUrl: string | null } | null;
    category: { id: string; name: string; slug: string } | null;
    tags: Array<{ id: string; name: string; slug: string }>;
}

export async function getPublicBlogPostsRequest(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tag?: string;
}): Promise<{
    success: boolean;
    data: BlogPostItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.tag) searchParams.set('tag', params.tag);
    const qs = searchParams.toString();
    const url = getApiUrl(`/blogs${qs ? `?${qs}` : ''}`);
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return json;
}

export async function getPublicBlogPostBySlugRequest(slug: string): Promise<{
    success: boolean;
    data: BlogPostItem;
}> {
    const url = getApiUrl(`/blogs/${encodeURIComponent(slug)}`);
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return json;
}

export interface BlogPostPayload {
    title: string;
    slug?: string;
    excerpt?: string;
    content: string;
    coverImageUrl?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    publishedAt?: string | null;
    categoryName?: string | null;
    tagNames?: string[];
}

export async function getAdminBlogPostsRequest(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}): Promise<{
    success: boolean;
    data: BlogPostItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const res = await authFetch(`/blogs/admin/posts${qs ? `?${qs}` : ''}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Không tải được danh sách bài viết');
    return json;
}

export async function createBlogPostRequest(payload: BlogPostPayload): Promise<{ success: boolean; data: BlogPostItem; message?: string }> {
    const res = await authFetch('/blogs/admin/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Tạo bài viết thất bại');
    return json;
}

export async function updateBlogPostRequest(postId: string, payload: Partial<BlogPostPayload>): Promise<{ success: boolean; data: BlogPostItem; message?: string }> {
    const res = await authFetch(`/blogs/admin/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Cập nhật bài viết thất bại');
    return json;
}

export async function deleteBlogPostRequest(postId: string): Promise<{ success: boolean; message?: string }> {
    const res = await authFetch(`/blogs/admin/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Xóa bài viết thất bại');
    return json;
}

/**
 * GET /public/rentals/:id – rental detail (no auth).
 */
export async function getPublicRentalByIdRequest(rentalId: string): Promise<{
    success: boolean;
    data: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        createdAt: string;
        owner: { id: string; fullName: string; avatarUrl: string | null; email: string; phone: string | null } | null;
        location: { id: string; address: string; district: string | null; city: string | null } | null;
        rooms: Array<{
            id: string;
            rental_id: string;
            room_name: string | null;
            room_type: string | null;
            price: number;
            size_m2: number | null;
            max_people: number | null;
            images?: string[];
            amenities?: string[];
        }>;
        amenities?: string[];
        images: string[];
    };
}> {
    const url = getApiUrl(`/public/rentals/${encodeURIComponent(rentalId)}`);
    let res: Response;
    try {
        res = await fetch(url, { cache: 'default' });
    } catch (e) {
        console.error('[getPublicRentalById]', url, e);
        throw new Error('Không kết nối được máy chủ. Kiểm tra backend đã chạy.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        let msg = json?.message || json?.error || (res.status === 404 ? 'Không tìm thấy nhà trọ' : `Lỗi ${res.status}`);
        if (res.status === 404 && json?.rentalId) msg += ` (ID: ${json.rentalId})`;
        throw new Error(msg);
    }
    if (!json?.data && json?.success !== true) {
        throw new Error(json?.message || 'Dữ liệu không hợp lệ');
    }
    return json;
}

/**
 * GET /rooms/:roomId – room detail (public, no auth).
 * Tip: when showing this room to a logged-in user, call recordRoomView(roomId) to improve recommendations.
 */
export async function getRoomByIdRequest(roomId: string): Promise<{
    success: boolean;
    data: Record<string, unknown>;
}> {
    const res = await fetch(getApiUrl(`/rooms/${roomId}`));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'Không tìm thấy phòng');
    return json;
}

/**
 * GET /rooms/:roomId/search-roommate – room detail with tracking.
 */
export async function getRoomByIdForSearchRoomateRequest(roomId: string): Promise<{
    success: boolean;
    data: Record<string, unknown>;
}> {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = getApiUrl(`/rooms/${roomId}/search-roommate`);
    const res = await fetch(url, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'Không tìm thấy phòng');
    return json;
}

/**
 * GET /feedback/room/:roomId – get reviews for a room (public, no auth).
 */
export async function getRoomReviewsRequest(
    roomId: string,
    options: { page?: number; limit?: number } = {}
): Promise<{
    success: boolean;
    reviews: Array<{
        id: string;
        rating: number;
        cleanlinessRating?: number;
        locationRating?: number;
        valueRating?: number;
        landlordRating?: number;
        comment: string;
        createdAt: string;
        author: {
            id: string;
            name: string;
            avatar?: string;
        };
        landlordReply?: string;
        repliedAt?: string;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));

    const res = await fetch(getApiUrl(`/feedback/room/${roomId}?${params}`));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'Không thể tải đánh giá');
    return json;
}

/**
 * POST /tenant-reviews – landlord creates a tenant review
 */
export async function createTenantReviewRequest(body: {
    rentalPeriodId: string;
    rating: number;
    paymentPunctualityRating?: number;
    propertyCareRating?: number;
    communicationRating?: number;
    comment: string;
}): Promise<{
    success: boolean;
    message: string;
    data: { id: string; status: string; rating: number };
}> {
    const res = await authFetch('/tenant-reviews', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi đánh giá tenant thất bại');
    return data;
}

/**
 * GET /tenant-reviews/by-rental-period/:rentalPeriodId – get tenant review for a rental period
 */
export async function getTenantReviewByRentalPeriodRequest(rentalPeriodId: string): Promise<{
    success: boolean;
    data: {
        id: string;
        rating: number;
        paymentPunctualityRating: number | null;
        propertyCareRating: number | null;
        communicationRating: number | null;
        comment: string | null;
        status: string;
        moderatorNote: string | null;
        createdAt: string;
    } | null;
}> {
    const res = await authFetch(`/tenant-reviews/by-rental-period/${encodeURIComponent(rentalPeriodId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải đánh giá tenant');
    return data;
}

/**
 * GET /tenant-reviews/tenant/:tenantId – get all reviews for a tenant (internal, for landlords only)
 */
export async function getTenantReviewsRequest(tenantId: string): Promise<{
    success: boolean;
    data: unknown[];
    stats: {
        totalReviews: number;
        avgRating: number;
        avgPaymentPunctuality: number;
        avgPropertyCare: number;
        avgCommunication: number;
    };
}> {
    const res = await authFetch(`/tenant-reviews/tenant/${encodeURIComponent(tenantId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải đánh giá của tenant');
    return data;
}

/**
 * POST /tenant-reviews/:reviewId/reply – landlord replies to a tenant review
 */
export async function replyToTenantReviewRequest(reviewId: string, content: string): Promise<{
    success: boolean;
    data: unknown;
}> {
    const res = await authFetch(`/tenant-reviews/${encodeURIComponent(reviewId)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi phản hồi đánh giá tenant');
    return data;
}

/**
 * GET /tenant-reviews/moderation/pending – get pending tenant reviews for moderation
 */
export async function getPendingTenantReviewsRequest(page = 1, limit = 10): Promise<{
    success: boolean;
    data: unknown[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await authFetch(`/tenant-reviews/moderation/pending?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách đánh giá chờ duyệt');
    return data;
}

/**
 * PATCH /tenant-reviews/:reviewId/status/:action – moderator updates review status
 */
export async function updateTenantReviewStatusRequest(
    reviewId: string,
    action: 'approve' | 'reject' | 'hide',
    notes?: string
): Promise<{
    success: boolean;
    data: unknown;
}> {
    const res = await authFetch(
        `/tenant-reviews/${encodeURIComponent(reviewId)}/status/${action}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ notes }),
        }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi cập nhật trạng thái đánh giá');
    return data;
}

/**
 * GET /auth/me – current user from backend (verifies token end-to-end).
 */
export async function fetchAuthMe(): Promise<{
    success: boolean;
    user?: {
        id: string;
        email: string | null;
        full_name: string | null;
        avatar_url: string | null;
        created_at: string;
        role?: string;
        phone?: string | null;
        isVip?: boolean;
        gender?: string | null;
    };
    message?: string;
}> {
    const res = await authFetch('/auth/me');
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.message || 'Auth check failed');
    }
    return data;
}

/** Params for smart search (guest + tenant + VIP). */
export interface SmartSearchParams {
    q?: string;
    city?: string;
    district?: string;
    address?: string;
    minPrice?: number;
    maxPrice?: number;
    roomType?: string;
    minArea?: number;
    maxArea?: number;
    amenities?: string[];
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
}

/** Room-level search result (recommendation system). */
export interface SmartSearchRoomItem {
    id: string;
    rentalId: string;
    roomName: string | null;
    title: string;
    price: number;
    area: number | null;
    roomType: string | null;
    amenities: string[];
    images: string[];
    location: { district: string | null; city: string | null; address?: string | null } | null;
    matchScore: number;
    rating: number | null;
    available?: boolean;
    isNearlyAvailable?: boolean;
    availableFrom?: string | null;
    daysUntilAvailable?: number | null;
    otherRoomsInRental: Array<{ id: string; roomName: string | null; price: number; area: number | null; roomType: string; image: string }>;
    /** DB room status (e.g. AVAILABLE). */
    roomStatus?: string;
}

export interface ApiErrorWithCode extends Error {
    code?: string;
    upgradePath?: string;
    featureName?: string;
}

/**
 * GET /public/search – room-based recommendation search.
 * Pass token via options for user-preference scoring. Rooms sorted by match score.
 */
export async function smartSearchRequest(
    params?: SmartSearchParams,
    options?: { token?: string | null }
): Promise<{
    success: boolean;
    data: SmartSearchRoomItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.city) search.set('city', params.city);
    if (params?.district) search.set('district', params.district);
    if (params?.address) search.set('address', params.address);
    if (params?.minPrice != null) search.set('minPrice', String(params.minPrice));
    if (params?.maxPrice != null) search.set('maxPrice', String(params.maxPrice));
    if (params?.roomType) search.set('roomType', params.roomType);
    if (params?.minArea != null) search.set('minArea', String(params.minArea));
    if (params?.maxArea != null) search.set('maxArea', String(params.maxArea));
    if (params?.amenities?.length) search.set('amenities', params.amenities.join(','));
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const url = getApiUrl(`/public/search?${search.toString()}`);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = options?.token ?? (await getAccessToken());
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { cache: 'no-store', headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json?.message || json?.error || 'Lỗi tìm kiếm') as ApiErrorWithCode;
        err.code = json?.code;
        err.upgradePath = json?.upgradePath;
        err.featureName = json?.featureName;
        throw err;
    }
    return json;
}

/**
 * GET /search/advanced – AI-powered search for logged-in users.
 * Uses embeddings, preferences, lifestyle, and ratings for multi-factor scoring.
 */
export async function advancedSearchRequest(
    params?: SmartSearchParams,
    options?: { token?: string | null }
): Promise<{
    success: boolean;
    data: SmartSearchRoomItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    searchMode?: string;
}> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.city) search.set('city', params.city);
    if (params?.district) search.set('district', params.district);
    if (params?.address) search.set('address', params.address);
    if (params?.minPrice != null) search.set('minPrice', String(params.minPrice));
    if (params?.maxPrice != null) search.set('maxPrice', String(params.maxPrice));
    if (params?.roomType) search.set('roomType', params.roomType);
    if (params?.minArea != null) search.set('minArea', String(params.minArea));
    if (params?.maxArea != null) search.set('maxArea', String(params.maxArea));
    if (params?.amenities?.length) search.set('amenities', params.amenities.join(','));
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.lat != null) search.set('lat', String(params.lat));
    if (params?.lng != null) search.set('lng', String(params.lng));
    const res = await authFetch(`/search/advanced?${search.toString()}`, { token: options?.token });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json?.message || json?.error || 'Lỗi tìm kiếm nâng cao') as Error & { status?: number };
        err.status = res.status;
        throw err;
    }
    return json;
}

/**
 * GET /search/nearby – find rooms near user's location (auth required).
 */
export async function nearbySearchRequest(
    params: { lat: number; lng: number; radius?: number; page?: number; limit?: number },
    options?: { token?: string | null }
): Promise<{
    success: boolean;
    data: SmartSearchRoomItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    searchMode?: string;
    radius?: number;
    googleMapsEnabled?: boolean;
}> {
    const search = new URLSearchParams();
    search.set('lat', String(params.lat));
    search.set('lng', String(params.lng));
    if (params.radius != null) search.set('radius', String(params.radius));
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const res = await authFetch(`/search/nearby?${search.toString()}`, { token: options?.token });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'Lỗi tìm kiếm gần bạn');
    return json;
}

/**
 * GET /search/recommend – recommend rentals by user profile (tenant/VIP, auth required).
 * Pass token when available from auth context.
 */
export async function getRecommendRequest(options?: { token?: string | null }): Promise<{
    success: boolean;
    data: Array<{
        id: string;
        rentalId?: string;
        title: string;
        description: string | null;
        location: { district: string | null; city: string | null } | null;
        images: string[];
        price: number;
        area: number | null;
        amenities: string[];
        roomStatus?: string;
        available?: boolean;
    }>;
    hint?: string;
}> {
    const res = await authFetch('/search/recommend', { token: options?.token });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Lỗi tải gợi ý');
    return json;
}

/**
 * POST /search/transcribe – Whisper (OpenAI). Auth required; same pipeline as search page.
 */
export async function transcribeSearchVoiceRequest(
    audioBlob: Blob,
    options?: { token?: string | null; filename?: string; signal?: AbortSignal }
): Promise<string> {
    const filename = options?.filename ?? 'voice.webm';
    const form = new FormData();
    form.append('file', audioBlob, filename);
    const res = await authFetch('/search/transcribe', {
        method: 'POST',
        body: form,
        token: options?.token,
        signal: options?.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Không thể chuyển giọng nói thành văn bản');
    }
    return typeof json.text === 'string' ? json.text : '';
}

/**
 * POST /interactions – record user–room interaction for behavior learning (auth required).
 * Call when user views a room (view), favorites (favorite), contacts landlord (contact_landlord), or shares (share).
 */
export async function recordInteractionRequest(
    roomId: string,
    interactionType: 'view' | 'favorite' | 'contact_landlord' | 'share' = 'view'
): Promise<{ success: boolean; message?: string }> {
    const res = await authFetch('/interactions', {
        method: 'POST',
        body: JSON.stringify({ roomId, interactionType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi ghi nhận');
    return data;
}

/**
 * Fire-and-forget: record a room view for ranking/popularity. Call when opening room detail.
 * Does not throw; safe to call without await.
 */
export function recordRoomView(roomId: string): void {
    if (!roomId) return;
    recordInteractionRequest(roomId, 'view').catch(() => { });
}

/**
 * GET /search/by-text – text-to-image search (auth required).
 * Describe the room in text (e.g. "phòng có cửa sổ lớn") and get visually similar rooms.
 */
export async function searchByTextRequest(
    q: string
): Promise<{
    success: boolean;
    data: Array<{
        id: string;
        title: string;
        location: { district: string | null; city: string | null } | null;
        images: string[];
        price: number;
        matchScore?: number;
    }>;
    message?: string;
    searchMode?: string;
}> {
    const res = await authFetch(`/search/by-text?${new URLSearchParams({ q: q.trim() }).toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Lỗi tìm kiếm bằng mô tả');
    return json;
}

/**
 * POST /search/by-image – image search (VIP only). Auth required.
 * Uses OpenAI Vision + CLIP embeddings for visual room similarity matching.
 */
export async function searchByImageRequest(
    imageFile: File,
    options?: {
        token?: string | null;
        /** Optional text hint blended with image embedding (CLIP multimodal: 70% image + 30% text). */
        text_hint?: string;
        q?: string;
        city?: string;
        district?: string;
        address?: string;
        minPrice?: number;
        maxPrice?: number;
        roomType?: string;
        minArea?: number;
        maxArea?: number;
        amenities?: string[];
        lat?: number;
        lng?: number;
        signal?: AbortSignal;
    }
): Promise<{
    success: boolean;
    data: Array<{
        id: string;
        title: string;
        location: { district: string | null; city: string | null } | null;
        images: string[];
        price: number;
    }>;
    message?: string;
    searchMode?: string;
}> {
    const token = options?.token ?? (await getAccessToken());
    if (!token) throw new Error('Cần đăng nhập để tìm kiếm bằng ảnh');

    const form = new FormData();
    form.append('file', imageFile);
    if (options?.text_hint) form.append('text_hint', options.text_hint);
    if (options?.q) form.append('q', options.q);
    if (options?.city) form.append('city', options.city);
    if (options?.district) form.append('district', options.district);
    if (options?.address) form.append('address', options.address);
    if (options?.minPrice != null) form.append('minPrice', String(options.minPrice));
    if (options?.maxPrice != null) form.append('maxPrice', String(options.maxPrice));
    if (options?.roomType) form.append('roomType', options.roomType);
    if (options?.minArea != null) form.append('minArea', String(options.minArea));
    if (options?.maxArea != null) form.append('maxArea', String(options.maxArea));
    if (options?.amenities?.length) form.append('amenities', options.amenities.join(','));
    if (options?.lat != null) form.append('lat', String(options.lat));
    if (options?.lng != null) form.append('lng', String(options.lng));

    const res = await authFetch('/search/by-image', {
        method: 'POST',
        body: form,
        token,
        signal: options?.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json?.message || 'Lỗi tìm kiếm ảnh') as Error & { status?: number };
        err.status = res.status;
        throw err;
    }
    return json;
}

/**
 * GET /public/landlord/:userId – public landlord profile.
 */
export interface LandlordProfileResponse {
    success: boolean;
    data: {
        user: {
            id: string;
            fullName: string;
            avatarUrl: string | null;
            phone: string | null;
            createdAt: string;
        };
        stats: {
            totalRentals: number;
            activeRentals: number;
            totalRooms: number;
            availableRooms: number;
            totalReviews: number;
            avgRating: number;
        };
        rentals: Array<{
            id: string;
            title: string;
            description: string | null;
            status: string;
            createdAt: string;
            location: { address: string; district: string | null; city: string | null } | null;
            images: string[];
            roomCount: number;
        }>;
        rooms: Array<{
            id: string;
            rentalId: string;
            rentalTitle: string;
            roomName: string | null;
            description: string | null;
            roomType: string | null;
            price: number;
            sizeM2: number | null;
            maxPeople: number | null;
            status: string;
            createdAt: string;
            location: { address: string; district: string | null; city: string | null } | null;
            images: string[];
            amenities: string[];
        }>;
        reviews: Array<{
            id: string;
            rating: number | null;
            comment: string | null;
            createdAt: string;
            reviewer: { id: string; fullName: string; avatarUrl: string | null } | null;
        }>;
    };
}

export interface VipPackageItem {
    id: string;
    name: string;
    description: string | null;
    durationDays: number;
    price: number;
    targetRole: 'TENANT' | 'LANDLORD' | string;
    isActive: boolean;
    createdAt: string | null;
}

export async function getVipPackagesRequest(targetRole?: 'TENANT' | 'LANDLORD'): Promise<{
    success: boolean;
    data: VipPackageItem[];
}> {
    const search = new URLSearchParams();
    if (targetRole) search.set('targetRole', targetRole);
    const qs = search.toString();
    const res = await fetch(getApiUrl(`/vip/packages${qs ? `?${qs}` : ''}`), {
        cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.message || 'Không thể tải gói VIP');
    }
    return json;
}

export async function createVipPurchaseRequest(packageId: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
        payment?: {
            checkoutUrl?: string | null;
            orderCode?: string;
        };
    };
}> {
    const res = await authFetch('/vip/purchase', {
        method: 'POST',
        body: JSON.stringify({ packageId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.message || 'Không thể tạo thanh toán VIP');
    }
    return json;
}

export async function verifyVipPurchaseRequest(orderCode: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
        confirmed?: boolean;
        activated?: boolean;
        vipExpiresAt?: string;
        payosStatus?: string;
    };
}> {
    const res = await authFetch(`/vip/verify?orderCode=${encodeURIComponent(orderCode)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.message || 'Không thể xác minh thanh toán VIP');
    }
    return json;
}

export interface VipPurchaseHistory {
    id: string;
    packageName: string;
    durationDays: number;
    targetRole: string | null;
    startDate: string;
    endDate: string;
    pricePaid: number;
    createdAt: string | null;
}

export interface VipStatusData {
    isVip: boolean;
    vipExpiresAt: string | null;
    daysRemaining: number;
    purchases: VipPurchaseHistory[];
}

export async function getMyVipStatusRequest(): Promise<{ success: boolean; data: VipStatusData }> {
    const res = await authFetch('/vip/my-status');
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Không thể tải trạng thái VIP');
    return json;
}

export async function getLandlordProfileRequest(userId: string): Promise<LandlordProfileResponse> {
    const url = getApiUrl(`/public/landlord/${encodeURIComponent(userId)}`);
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Không tìm thấy chủ nhà');
    return json;
}

// ============ REPORT / VIOLATION ============
// Align với report_status_enum và report_target_type_enum trong Prisma schema

export type ReportTargetTypeEnum = 'USER' | 'ROOM' | 'BOOKING' | 'REVIEW';
export type ReportStatusEnum = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISMISSED';

export interface ReportItem {
    id: string;
    reporterId: string;
    targetType: ReportTargetTypeEnum;
    targetId: string;
    reason: string;
    description: string | null;
    status: ReportStatusEnum;
    reviewedBy: string | null;
    moderatorNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
    reporter?: { id: string; fullName: string; email: string; phone: string | null; avatarUrl: string | null };
    targetUser?: { id: string; fullName: string; email: string; phone: string | null; avatarUrl: string | null } | null;
    moderator?: { id: string; fullName: string } | null;
}

/**
 * POST /reports – submit a violation report (role TENANT only on the server).
 */
export async function createReportRequest(body: {
    targetType: 'USER' | 'ROOM' | 'BOOKING' | 'REVIEW';
    targetId: string;
    reason: string;
    description?: string;
}): Promise<{ success: boolean; message: string; data: ReportItem }> {
    const res = await authFetch('/reports', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Gửi báo cáo thất bại');
    return data;
}

/**
 * GET /reports – list reports (moderator/admin).
 */
export async function getReportsRequest(params?: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{
    success: boolean;
    data: ReportItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    const res = await authFetch(`/reports${qs ? `?${qs}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải danh sách báo cáo');
    return data;
}

/**
 * PATCH /reports/:id – handle/resolve a report (moderator/admin).
 */
export async function handleReportRequest(
    reportId: string,
    body: { status: Exclude<ReportStatusEnum, 'PENDING'>; moderatorNote?: string }
): Promise<{ success: boolean; message: string; data: ReportItem }> {
    const res = await authFetch(`/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Xử lý báo cáo thất bại');
    return data;
}

/** Landlord Dashboard */

export interface LandlordDashboardStats {
    rentals: {
        total: number;
        byStatus: {
            AVAILABLE: number;
            UNAVAILABLE: number;
            HIDDEN: number;
            PENDING: number;
            SUSPEND: number;
            VIOLATE: number;
        };
    };
    rooms: {
        total: number;
        byStatus: {
            PENDING: number;
            AVAILABLE: number;
            RENTED: number;
            MAINTENANCE: number;
            NEARLY_AVAILABLE: number;
        };
    };
    wallet: {
        balance: number;
    };
    feedback: {
        total: number;
        averageRating: number;
    };
    preorders: {
        total: number;
        byStatus: {
            PENDING: number;
            CONFIRMED: number;
            CANCELLED: number;
            EXPIRED: number;
        };
    };
}

export interface LandlordPerformanceMetrics {
    occupancyRate: number;
    revenue: {
        thisMonth: number;
        total: number;
    };
    cancellationRate: number;
    conversionRate: number;
    bookingStats: {
        active: number;
        cancelled: number;
        total: number;
    };
}

export async function getLandlordDashboardStatsRequest(month?: string): Promise<{
    success: boolean;
    data: LandlordDashboardStats;
}> {
    const search = new URLSearchParams();
    if (month) search.set('month', month);
    const qs = search.toString();
    const res = await authFetch(`/rentals/dashboard${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải dashboard');
    return data;
}


export async function getLandlordPerformanceMetricsRequest(month?: string): Promise<{
    success: boolean;
    data: LandlordPerformanceMetrics;
}> {
    const search = new URLSearchParams();
    if (month) search.set('month', month);
    const qs = search.toString();
    const res = await authFetch(`/rentals/performance${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải chỉ số hiệu suất');
    return data;
}

export interface TopSearchedRoom {
    id: string;
    name: string;
    price: number;
    searchCount: number;
    image: string | null;
    rentalTitle: string;
    location: {
        address: string;
        district: string;
        city: string;
    };
}

export async function getTopSearchedRoomsRequest(limit: number = 5): Promise<{
    success: boolean;
    data: {
        rooms: TopSearchedRoom[];
    };
}> {
    const res = await authFetch(`/rentals/top-searched?limit=${limit}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải phòng được tìm kiếm');
    return data;
}
/** Notifications */

export interface NotificationItem {
    id: string;
    type: string;
    status: string;
    title: string | null;
    body: string | null;
    roomId: string | null;
    createdAt: string;
}

export async function getNotificationsRequest(params?: {
    page?: number;
    limit?: number;
}): Promise<{
    success: boolean;
    data: NotificationItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    const res = await authFetch(`/notifications${qs ? `?${qs}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi tải thông báo');
    return data;
}

export async function getUnreadCountRequest(): Promise<{
    success: boolean;
    unreadCount: number;
}> {
    const res = await authFetch('/notifications/unread-count');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi đếm thông báo');
    return data;
}

export async function markNotificationReadRequest(id: string): Promise<{
    success: boolean;
    message: string;
}> {
    const res = await authFetch(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi đánh dấu đã đọc');
    return data;
}

export async function markAllNotificationsReadRequest(): Promise<{
    success: boolean;
    message: string;
}> {
    const res = await authFetch('/notifications/read-all', { method: 'PATCH' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Lỗi đánh dấu đã đọc');

    return data;
}
