export type PriceLevel = 'low' | 'average' | 'high';

export interface RoomCompare {
    recommendation_id: string;
    room_id: string;
    area_avg_price?: number;
    price_diff_percent?: number;
    price_level?: PriceLevel;
    updated_at: Date | string;
}

export interface CreateRoomCompareDTO {
    room_id: string;
    area_avg_price?: number;
    price_diff_percent?: number;
    price_level?: PriceLevel;
}

export interface UpdateRoomCompareDTO {
    area_avg_price?: number;
    price_diff_percent?: number;
    price_level?: PriceLevel;
}
