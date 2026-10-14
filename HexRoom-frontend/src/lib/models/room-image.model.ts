export interface RoomImage {
    image_id: string;
    room_id: string;
    image_url: string;
}

export interface CreateRoomImageDTO {
    room_id: string;
    image_url: string;
}
