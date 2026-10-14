import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ArrowUpDown, RotateCcw } from 'lucide-react';
import type { Room, SortOption } from '../types';
import { SORT_OPTIONS } from '../constants';
import { sortRooms } from '../utils';
import { SearchResultCard } from './SearchResultCard';
import { useFavorites } from '@/app/context/useFavorites';

interface SearchResultsProps {
    results: Room[];
    isSearching: boolean;
    hasSearched: boolean;
    searchError?: string | null;
    onReset?: () => void;
}

export function SearchResults({ results, isSearching, hasSearched, searchError = null, onReset }: SearchResultsProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [sortBy, setSortBy] = useState<SortOption>('relevant');
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();

    const sortedResults = useMemo(() => sortRooms(results, sortBy), [results, sortBy]);

    const toggleFavorite = (roomId: string) => {
        const room = results.find((r) => r.id === roomId);
        if (!room) return;

        if (isFavorite(roomId)) {
            removeFavorite(roomId);
        } else {
            addFavorite({
                id: room.id,
                name: room.title,
                price: room.price,
                area: room.area,
                address: room.location,
                image: room.image,
                available: room.available,
            });
        }
    };

    const handleViewDetails = (roomId: string) => {
        const room = results.find((r) => r.id === roomId);
        if (room?.rentalId) {
            navigate(`/rental/${room.rentalId}`);
        } else if (room) {
            navigate(`/room/${room.id}`);
        }
    };

    // Loading state
    if (isSearching) {
        return (
            <div className="mt-12 text-center py-12">
                <div className="inline-flex items-center gap-3 text-primary">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="font-medium">{t('search.searching')}</span>
                </div>
            </div>
        );
    }

    // Not searched yet
    if (!hasSearched) {
        return null;
    }

    // Empty state
    if (results.length === 0) {
        return (
            <div className="mt-12">
                <div className="bg-card rounded-2xl shadow-lg p-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                            <Search className="w-10 h-10 text-foreground/40" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('search.results.noResults')}
                            </h3>
                            <p className="text-foreground/60 max-w-md">
                                {t('search.results.noResultsHint')}
                            </p>
                            {searchError && (
                                <p className="text-destructive text-sm max-w-md">
                                    {searchError}
                                </p>
                            )}
                        </div>
                        {onReset && (
                            <button
                                onClick={onReset}
                                className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-all flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                {t('search.results.tryOther')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-12 space-y-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{t('search.results.title')}</h2>
                    <p className="text-foreground/60 mt-1">
                        {t('search.results.found', { count: results.length })}
                    </p>
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-foreground/50" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {t(opt.labelKey)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedResults.map((room) => (
                    <SearchResultCard
                        key={room.id}
                        room={room}
                        isFavorite={isFavorite(room.id)}
                        onToggleFavorite={toggleFavorite}
                        onViewDetails={handleViewDetails}
                    />
                ))}
            </div>
        </div>
    );
}
