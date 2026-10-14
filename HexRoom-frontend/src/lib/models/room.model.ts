export type RoomStatus = 'PENDING' | 'AVAILABLE' | 'RENTED' | 'MAINTENANCE';

export interface Room {
    room_id: string;
    rental_id: string;
    title: string;
    description?: string;
    price: number;
    area?: number;
    max_occupants: number;
    status: RoomStatus;
    isNearlyAvailable?: boolean;
    availableFrom?: string | null;
    daysUntilAvailable?: number | null;
    created_at: Date | string;
}

export interface CreateRoomDTO {
    rental_id: string;
    title: string;
    description?: string;
    price: number;
    area?: number;
    max_occupants?: number;
    status?: RoomStatus;
}

export interface UpdateRoomDTO {
    title?: string;
    description?: string;
    price?: number;
    area?: number;
    max_occupants?: number;
    status?: RoomStatus;
}

export interface RoomWithRelations extends Room {
    rental?: {
        rental_id: string;
        title: string;
    };
    images?: {
        image_id: string;
        image_url: string;
    }[];
    amenities?: {
        amenity_id: string;
        name: string;
        icon?: string;
    }[];
    compare?: {
        area_avg_price: number;
        price_diff_percent: number;
        price_level: string;
    };
}
