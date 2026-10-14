import { useContext } from 'react';
import { FavoritesContext } from './favorites-context';
import type { FavoritesContextType } from './favorites-context';

export function useFavorites(): FavoritesContextType {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within FavoritesProvider');
    }
    return context;
}
