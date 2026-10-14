import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getRecommendRequest } from '@/lib/api';
import { useAuth } from '@/app/context/useAuth';
import { SearchResultCard } from './SearchResultCard';
import type { Room } from '../types';

function recommendItemToRoom(r: {
    id: string;
    rentalId?: string;
    title: string;
    location: { district: string | null; city: string | null } | null;
    images: string[];
    price: number;
    area: number | null;
    amenities?: string[];
    roomStatus?: string;
    available?: boolean;
}): Room {
    return {
        id: r.id,
        title: r.title,
        location: r.location ? [r.location.district, r.location.city].filter(Boolean).join(', ') : 'N/A',
        price: r.price ?? 0,
        area: r.area ?? 0,
        roomType: 'apartment',
        amenities: r.amenities ?? [],
        image: r.images?.[0] || '',
        rating: 0,
        available:
            r.available !== undefined
                ? r.available
                : String(r.roomStatus || '').toUpperCase() === 'AVAILABLE',
        rentalId: r.rentalId || r.id,
    };
}

export function SearchRecommendBlock() {
    const navigate = useNavigate();
    const { accessToken, authVerified } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(!!accessToken);
    const [hint, setHint] = useState<string>('');

    useEffect(() => {
        if (!authVerified || !accessToken) {
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getRecommendRequest({ token: accessToken });
                setRooms((res.data || []).map(recommendItemToRoom));
                setHint(res.hint || '');
            } catch {
                setRooms([]);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [authVerified, accessToken]);

    if (!accessToken || loading || rooms.length === 0) return null;

    return (
        <div className="mb-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                Gợi ý cho bạn
                {hint && <span className="text-sm font-normal text-muted-foreground">({hint})</span>}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.slice(0, 6).map((room) => (
                    <SearchResultCard
                        key={room.id}
                        room={room}
                        onViewDetails={() => navigate(`/rental/${room.rentalId || room.id}`)}
                    />
                ))}
            </div>
        </div>
    );
}
