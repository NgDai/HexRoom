import type { RoomStatus } from '@/lib/models/room.model';

export interface ManagedRoomPostItem {
    room_post_id: string;
    rental_id: string;
    title: string;
    description?: string;
    price: number;
    area: number;
    max_occupants: number;
    status: RoomStatus;
    moderation_status?: import('@/app/features/moderator/shared/types').ModerationDecision;
    thumbnail_url?: string;
    images?: string[];
    amenities?: Array<{ id: string; name: string }>;
    created_at: string;
}

export interface CreateManagedRoomPostInput {
    rental_id: string;
    title: string;
    description?: string;
    price: number;
    area: number;
    max_occupants: number;
    status?: RoomStatus;
    thumbnail_url?: string;
    images?: string[];
    amenityIds?: string[];
}

export const ROOM_POST_STATUS_OPTIONS: Array<{ value: RoomStatus; label: string }> = [
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'AVAILABLE', label: 'Còn phòng' },
    { value: 'RENTED', label: 'Đã cho thuê' },
    { value: 'MAINTENANCE', label: 'Bảo trì' },
];
