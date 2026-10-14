import { getAccessToken } from '@/lib/api';
import { getApiUrl } from '@/lib/api-config';

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
        throw new Error(data?.message || 'API request failed');
    }
    return data;
}

export interface RentalRequest {
    id: string;
    userId: string;
    roomId: string;
    sourceType?: 'PREORDER' | 'FAVORITE';
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
    paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
    depositAmount: number;
    createdAt: string;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
        avatarUrl?: string;
    };
    room: {
        id: string;
        room_name?: string;
        price: number;
    };
    rental: {
        id: string;
        title: string;
    };
}

export async function createRentalRequest(newRequest: RentalRequest): Promise<void> {
    const localRaw = localStorage.getItem('hexroom_landlord_requests');
    const list: RentalRequest[] = localRaw ? JSON.parse(localRaw) : [];
    localStorage.setItem('hexroom_landlord_requests', JSON.stringify([newRequest, ...list]));
}

export async function getLandlordRentalRequests(
    status?: string,
    search?: string,
    page = 1,
    limit = 20
): Promise<RentalRequest[]> {
    let serverData: RentalRequest[] = [];
    try {
        const params = new URLSearchParams();
        if (status && status !== 'all') params.append('status', status);
        if (search) params.append('search', search);
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const response = await apiRequest<{ success: boolean; data: RentalRequest[] }>(
            `/preorders/landlord?${params.toString()}`
        );
        serverData = response.data || [];
    } catch {
        // Fallback gracefully to local storage
    }

    const localRaw = localStorage.getItem('hexroom_landlord_requests');
    const localList: RentalRequest[] = localRaw ? JSON.parse(localRaw) : [];

    // Merge by unique ID
    const map = new Map<string, RentalRequest>();
    localList.forEach(item => map.set(item.id, item));
    serverData.forEach(item => map.set(item.id, item));
    let combined = Array.from(map.values());

    if (status && status !== 'all') {
        combined = combined.filter(r => r.status === status);
    }
    if (search) {
        const q = search.toLowerCase();
        combined = combined.filter(r =>
            (r.user?.fullName?.toLowerCase().includes(q)) ||
            (r.room?.room_name?.toLowerCase().includes(q)) ||
            (r.rental?.title?.toLowerCase().includes(q))
        );
    }
    return combined;
}

export async function confirmRentalRequest(preorderId: string): Promise<boolean> {
    try {
        await apiRequest<{ success: boolean }>(
            `/preorders/${preorderId}/confirm`,
            { method: 'PATCH' }
        );
    } catch {
        // Fallback for local
    }

    const localRaw = localStorage.getItem('hexroom_landlord_requests');
    if (localRaw) {
        const list: RentalRequest[] = JSON.parse(localRaw);
        const updated = list.map(item => item.id === preorderId ? { ...item, status: 'CONFIRMED' as const } : item);
        localStorage.setItem('hexroom_landlord_requests', JSON.stringify(updated));
    }
    return true;
}

export async function rejectRentalRequest(preorderId: string, reason?: string): Promise<boolean> {
    try {
        await apiRequest<{ success: boolean }>(
            `/preorders/${preorderId}/reject`,
            {
                method: 'PATCH',
                body: JSON.stringify({ reason }),
            }
        );
    } catch {
        // Fallback for local
    }

    const localRaw = localStorage.getItem('hexroom_landlord_requests');
    if (localRaw) {
        const list: RentalRequest[] = JSON.parse(localRaw);
        const updated = list.map(item => item.id === preorderId ? { ...item, status: 'CANCELLED' as const } : item);
        localStorage.setItem('hexroom_landlord_requests', JSON.stringify(updated));
    }
    return true;
}
