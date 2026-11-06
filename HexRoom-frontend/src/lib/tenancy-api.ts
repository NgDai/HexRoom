import { authFetch } from '@/lib/api';

export type ContractStatus =
    | 'DRAFT'
    | 'PENDING_TENANT'
    | 'PENDING_LANDLORD'
    | 'ACTIVE'
    | 'REJECTED'
    | 'CANCELLED'
    | 'ENDED';

export type InvoiceStatus = 'ISSUED' | 'TENANT_CONFIRMED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Contract {
    id: string;
    contractCode: string;
    status: ContractStatus;
    roomId: string;
    roomName: string | null;
    roomType: string | null;
    rentalId: string | null;
    rentalTitle: string | null;
    address: string | null;
    district: string | null;
    city: string | null;
    roomImageUrl: string | null;
    tenantId: string;
    tenantName: string | null;
    tenantEmail: string | null;
    tenantPhone: string | null;
    tenantAvatarUrl: string | null;
    landlordId: string;
    landlordName: string | null;
    landlordEmail: string | null;
    landlordPhone: string | null;
    landlordAvatarUrl: string | null;
    startDate: string;
    endDate: string | null;
    monthlyRent: number;
    depositAmount: number;
    paymentCycleMonths: number;
    billingDay: number;
    depositPaid: boolean;
    houseRules: string | null;
    extraTerms: string | null;
    tenantNote: string | null;
    landlordNote: string | null;
    tenantConfirmedAt: string | null;
    landlordConfirmedAt: string | null;
    activatedAt: string | null;
    endedAt: string | null;
    endReason: string | null;
    createdAt: string;
    roomLabel: string | null;
    daysUntilEnd: number | null;
    outstandingAmount: number;
    unpaidInvoiceCount: number;
}

export interface InvoiceItem {
    id: string;
    serviceId: string | null;
    name: string;
    category: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    amount: number;
}

export interface Invoice {
    id: string;
    invoiceCode: string;
    contractId: string;
    contractCode: string;
    roomId: string | null;
    roomName: string | null;
    tenantName: string | null;
    landlordName: string | null;
    billingMonth: number;
    billingYear: number;
    roomAmount: number;
    serviceAmount: number;
    otherAmount: number;
    totalAmount: number;
    status: InvoiceStatus;
    dueDate: string | null;
    note: string | null;
    paymentMethod: string | null;
    tenantConfirmedAt: string | null;
    paidAt: string | null;
    createdAt: string;
    items: InvoiceItem[];
}

export interface RoomServiceItem {
    id: string;
    roomId: string;
    name: string;
    category: string | null;
    unitPrice: number | null;
    unit: string | null;
    description: string | null;
    active: boolean;
    subscribed: boolean;
    subscriptionId: string | null;
}

export interface TenantLookup {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    gender: string | null;
}

interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await authFetch(path, init);
    let payload: ApiEnvelope<T> | null = null;
    try {
        payload = (await res.json()) as ApiEnvelope<T>;
    } catch {
        payload = null;
    }
    if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || `Yêu cầu thất bại (${res.status})`);
    }
    return payload.data;
}

const json = (body: unknown): RequestInit => ({
    method: 'POST',
    body: JSON.stringify(body ?? {}),
});

// ------------------------------------------------------------------ contracts

export const listMyContracts = () => request<Contract[]>('/tenancy/contracts/mine');

export const listMyRooms = () => request<Contract[]>('/tenancy/contracts/my-rooms');

export const listLandlordContracts = () => request<Contract[]>('/tenancy/contracts/landlord');

export const getContract = (id: string) => request<Contract>(`/tenancy/contracts/${id}`);

export const createContract = (body: {
    roomId: string;
    tenantId: string;
    startDate: string;
    endDate?: string;
    monthlyRent: number;
    depositAmount?: number;
    paymentCycleMonths?: number;
    billingDay?: number;
    houseRules?: string;
    extraTerms?: string;
    landlordNote?: string;
}) => request<Contract>('/tenancy/contracts', json(body));

export const tenantConfirmContract = (id: string, note?: string) =>
    request<Contract>(`/tenancy/contracts/${id}/tenant-confirm`, json({ note }));

export const tenantRejectContract = (id: string, note?: string) =>
    request<Contract>(`/tenancy/contracts/${id}/tenant-reject`, json({ note }));

export const landlordConfirmContract = (id: string, depositReceived: boolean, note?: string) =>
    request<Contract>(`/tenancy/contracts/${id}/landlord-confirm`, json({ depositReceived, note }));

export const endContract = (id: string, note?: string) =>
    request<Contract>(`/tenancy/contracts/${id}/end`, json({ note }));

export const searchTenants = (q: string) =>
    request<TenantLookup[]>(`/tenancy/contracts/search-tenants?q=${encodeURIComponent(q)}`);

// ------------------------------------------------------------------- invoices

export const listMyInvoices = () => request<Invoice[]>('/tenancy/invoices/mine');

export const listLandlordInvoices = () => request<Invoice[]>('/tenancy/invoices/landlord');

export const listContractInvoices = (contractId: string) =>
    request<Invoice[]>(`/tenancy/invoices/contract/${contractId}`);

export const createInvoice = (
    contractId: string,
    body: {
        billingMonth: number;
        billingYear: number;
        dueDate?: string;
        note?: string;
        otherAmount?: number;
        items?: { serviceId: string; quantity?: number; unitPrice?: number }[];
    },
) => request<Invoice>(`/tenancy/invoices/contract/${contractId}`, json(body));

export const tenantConfirmInvoice = (id: string, paymentMethod?: string, note?: string) =>
    request<Invoice>(`/tenancy/invoices/${id}/tenant-confirm`, json({ paymentMethod, note }));

export const landlordConfirmInvoice = (id: string, allowWithoutTenantConfirm = false) =>
    request<Invoice>(
        `/tenancy/invoices/${id}/landlord-confirm?allowWithoutTenantConfirm=${allowWithoutTenantConfirm}`,
        { method: 'POST' },
    );

export const cancelInvoice = (id: string, note?: string) =>
    request<Invoice>(`/tenancy/invoices/${id}/cancel`, json({ note }));

// ------------------------------------------------------------------- services

export const listRoomServices = (roomId: string) =>
    request<RoomServiceItem[]>(`/tenancy/rooms/${roomId}/services`);

export const listContractServices = (contractId: string) =>
    request<RoomServiceItem[]>(`/tenancy/contracts/${contractId}/services`);

export const setServiceSubscription = (contractId: string, serviceId: string, subscribed: boolean) =>
    request<RoomServiceItem>(
        `/tenancy/contracts/${contractId}/services/${serviceId}/subscribe`,
        json({ subscribed }),
    );

export const createRoomService = (
    roomId: string,
    body: { name: string; category?: string; unitPrice?: number; unit?: string; description?: string },
) => request<RoomServiceItem>(`/tenancy/rooms/${roomId}/services`, json(body));

export const updateRoomService = (
    serviceId: string,
    body: { name: string; category?: string; unitPrice?: number; unit?: string; description?: string; active?: boolean },
) =>
    request<RoomServiceItem>(`/tenancy/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

export const deleteRoomService = (serviceId: string) =>
    request<void>(`/tenancy/services/${serviceId}`, { method: 'DELETE' });

// --------------------------------------------------------- landlord rooms

export interface ManagedRoomOption {
    id: string;
    label: string;
    price: number;
    status: string;
}

/** Phòng do chủ trọ quản lý, dùng cho dropdown lập hợp đồng. */
export async function listManageableRooms(): Promise<ManagedRoomOption[]> {
    type ManagedRoom = { id: string; roomName: string | null; price: number; status: string };
    type Page = { items: ManagedRoom[]; hasNext: boolean };
    const all: ManagedRoom[] = [];
    for (let page = 1; page <= 10; page += 1) {
        const res = await request<Page>(`/rooms/manage?all=false&page=${page}`);
        all.push(...(res.items ?? []));
        if (!res.hasNext) break;
    }
    return all
        .filter((r) => r.status !== 'RENTED')
        .map((r) => ({
            id: r.id,
            label: r.roomName?.trim() || 'Phòng chưa đặt tên',
            price: Number(r.price) || 0,
            status: r.status,
        }));
}
