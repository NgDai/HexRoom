import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/api';
import { getRecommendRequest } from '@/lib/api';

export interface RecommendedRoom {
    id: string;
    title: string;
    description: string | null;
    price: number;
    area: number | null;
    amenities: string[];
    images: string[];
    location: { district: string | null; city: string | null } | null;
}

export function useRecommendedRooms(options?: { skip?: boolean }) {
    const [rooms, setRooms] = useState<RecommendedRoom[]>([]);
    const [hint, setHint] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getAccessToken().then((token) => {
            if (!token) {
                setIsLoggedIn(false);
                setLoading(false);
                return;
            }
            setIsLoggedIn(true);

            if (options?.skip) {
                return; // Only skip fetching recommendations, keep login state correctly fetched
            }

            getRecommendRequest()
                .then((res) => {
                    if (!cancelled && res.data) {
                        setRooms(
                            res.data.map((room) => ({
                                id: room.id,
                                title: room.title,
                                description:
                                    'description' in room && room.description != null
                                        ? String(room.description)
                                        : null,
                                price: room.price,
                                area: room.area,
                                amenities: room.amenities,
                                images: room.images,
                                location: room.location,
                            }))
                        );
                        setHint(res.hint ?? '');
                    }
                })
                .catch(() => {
                    if (!cancelled) setRooms([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        });
        return () => {
            cancelled = true;
        };
    }, [options?.skip]);

    return { rooms, hint, loading, isLoggedIn };
}
