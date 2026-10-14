export interface FavoriteRoom {
    favorite_id: string;
    user_id: string;
    room_id: string;
    created_at: Date | string;
}

export interface CreateFavoriteRoomDTO {
    user_id: string;
    room_id: string;
}

export interface FavoriteRoomWithRoom extends FavoriteRoom {
    room?: {
        room_id: string;
        title: string;
        price: number;
        area?: number;
        status: string;
        images?: {
            image_id: string;
            image_url: string;
        }[];
    };
}
