import type { CreateManagedRoomPostInput, ManagedRoomPostItem } from './types';
import { getAccessToken } from '@/lib/api';

import { getApiUrl } from '@/lib/api-config';

export interface RoomPostApiError extends Error {
    code?: string;
    upgradePath?: string;
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAccessToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(getApiUrl(endpoint), {
        ...options,
        headers,
    });

    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.message || 'API request failed') as RoomPostApiError;
        err.code = data?.code;
        err.upgradePath = data?.upgradePath;
        throw err;
    }
    return data;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export async function listRoomPostsByRentalId(rentalId: string): Promise<ManagedRoomPostItem[]> {
    const response = await apiRequest<ApiResponse<ManagedRoomPostItem[]>>(
        `/rooms?rental_id=${rentalId}&includeAllStatuses=true`
    );
    return response.data || [];
}

export async function listManagedRoomPosts(): Promise<ManagedRoomPostItem[]> {
    const response = await apiRequest<ApiResponse<ManagedRoomPostItem[]>>(
        '/rooms?includeAllStatuses=true'
    );
    return response.data || [];
}

export async function getRoomPostById(_rentalId: string, roomPostId: string): Promise<ManagedRoomPostItem | null> {
    try {
        const response = await apiRequest<ApiResponse<ManagedRoomPostItem>>(`/rooms/${roomPostId}`);
        return response.data || null;
    } catch {
        return null;
    }
}

export async function createRoomPost(payload: CreateManagedRoomPostInput): Promise<ManagedRoomPostItem> {
    const response = await apiRequest<ApiResponse<ManagedRoomPostItem>>('/rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function updateRoomPost(
    roomPostId: string,
    payload: Partial<CreateManagedRoomPostInput> & { resubmit?: boolean }
): Promise<ManagedRoomPostItem | null> {
    try {
        const response = await apiRequest<ApiResponse<ManagedRoomPostItem>>(`/rooms/${roomPostId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        return response.data || null;
    } catch {
        return null;
    }
}

export async function deleteRoomPost(roomPostId: string): Promise<boolean> {
    try {
        await apiRequest<ApiResponse<{ id: string }>>(`/rooms/${roomPostId}`, {
            method: 'DELETE',
        });
        return true;
    } catch {
        return false;
    }
}

export async function moderateRoomPostApi(
    roomPostId: string,
    decision: 'approved' | 'rejected',
    note?: string
): Promise<ManagedRoomPostItem | null> {
    try {
        const response = await apiRequest<ApiResponse<ManagedRoomPostItem>>(`/rooms/${roomPostId}/moderate`, {
            method: 'PUT',
            body: JSON.stringify({ decision, note }),
        });
        return response.data || null;
    } catch {
        return null;
    }
}

export async function fetchAmenities(): Promise<Array<{ id: string; name: string }>> {
    try {
        const response = await apiRequest<ApiResponse<Array<{ id: string; name: string }>>>('/rooms/amenities');
        return response.data || [];
    } catch {
        return [];
    }
}

export interface RoomTenant {
    id: string;
    tenantId: string;
    tenant: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
        avatarUrl?: string;
    };
    startDate: string;
    endDate?: string;
    actualPrice: number;
    deposit: number;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
    type: 'rental';
}

export interface RoomPreorder {
    id: string;
    userId: string;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
        avatarUrl?: string;
    };
    depositAmount: number;
    paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
    refundStatus?: string;
    createdAt: string;
    type: 'preorder';
}

export async function getRoomTenants(
    roomPostId: string
): Promise<{ rentals: RoomTenant[]; preorders: RoomPreorder[] }> {
    try {
        const response = await apiRequest<
            ApiResponse<{
                rentals: RoomTenant[];
                preorders: RoomPreorder[];
            }>
        >(`/rooms/${roomPostId}/tenants`);
        return response.data || { rentals: [], preorders: [] };
    } catch {
        return { rentals: [], preorders: [] };
    }
}

export interface TenantSearchResult {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    gender: string | null;
}

export interface RoomWisher {
    userId: string;
    roomId: string;
    favoritedAt: string | null;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
        avatarUrl?: string;
    };
    hasPriorityPreorder: boolean;
    preorder: {
        id: string;
        status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
        paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
        createdAt: string;
        depositAmount: number;
    } | null;
}

export async function getRoomWishers(roomId: string): Promise<RoomWisher[]> {
    try {
        const response = await apiRequest<ApiResponse<RoomWisher[]>>(
            `/favorites/room/${encodeURIComponent(roomId)}/wishers`
        );
        return response.data || [];
    } catch {
        return [];
    }
}

export async function searchTenants(query: string): Promise<TenantSearchResult[]> {
    const q = encodeURIComponent(query.trim());
    if (!q || q.length < 2) return [];
    try {
        const response = await apiRequest<ApiResponse<TenantSearchResult[]>>(`/rooms/search-tenants?q=${q}`);
        return response.data || [];
    } catch {
        return [];
    }
}

export interface CreateContractInput {
    tenantId: string;
    startDate: string;
    endDate?: string;
    actualPrice: number;
    deposit?: number;
}

export async function createRentalContract(roomId: string, input: CreateContractInput): Promise<{ id: string }> {
    const response = await apiRequest<ApiResponse<{ id: string }>>(`/rooms/${roomId}/contracts`, {
        method: 'POST',
        body: JSON.stringify({
            tenantId: input.tenantId,
            startDate: input.startDate,
            endDate: input.endDate || undefined,
            actualPrice: input.actualPrice,
            deposit: input.deposit ?? 0,
        }),
    });
    return response.data;
}
