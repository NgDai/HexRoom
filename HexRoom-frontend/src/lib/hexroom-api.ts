import { getApiUrl } from './api-config';
import { authFetch, getStoredToken } from './api';
export interface RoomCosts {
    deposit?: number | null; electricityPerKwh?: number | null; waterPerM3?: number | null;
    internetMonthly?: number | null; parkingMonthly?: number | null; serviceMonthly?: number | null;
    paymentCycleMonths?: number | null; houseRules?: string | null; feeNotes?: string | null;
}
export interface ApiRoom {
    id: string; rentalId: string; roomName: string; rentalTitle: string; description: string;
    price: number; sizeM2: number | null; maxPeople: number; roomType: string; status: string;
    address: string; district: string; city: string; images: string[]; amenities: string[];
    costs: RoomCosts | null; availabilityConfirmedAt: string | null; createdAt: string;
}
export interface Page<T> { items: T[]; page: number; limit: number; total: number; totalPages: number; }
export interface Inspection {
    id: string; category: string; result: string; currentResult: string; inspectedOn: string;
    validUntil: string | null; method: string; findings: string; evidenceImages: string[]; recordedAt: string;
}
export const inspectionCategories: Record<string, string> = {
    CONDITION: 'Hiện trạng phòng', PRICE_AND_FEES: 'Giá và phụ phí', IMAGES: 'Hình ảnh', RENTAL_RIGHTS: 'Quyền cho thuê',
};
export const inspectionStatuses: Record<string, string> = {
    CHECKED: 'Đã đối chiếu', NOT_CHECKED: 'Chưa đối chiếu', NEEDS_UPDATE: 'Cần cập nhật',
    UNDER_REVIEW: 'Đang xem xét phản ánh', DISCREPANCY_CONFIRMED: 'Đã xác nhận sai lệch',
};
export const money = (value?: number | null) => value == null ? 'Chưa cung cấp' : Number(value).toLocaleString('vi-VN') + ' đ';
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = getStoredToken() ? await authFetch(path, options)
        : await fetch(getApiUrl(path), { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
        const details = body?.errors ? Object.values(body.errors).join('. ') : '';
        throw new Error(details || body?.message || 'Không thể kết nối. Vui lòng thử lại.');
    }
    return body.data as T;
}
