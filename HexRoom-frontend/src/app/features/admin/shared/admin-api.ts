import axios from 'axios';
import { getApiUrl } from '@/lib/api-config';

axios.defaults.withCredentials = true;

// Get token from localStorage (same key as AuthContext)
function getAuthHeader() {
    const token = localStorage.getItem('hexroom_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('hexroom_token');
    if (token) {
        config.headers = config.headers || {};
        if (!('Authorization' in config.headers)) {
            (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean });
        const shouldRetry =
            !!originalRequest &&
            !originalRequest._retry &&
            error?.response?.status === 401 &&
            !!localStorage.getItem('hexroom_token') &&
            typeof originalRequest.url === 'string' &&
            !originalRequest.url.endsWith('/auth/refresh') &&
            !originalRequest.url.endsWith('/auth/login');

        if (!shouldRetry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        try {
            const refreshRes = await fetch(getApiUrl('/auth/refresh'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const refreshData = await refreshRes.json().catch(() => ({}));
            if (!refreshRes.ok) {
                return Promise.reject(error);
            }
            const nextToken = refreshData?.accessToken || refreshData?.token;
            if (!nextToken) {
                return Promise.reject(error);
            }
            localStorage.setItem('hexroom_token', nextToken);
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${nextToken}`;
            return axios(originalRequest);
        } catch {
            return Promise.reject(error);
        }
    }
);

// ==================== Types ====================

export interface User {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: 'ADMIN' | 'MODERATOR' | 'LANDLORD' | 'TENANT' | 'GUEST';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';
    createdAt: string;
}

export interface UserDetail extends User {
    isVip: boolean | null;
    updated_at: string | null;
    wallet: {
        id: string;
        balance: string;
        createdAt: string;
    } | null;
    rentals: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: string;
        rooms: Array<{ id: string }>;
    }>;
    lifestyleProfile: {
        id: string;
        occupation_type: string | null;
        personalityType: string | null;
        created_at: string;
    } | null;
    preference: {
        id: string;
        budget_min: string | null;
        budget_max: string | null;
        preferredLocation: string | null;
        room_type: string | null;
    } | null;
    preorders: Array<{
        id: string;
        status: string;
        payment_status: string;
        deposit_amount: string | null;
        createdAt: string;
    }>;
    stats: {
        totalRentals: number;
        totalFavorites: number;
        totalPreorders: number;
    };
}

export interface AdminStats {
    users: {
        total: number;
        byRole: {
            admins: number;
            landlords: number;
            tenants: number;
            moderators: number;
        };
        byStatus: {
            active: number;
            banned: number;
        };
    };
    rentals?: {
        total: number;
    };
    rooms?: {
        total: number;
    };
    wallets?: {
        total: number;
        totalBalance: number;
    };
    feedback?: {
        total: number;
    };
    preorders?: {
        total: number;
    };
}

export interface RentalStats {
    total: number;
    byStatus: {
        available: number;
        unavailable: number;
        hidden: number;
        violate: number;
        pending: number;
        suspend: number;
    };
    thisMonth: number;
}

export interface Rental {
    id: string;
    title: string;
    description: string | null;
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN' | 'VIOLATE' | 'PENDING' | 'SUSPEND';
    createdAt: string;
    owner: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
    };
    location: {
        id: string;
        address: string;
        district: string | null;
        city: string | null;
    } | null;
    rooms: Array<{
        id: string;
        room_name: string;
        price: number;
        room_type: string | null;
    }>;
    roomCount: number;
}

export interface Amenity {
    id: string;
    name: string;
}

export interface Location {
    id: string;
    address: string;
    district: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
}

export interface WalletInfo {
    id: string;
    userId: string;
    balance: string;
    createdAt: string;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        avatarUrl: string | null;
        role: string;
        status: string;
    };
}

export interface WalletTransaction {
    id: string;
    walletId: string;
    transaction_type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PREORDER' | 'REFUND' | 'PAYMENT';
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    amount: string;
    description: string | null;
    createdAt: string;
    payosOrderCode: string | null;
    paidAt: string | null;
}

export interface WalletStats {
    totalWallets: number;
    totalBalance: number;
    avgBalance: number;
    maxBalance: number;
    pendingWithdrawRequests: number;
    transactionsByType: Array<{
        type: string;
        count: number;
        totalAmount: number;
    }>;
    transactionsByStatus: Array<{
        status: string;
        count: number;
    }>;
}

export interface PendingWithdrawalQueueItem {
    id: string;
    walletId: string;
    amount: string;
    status: 'PENDING';
    transaction_type: 'WITHDRAW';
    description: string | null;
    createdAt: string;
    waitingHours: number;
    priority: 'HIGH' | 'NORMAL';
    isOverdue: boolean;
    wallet: {
        id: string;
        balance: string;
    };
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        avatarUrl: string | null;
        role: string;
        status: string;
    };
}

export interface PendingWithdrawalQueueSummary {
    pendingCount: number;
    pendingAmount: number;
    avgWaitingHours: number;
    overdueCount: number;
    slaHours: number;
    priorityAmountThreshold: number;
}

export interface GetPendingWithdrawalQueueParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'amount';
    order?: 'asc' | 'desc';
    minAmount?: number;
    maxAmount?: number;
    createdAfter?: string;
    createdBefore?: string;
}

export interface BatchWithdrawalActionResult {
    transactionId: string;
    walletId: string | null;
    amount: string | null;
}

export interface BatchWithdrawalFailure {
    transactionId: string;
    message: string;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ==================== Admin Stats ====================

export async function getAdminStats(): Promise<AdminStats> {
    try {
        const res = await axios.get(getApiUrl('/admin/stats'), {
            headers: getAuthHeader(),
        });
        return res.data.data;
    } catch (error) {
        console.error('getAdminStats error:', error);
        return {
            users: {
                total: 0,
                byRole: { admins: 0, landlords: 0, tenants: 0, moderators: 0 },
                byStatus: { active: 0, banned: 0 },
            },
        };
    }
}

export async function getRentalStats(): Promise<RentalStats> {
    try {
        const res = await axios.get(getApiUrl('/rentals/stats'), {
            headers: getAuthHeader(),
        });
        return res.data.data;
    } catch (error) {
        console.error('getRentalStats error:', error);
        return {
            total: 0,
            byStatus: { available: 0, unavailable: 0, hidden: 0, violate: 0, pending: 0, suspend: 0 },
            thisMonth: 0,
        };
    }
}

// ==================== Users API ====================

export interface GetUsersParams {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
}

export async function getUsers(params: GetUsersParams = {}): Promise<{
    data: User[];
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/users'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getUsers error:', error);
        return {
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        };
    }
}

export async function updateUserRole(userId: string, role: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(
            getApiUrl(`/admin/users/${userId}/role`),
            { role },
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi cập nhật role',
        };
    }
}

export async function updateUserStatus(userId: string, status: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(
            getApiUrl(`/admin/users/${userId}/status`),
            { status },
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message || 'Cập nhật thành công' };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi cập nhật status',
        };
    }
}

// ==================== Rentals API ====================

export interface GetRentalsParams {
    page?: number;
    limit?: number;
    status?: string;
    ownerId?: string;
    search?: string;
    city?: string;
}

export async function getRentals(params: GetRentalsParams = {}): Promise<{
    data: Rental[];
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/rentals'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getRentals error:', error);
        return {
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        };
    }
}

export async function getRentalById(rentalId: string): Promise<Rental | null> {
    try {
        const res = await axios.get(getApiUrl(`/rentals/${rentalId}`), {
            headers: getAuthHeader(),
        });
        return res.data.data;
    } catch (error) {
        console.error('getRentalById error:', error);
        return null;
    }
}

export async function updateRentalStatus(
    rentalId: string,
    status: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(
            getApiUrl(`/rentals/${rentalId}/status`),
            { status, reason },
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi cập nhật status',
        };
    }
}

export async function deleteRental(rentalId: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.delete(getApiUrl(`/rentals/${rentalId}`), {
            headers: getAuthHeader(),
        });
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi xóa bài đăng',
        };
    }
}

// ==================== Amenities API ====================

export async function getAmenities(): Promise<Amenity[]> {
    try {
        const res = await axios.get(getApiUrl('/amenities'));
        return res.data.data;
    } catch (error) {
        console.error('getAmenities error:', error);
        return [];
    }
}

export async function createAmenity(data: { name: string }): Promise<{ success: boolean; message: string; data?: Amenity }> {
    try {
        const res = await axios.post(
            getApiUrl('/amenities'),
            data,
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message, data: res.data.data };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi tạo tiện ích',
        };
    }
}

export async function updateAmenity(id: string, data: { name: string }): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(
            getApiUrl(`/amenities/${id}`),
            data,
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi cập nhật tiện ích',
        };
    }
}

export async function deleteAmenity(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.delete(getApiUrl(`/amenities/${id}`), {
            headers: getAuthHeader(),
        });
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi xóa tiện ích',
        };
    }
}

// ==================== Locations API ====================

export async function getLocations(city?: string): Promise<Location[]> {
    try {
        const res = await axios.get(getApiUrl('/locations'), { params: city ? { city } : {} });
        return res.data.data;
    } catch (error) {
        console.error('getLocations error:', error);
        return [];
    }
}

export async function getCities(): Promise<string[]> {
    try {
        const res = await axios.get(getApiUrl('/locations/cities'));
        return res.data.data;
    } catch (error) {
        console.error('getCities error:', error);
        return [];
    }
}

export interface CreateLocationInput {
    address: string;
    city?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
}

export async function createLocation(data: CreateLocationInput): Promise<{ success: boolean; message: string; data?: Location }> {
    try {
        const res = await axios.post(getApiUrl('/locations'), data, {
            headers: getAuthHeader(),
        });
        return { success: true, message: res.data.message, data: res.data.data };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi tạo địa điểm',
        };
    }
}

export async function updateLocation(id: string, data: Partial<CreateLocationInput>): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(getApiUrl(`/locations/${id}`), data, {
            headers: getAuthHeader(),
        });
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi cập nhật địa điểm',
        };
    }
}

export async function deleteLocation(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.delete(getApiUrl(`/locations/${id}`), {
            headers: getAuthHeader(),
        });
        return { success: true, message: res.data.message };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi xóa địa điểm',
        };
    }
}

// ==================== Citizen Card Verification API ====================

export interface CitizenCardVerificationItem {
    id: string;
    userId: string;
    citizenCardNumber: string;
    citizenCardFrontImageUrl: string;
    citizenCardBackImageUrl: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    reviewNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        role: string;
    } | null;
}

export async function getCitizenCardVerifications(params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
    search?: string;
}): Promise<{ data: CitizenCardVerificationItem[]; pagination: PaginationInfo }> {
    try {
        const res = await axios.get(getApiUrl('/verifications/citizen-cards'), {
            headers: getAuthHeader(),
            params,
        });
        return { data: res.data.data, pagination: res.data.pagination };
    } catch (error) {
        console.error('getCitizenCardVerifications error:', error);
        return {
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
    }
}

export async function reviewCitizenCardVerification(
    verificationId: string,
    body: { status: 'VERIFIED' | 'REJECTED'; reviewNote?: string }
): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(
            getApiUrl(`/verifications/citizen-cards/${verificationId}/review`),
            body,
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message || 'Duyệt thành công' };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi duyệt CCCD',
        };
    }
}

// ==================== User Detail API ====================

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
    try {
        const res = await axios.get(getApiUrl(`/admin/users/${userId}`), {
            headers: getAuthHeader(),
        });
        return res.data.data;
    } catch (error) {
        console.error('getUserDetail error:', error);
        return null;
    }
}

// ==================== Wallets API ====================

export interface GetWalletsParams {
    page?: number;
    limit?: number;
    search?: string;
    minBalance?: number;
    maxBalance?: number;
}

export async function getWallets(params: GetWalletsParams = {}): Promise<{
    data: WalletInfo[];
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/wallets'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getWallets error:', error);
        return {
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        };
    }
}

export async function getWalletTransactions(
    walletId: string,
    params: { page?: number; limit?: number; type?: string; status?: string } = {}
): Promise<{
    wallet: { id: string; balance: string; user: { id: string; fullName: string; email: string; role: string } };
    transactions: WalletTransaction[];
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl(`/admin/wallets/${walletId}/transactions`), {
            headers: getAuthHeader(),
            params,
        });
        return {
            wallet: res.data.data.wallet,
            transactions: res.data.data.transactions,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getWalletTransactions error:', error);
        return {
            wallet: { id: '', balance: '0', user: { id: '', fullName: '', email: '', role: '' } },
            transactions: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
    }
}

export async function getWalletStats(): Promise<WalletStats> {
    try {
        const res = await axios.get(getApiUrl('/admin/wallets/stats'), {
            headers: getAuthHeader(),
        });
        return res.data.data;
    } catch (error) {
        console.error('getWalletStats error:', error);
        return {
            totalWallets: 0,
            totalBalance: 0,
            avgBalance: 0,
            maxBalance: 0,
            pendingWithdrawRequests: 0,
            transactionsByType: [],
            transactionsByStatus: [],
        };
    }
}

export async function approveWalletWithdrawal(transactionId: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(
            getApiUrl(`/admin/wallets/withdrawals/${transactionId}/approve`),
            {},
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message || 'Đã duyệt yêu cầu rút tiền' };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi duyệt yêu cầu rút tiền',
        };
    }
}

export async function rejectWalletWithdrawal(
    transactionId: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const payload = reason?.trim() ? { reason: reason.trim() } : {};
        const res = await axios.patch(
            getApiUrl(`/admin/wallets/withdrawals/${transactionId}/reject`),
            payload,
            { headers: getAuthHeader() }
        );
        return { success: true, message: res.data.message || 'Đã từ chối yêu cầu rút tiền' };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi từ chối yêu cầu rút tiền',
        };
    }
}

export async function getPendingWithdrawalQueue(
    params: GetPendingWithdrawalQueueParams = {}
): Promise<{
    data: PendingWithdrawalQueueItem[];
    summary: PendingWithdrawalQueueSummary;
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/wallets/withdrawals/pending'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data,
            summary: res.data.summary,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getPendingWithdrawalQueue error:', error);
        return {
            data: [],
            summary: {
                pendingCount: 0,
                pendingAmount: 0,
                avgWaitingHours: 0,
                overdueCount: 0,
                slaHours: 12,
                priorityAmountThreshold: 3000000,
            },
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
    }
}

export async function approveWalletWithdrawalsBatch(transactionIds: string[]): Promise<{
    success: boolean;
    message: string;
    approved: BatchWithdrawalActionResult[];
    failed: BatchWithdrawalFailure[];
}> {
    try {
        const res = await axios.patch(
            getApiUrl('/admin/wallets/withdrawals/batch-approve'),
            { transactionIds },
            { headers: getAuthHeader() }
        );
        return {
            success: true,
            message: res.data.message || 'Duyệt hàng loạt thành công',
            approved: res.data.data?.approved || [],
            failed: res.data.data?.failed || [],
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi duyệt hàng loạt yêu cầu rút tiền',
            approved: [],
            failed: [],
        };
    }
}

export async function rejectWalletWithdrawalsBatch(
    transactionIds: string[],
    reason?: string
): Promise<{
    success: boolean;
    message: string;
    rejected: BatchWithdrawalActionResult[];
    failed: BatchWithdrawalFailure[];
}> {
    try {
        const res = await axios.patch(
            getApiUrl('/admin/wallets/withdrawals/batch-reject'),
            {
                transactionIds,
                reason: reason?.trim() || undefined,
            },
            { headers: getAuthHeader() }
        );
        return {
            success: true,
            message: res.data.message || 'Từ chối hàng loạt thành công',
            rejected: res.data.data?.rejected || [],
            failed: res.data.data?.failed || [],
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi từ chối hàng loạt yêu cầu rút tiền',
            rejected: [],
            failed: [],
        };
    }
}

// ==================== Settings API ====================

export interface SystemSettingsData {
    settings: {
        'preorder.deposit': {
            defaultPercent: number;
            minPercent: number;
            maxPercent: number;
            baseMonths: number;
        };
        'platform.commission': {
            preorderFeeBps: number;
        };
        'site.homeBanner': {
            enabled: boolean;
            title: string;
            subtitle: string;
            imageUrl: string;
            ctaText: string;
            ctaLink: string;
        };
        'site.homeLayout': {
            sections: Array<{ key: string; enabled: boolean }>;
        };
    };
    meta: Record<string, { source: 'db' | 'default'; updatedAt: string | null; updatedBy: string | null }>;
}

export async function getSystemSettings(): Promise<SystemSettingsData | null> {
    try {
        const res = await axios.get(getApiUrl('/admin/settings'), {
            headers: getAuthHeader(),
        });
        return res.data.data;
    } catch (error) {
        console.error('getSystemSettings error:', error);
        return null;
    }
}

export interface UpdateSystemSettingsInput {
    settings: Partial<{
        'preorder.deposit': {
            defaultPercent: number;
            minPercent: number;
            maxPercent: number;
            baseMonths: number;
        };
        'platform.commission': {
            preorderFeeBps: number;
        };
        'site.homeBanner': {
            enabled: boolean;
            title: string;
            subtitle: string;
            imageUrl: string;
            ctaText: string;
            ctaLink: string;
        };
        'site.homeLayout': {
            sections: Array<{ key: string; enabled: boolean }>;
        };
    }>;
}

export async function updateSystemSettings(payload: UpdateSystemSettingsInput): Promise<{ success: boolean; message: string; data?: SystemSettingsData }> {
    try {
        const res = await axios.patch(getApiUrl('/admin/settings'), payload, {
            headers: getAuthHeader(),
        });
        return {
            success: true,
            message: res.data.message || 'Cập nhật settings thành công',
            data: res.data.data,
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi cập nhật settings',
        };
    }
}

// ==================== Finance API ====================

export interface DateRangeParams {
    from?: string;
    to?: string;
}

export interface FinanceSummaryData {
    range: {
        from: string;
        to: string;
    };
    kpis: {
        preorderDeposits: { successCount: number; successAmount: number };
        walletTopups: { successCount: number; successAmount: number };
        vipPurchases: { successCount: number; successAmount: number };
        refunds: { completedCount: number; completedAmount: number };
        platformFees: { entries: number; amount: number };
        pendingPaymentOrders: number;
        pendingPaymentAmount: number;
        paymentOrdersByStatus: Record<string, { count: number; amount: number }>;
    };
}

export async function getFinanceSummary(params: DateRangeParams = {}): Promise<FinanceSummaryData | null> {
    try {
        const res = await axios.get(getApiUrl('/admin/finance/summary'), {
            headers: getAuthHeader(),
            params,
        });
        return res.data.data;
    } catch (error) {
        console.error('getFinanceSummary error:', error);
        return null;
    }
}

export interface ReconciliationItem {
    type: string;
    order: {
        id: string;
        vnp_txn_ref: string;
        amount: string;
        status: string;
        ref_type: string | null;
        ref_id: string | null;
        created_at: string;
        updated_at: string;
    } | null;
    preorder: {
        id: string;
        userId?: string;
        roomId?: string;
        status: string;
        payment_status: string;
        deposit_amount: string | null;
        createdAt: string;
    } | null;
}

export interface FinanceReconciliationData {
    range: { from: string; to: string };
    summary: { total: number; byType: Record<string, number> };
    mismatches: ReconciliationItem[];
}

export type PendingOrderPurpose =
    | 'ALL'
    | 'PREORDER_DEPOSIT'
    | 'WALLET_TOPUP'
    | 'VIP_PURCHASE'
    | 'WITHDRAWAL';

export interface PendingPaymentOrderItem {
    id: string;
    source: 'PAYMENT_ORDER' | 'WALLET_TRANSACTION';
    purpose: Exclude<PendingOrderPurpose, 'ALL'>;
    status: string;
    amount: number;
    createdAt: string | null;
    waitingHours: number;
    agingBucket: 'LT_30M' | 'FROM_30M_TO_2H' | 'FROM_2H_TO_24H' | 'GE_24H';
    orderCode: string | null;
    refType: string | null;
    refId: string | null;
    walletId: string | null;
    description: string | null;
    user: {
        id: string | null;
        fullName: string | null;
        email: string | null;
        phone: string | null;
    };
}

export interface PendingPaymentOrdersData {
    filters: {
        purpose: PendingOrderPurpose;
        search: string | null;
        sortBy: 'createdAt' | 'amount' | string;
        order: 'asc' | 'desc' | string;
        createdAfter: string | null;
        createdBefore: string | null;
    };
    summary: {
        total: number;
        totalAmount: number;
        byPurpose: Record<string, { count: number; amount: number }>;
        byAgingBucket: Record<string, number>;
    };
    items: PendingPaymentOrderItem[];
}

export interface GetPendingPaymentOrdersParams {
    page?: number;
    limit?: number;
    purpose?: PendingOrderPurpose;
    search?: string;
    sortBy?: 'createdAt' | 'amount';
    order?: 'asc' | 'desc';
    createdAfter?: string;
    createdBefore?: string;
}

export async function getPendingPaymentOrders(params: GetPendingPaymentOrdersParams = {}): Promise<{
    data: PendingPaymentOrdersData | null;
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/finance/pending-orders'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getPendingPaymentOrders error:', error);
        return {
            data: null,
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
    }
}

export async function cancelPendingPaymentOrder(
    source: 'PAYMENT_ORDER' | 'WALLET_TRANSACTION',
    itemId: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const payload = reason?.trim() ? { reason: reason.trim() } : {};
        const res = await axios.patch(
            getApiUrl(`/admin/finance/pending-orders/${source}/${itemId}/cancel`),
            payload,
            { headers: getAuthHeader() }
        );
        return {
            success: true,
            message: res.data.message || 'Đã hủy đơn pending',
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi hủy đơn pending',
        };
    }
}

export async function runPreorderReconciliationNow(batchSize?: number): Promise<{
    success: boolean;
    message: string;
    data?: {
        batchSize: number;
        summary: {
            scanned: number;
            fixed: number;
            skipped: number;
            errors: number;
        };
    };
}> {
    try {
        const payload = Number.isFinite(Number(batchSize)) ? { batchSize: Number(batchSize) } : {};
        const res = await axios.post(getApiUrl('/admin/finance/reconciliation/run'), payload, {
            headers: getAuthHeader(),
        });
        return {
            success: true,
            message: res.data.message || 'Đã chạy reconcile',
            data: res.data.data,
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Lỗi khi chạy reconcile thủ công',
        };
    }
}

export async function getFinanceReconciliation(params: DateRangeParams & { page?: number; limit?: number } = {}): Promise<{
    data: FinanceReconciliationData | null;
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/finance/reconciliation'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data,
            pagination: res.data.pagination,
        };
    } catch (error) {
        console.error('getFinanceReconciliation error:', error);
        return {
            data: null,
            pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        };
    }
}

// ==================== Moderator KPI API ====================

export interface ModeratorKpiItem {
    id: string;
    fullName: string;
    email: string;
    status: string;
    queue: {
        openAssigned: number;
        resolvedInRange: number;
        escalatedInRange: number;
        avgResolutionMs: number | null;
    };
}

export interface ModeratorKpiData {
    range: { from: string; to: string };
    moderators: ModeratorKpiItem[];
}

export async function getModeratorKpis(params: DateRangeParams = {}): Promise<ModeratorKpiData | null> {
    try {
        const res = await axios.get(getApiUrl('/admin/moderators/kpis'), {
            headers: getAuthHeader(),
            params,
        });
        return res.data.data;
    } catch (error) {
        console.error('getModeratorKpis error:', error);
        return null;
    }
}

// ==================== VIP Admin API ====================

export interface AdminVipPackage {
    id: string;
    name: string;
    description: string | null;
    durationDays: number;
    price: number;
    targetRole: 'TENANT' | 'LANDLORD' | string;
    isActive: boolean;
    createdAt: string | null;
}

export interface GetAdminVipPackagesParams {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    targetRole?: 'TENANT' | 'LANDLORD';
    search?: string;
}

export interface AdminVipPurchase {
    id: string;
    orderCode: string;
    userId: string;
    amount: number;
    status: string;
    purpose: string;
    packageId: string | null;
    package: AdminVipPackage | null;
    refund: {
        status: string;
        amount: number | null;
        reason: string | null;
        requestedAt: string | null;
        completedAt: string | null;
        requestedBy: string | null;
        refundTxnRef: string | null;
        refundTransactionNo: string | null;
    };
    createdAt: string | null;
    updatedAt: string | null;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        role: string;
        isVip: boolean;
        vipExpiresAt: string | null;
    } | null;
}

export interface GetAdminVipPurchasesParams {
    page?: number;
    limit?: number;
    status?: string;
    refundStatus?: string;
    userId?: string;
    packageId?: string;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
}

export interface AdminVipPurchasesSummary {
    revenueSuccessAmount: number;
    refundSuccessCount: number;
    activeVipUsers: number;
}

export async function getAdminVipPackages(params: GetAdminVipPackagesParams = {}): Promise<{
    data: AdminVipPackage[];
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/vip/packages'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data || [],
            pagination: res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
        };
    } catch (error) {
        console.error('getAdminVipPackages error:', error);
        return {
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        };
    }
}

export async function createAdminVipPackage(payload: {
    name: string;
    durationDays: number;
    price: number;
    description?: string;
    targetRole: 'TENANT' | 'LANDLORD';
    isActive?: boolean;
}): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.post(getApiUrl('/admin/vip/packages'), payload, {
            headers: getAuthHeader(),
        });
        return {
            success: true,
            message: res.data?.message || 'Tạo gói VIP thành công',
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Không thể tạo gói VIP',
        };
    }
}

export async function updateAdminVipPackage(
    packageId: string,
    payload: {
        name?: string;
        durationDays?: number;
        price?: number;
        description?: string | null;
        targetRole?: 'TENANT' | 'LANDLORD';
        isActive?: boolean;
    }
): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(getApiUrl(`/admin/vip/packages/${packageId}`), payload, {
            headers: getAuthHeader(),
        });
        return {
            success: true,
            message: res.data?.message || 'Cập nhật gói VIP thành công',
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Không thể cập nhật gói VIP',
        };
    }
}

export async function getAdminVipPurchases(params: GetAdminVipPurchasesParams = {}): Promise<{
    data: AdminVipPurchase[];
    summary: AdminVipPurchasesSummary;
    pagination: PaginationInfo;
}> {
    try {
        const res = await axios.get(getApiUrl('/admin/vip/purchases'), {
            headers: getAuthHeader(),
            params,
        });
        return {
            data: res.data.data || [],
            summary: res.data.summary || {
                revenueSuccessAmount: 0,
                refundSuccessCount: 0,
                activeVipUsers: 0,
            },
            pagination: res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
    } catch (error) {
        console.error('getAdminVipPurchases error:', error);
        return {
            data: [],
            summary: {
                revenueSuccessAmount: 0,
                refundSuccessCount: 0,
                activeVipUsers: 0,
            },
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
    }
}

export async function refundAdminVipPurchase(
    orderId: string,
    payload: {
        reasonCode: 'CUSTOMER_REQUEST' | 'DUPLICATE_PAYMENT' | 'SYSTEM_ERROR' | 'FRAUD_SUSPECT' | 'OTHER';
        reason: string;
        amount?: number;
        revokeVip?: boolean;
    }
): Promise<{ success: boolean; message: string }> {
    try {
        const res = await axios.patch(getApiUrl(`/admin/vip/purchases/${orderId}/refund`), payload, {
            headers: getAuthHeader(),
        });
        return {
            success: true,
            message: res.data?.message || 'Hoàn tiền thành công',
        };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        return {
            success: false,
            message: err.response?.data?.message || 'Không thể hoàn tiền giao dịch VIP',
        };
    }
}
