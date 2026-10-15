import type { PublicRoomItem } from './api';
import type { ApiRoom } from './hexroom-api';
export function adaptRoom(room: ApiRoom): PublicRoomItem {
    return { ...room, district: room.district, city: room.city, address: room.address, amenities: (room.amenities ?? []).map(name => ({ id: name, name })),
        rental: { id: room.rentalId, title: room.rentalTitle, status: 'AVAILABLE',
            location: { address: room.address, district: room.district, city: room.city } } };
}
