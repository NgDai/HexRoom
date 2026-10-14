import { createContext } from 'react';

export interface FavoriteRoom {
    id: string;
    name: string;
    price: number;
    area: number;
    address: string;
    image: string;
    available: boolean;
}

export interface FavoritesContextType {
    favorites: FavoriteRoom[];
    addFavorite: (room: FavoriteRoom) => void;
    removeFavorite: (roomId: string) => void;
    isFavorite: (roomId: string) => boolean;
    isLoading: boolean;
    refreshFavorites: () => Promise<void>;
}

export const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
