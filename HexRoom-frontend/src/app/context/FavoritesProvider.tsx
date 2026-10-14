import React, { useState, useEffect, useCallback } from 'react';
import { getMyFavoritesRequest, addFavoriteRequest, removeFavoriteRequest } from '@/lib/api';
import { useAuth } from './useAuth';
import { FavoritesContext } from './favorites-context';
import type { FavoriteRoom } from './favorites-context';

function mapApiRoomToFavorite(api: {
    id: string;
    title?: string;
    roomName?: string | null;
    price: number;
    area?: number | null;
    address?: string;
    images?: string[];
    available?: boolean;
}): FavoriteRoom {
    return {
        id: api.id,
        name: api.title || api.roomName || 'Phòng trọ',
        price: api.price,
        area: api.area ?? 0,
        address: api.address ?? '',
        image: api.images?.[0] ?? '',
        available: api.available ?? true,
    };
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const { accessToken, authVerified } = useAuth();
    const [favorites, setFavorites] = useState<FavoriteRoom[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const refreshFavorites = useCallback(async () => {
        if (!authVerified || !accessToken) {
            // Guest: load from localStorage
            const stored = localStorage.getItem('favoriteRooms');
            if (stored) {
                try { setFavorites(JSON.parse(stored)); } catch { setFavorites([]); }
            } else {
                setFavorites([]);
            }
            setIsLoaded(true);
            return;
        }
        setIsLoading(true);
        try {
            const res = await getMyFavoritesRequest({ token: accessToken });
            const list = (res.data || []).map(mapApiRoomToFavorite);
            setFavorites(list);
            // Wipe stale guest favorites so they never bleed into the logged-in view
            localStorage.removeItem('favoriteRooms');
        } catch {
            // Don't fall back to potentially stale localStorage when logged in
            setFavorites([]);
        } finally {
            setIsLoading(false);
            setIsLoaded(true);
        }
    }, [authVerified, accessToken]);

    useEffect(() => {
        refreshFavorites();
    }, [refreshFavorites]);

    useEffect(() => {
        if (!isLoaded) return;
        if (!accessToken) {
            localStorage.setItem('favoriteRooms', JSON.stringify(favorites));
        }
    }, [favorites, isLoaded, accessToken]);

    const addFavorite = useCallback(
        async (room: FavoriteRoom) => {
            setFavorites((prev) => {
                if (prev.some((r) => r.id === room.id)) return prev;
                return [...prev, room];
            });
            if (accessToken) {
                try {
                    await addFavoriteRequest(room.id, { token: accessToken });
                    await refreshFavorites();
                } catch {
                    setFavorites((prev) => prev.filter((r) => r.id !== room.id));
                }
            }
        },
        [accessToken, refreshFavorites]
    );

    const removeFavorite = useCallback(
        async (roomId: string) => {
            setFavorites((prev) => prev.filter((room) => room.id !== roomId));
            if (accessToken) {
                try {
                    await removeFavoriteRequest(roomId, { token: accessToken });
                } catch {
                    await refreshFavorites();
                }
            }
        },
        [accessToken, refreshFavorites]
    );

    const isFavorite = useCallback(
        (roomId: string): boolean => {
            return favorites.some((room) => room.id === roomId);
        },
        [favorites]
    );

    return (
        <FavoritesContext.Provider
            value={{
                favorites,
                addFavorite,
                removeFavorite,
                isFavorite,
                isLoading,
                refreshFavorites,
            }}
        >
            {children}
        </FavoritesContext.Provider>
    );
}
