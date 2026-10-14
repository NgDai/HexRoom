import type { RentalStatus } from '@/lib/models/rental.model';

export type PropertyType = 'boarding_house' | 'apartment' | 'house' | 'studio';

export interface ManagedRentalItem {
    rental_id: string;
    user_id: string;
    title: string;
    summary?: string;
    description?: string;
    city: string;
    district: string;
    address: string;
    property_type: PropertyType;
    available_room: number;
    status: RentalStatus;
    thumbnail_url?: string;
    created_at: string;
}

export interface CreateManagedRentalInput {
    user_id: string;
    title: string;
    summary?: string;
    description?: string;
    city: string;
    district: string;
    address: string;
    property_type: PropertyType;
    available_room: number;
    status: RentalStatus;
    thumbnail_url?: string;
}

export const PROPERTY_TYPE_OPTIONS: Array<{ value: PropertyType; label: string }> = [
    { value: 'boarding_house', label: 'Boarding house' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'studio', label: 'Studio' },
];

export const RENTAL_STATUS_OPTIONS: Array<{ value: RentalStatus; label: string }> = [
    { value: 'AVAILABLE', label: 'Còn phòng' },
    { value: 'UNAVAILABLE', label: 'Hết phòng' },
    { value: 'HIDDEN', label: 'Đang ẩn' },
    { value: 'VIOLATE', label: 'Vi phạm' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'SUSPEND', label: 'Tạm ngưng' },
];
