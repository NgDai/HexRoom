import type { PublicRoomItem } from '@/lib/api';
import type { FavoriteRoom } from '@/app/context/favorites-context';

/** Map catalog / GET /rooms item to favorites payload (heart on listing cards). */
export function mapPublicRoomToFavorite(
    room: PublicRoomItem,
    displayName: string,
    locationStr: string
): FavoriteRoom {
    const addr = room.rental?.location?.address?.trim();
    return {
        id: room.id,
        name: displayName,
        price: room.price,
        area: room.sizeM2 ?? room.area ?? 0,
        address: addr || locationStr,
        image: room.images?.[0] || '',
        available: String(room.status || '').toUpperCase() === 'AVAILABLE',
    };
}
