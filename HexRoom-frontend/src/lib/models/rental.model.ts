export const RENTAL_STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'HIDDEN', 'VIOLATE', 'PENDING', 'SUSPEND'] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];

export interface Rental {
    rental_id: string;
    user_id: string;
    location_id?: string;
    title: string;
    description?: string;
    summary?: string;
    available_room: number;
    status: RentalStatus;
    created_at: Date | string;
}

export interface CreateRentalDTO {
    user_id: string;
    location_id?: string;
    title: string;
    description?: string;
    summary?: string;
    available_room?: number;
    status?: RentalStatus;
}

export interface UpdateRentalDTO {
    location_id?: string;
    title?: string;
    description?: string;
    summary?: string;
    available_room?: number;
    status?: RentalStatus;
}

export interface RentalWithRelations extends Rental {
    owner?: {
        user_id: string;
        full_name: string;
        avatar_url?: string;
    };
    location?: {
        location_id: string;
        address: string;
        district?: string;
        city: string;
    };
    rooms?: {
        room_id: string;
        title: string;
        price: number;
        area: number;
    }[];
}
