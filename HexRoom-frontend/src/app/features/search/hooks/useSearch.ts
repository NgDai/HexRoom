import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Room, SearchCriteria } from '../types';
import { smartSearchRequest, advancedSearchRequest, searchByImageRequest, nearbySearchRequest } from '@/lib/api';
import type { SmartSearchRoomItem } from '@/lib/api';
import { useAuth } from '@/app/context/useAuth';
import { translateBatch } from '@/lib/translate-api';

function normalizeAdminPrefix(value?: string): string | undefined {
    const normalized = (value || '')
        .trim()
        .replace(/^(thành\s*phố|tp\.?|tỉnh)\s+/i, '');
    return normalized || undefined;
}

/** True if text contains Vietnamese diacritics → already Vietnamese. */
function isVietnamese(text: string): boolean {
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
}

/**
 * If the query looks like English (no Vietnamese chars, has letters), translate
 * it to Vietnamese so the AI search embeddings can match correctly.
 * Returns the original string when Vietnamese or translation fails.
 */
async function ensureVietnamese(query: string): Promise<{ text: string; wasTranslated: boolean }> {
    const trimmed = query.trim();
    if (!trimmed || isVietnamese(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
        return { text: trimmed, wasTranslated: false };
    }
    try {
        const [translated] = await translateBatch([trimmed], 'en', 'vi');
        return { text: translated || trimmed, wasTranslated: translated !== trimmed };
    } catch {
        return { text: trimmed, wasTranslated: false };
    }
}

function smartSearchItemToRoom(r: SmartSearchRoomItem): Room {
    const loc = r.location;
    const locationStr = [loc?.district, loc?.city].filter(Boolean).join(', ') || 'N/A';
    return {
        id: r.id,
        title: r.title || r.roomName || 'Phòng trọ',
        location: locationStr,
        price: r.price ?? 0,
        area: r.area ?? 0,
        roomType: (r.roomType as Room['roomType']) || 'apartment',
        amenities: r.amenities ?? [],
        image: r.images?.[0] || '',
        rating: r.rating ?? 0,
        available: r.available ?? true,
        isNearlyAvailable: r.isNearlyAvailable ?? false,
        availableFrom: r.availableFrom ?? null,
        daysUntilAvailable: r.daysUntilAvailable ?? null,
        rentalId: r.rentalId,
        matchScore: r.matchScore,
        otherRoomsInRental: r.otherRoomsInRental,
        distanceKm: (r as unknown as Record<string, unknown>).distanceKm as number | undefined,
        nearbyPOIs: (r as unknown as Record<string, unknown>).nearbyPOIs as Room['nearbyPOIs'],
    };
}

interface UseSearchReturn {
    results: Room[];
    isSearching: boolean;
    hasSearched: boolean;
    searchByText: (criteria: SearchCriteria) => void;
    searchByImage: (imageFile: File, options?: { district?: string; textHint?: string }) => void;
    searchNearby: (lat: number, lng: number, radius?: number) => void;
    resetSearch: () => void;
    imageSearchError: string | null;
    searchError: string | null;
    searchMode: string | null;
    /** When a non-Vietnamese query was auto-translated, this holds the Vietnamese equivalent. */
    translatedQuery: string | null;
}

export function useSearch(isLoggedIn = false): UseSearchReturn {
    const { accessToken } = useAuth();
    const [searchParams] = useSearchParams();
    const [results, setResults] = useState<Room[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [imageSearchError, setImageSearchError] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchMode, setSearchMode] = useState<string | null>(null);
    const [lastCriteria, setLastCriteria] = useState<SearchCriteria | null>(null);
    const [translatedQuery, setTranslatedQuery] = useState<string | null>(null);

    const searchByText = useCallback(async (criteria: SearchCriteria) => {
        setIsSearching(true);
        setHasSearched(false);
        setImageSearchError(null);
        setSearchError(null);
        setSearchMode(null);
        setTranslatedQuery(null);

        // Auto-translate English queries to Vietnamese so the AI embeddings can match
        let queryText = criteria.q?.trim() || '';
        if (queryText) {
            const { text, wasTranslated } = await ensureVietnamese(queryText);
            queryText = text;
            if (wasTranslated) setTranslatedQuery(text);
        }

        const params = {
            q: queryText || undefined,
            city: normalizeAdminPrefix(criteria.city),
            district: normalizeAdminPrefix(criteria.district) || normalizeAdminPrefix(criteria.location),
            address: criteria.address?.trim() || undefined,
            minPrice: criteria.minPrice,
            maxPrice: criteria.maxPrice,
            roomType: criteria.roomType || undefined,
            minArea: criteria.minArea,
            maxArea: criteria.maxArea,
            amenities: criteria.amenities?.length ? criteria.amenities : undefined,
            limit: 500,
            lat: criteria.lat,
            lng: criteria.lng,
        };

        try {
            let res;
            if (isLoggedIn) {
                try {
                    res = await advancedSearchRequest(params, { token: accessToken });
                    setSearchMode((res as { searchMode?: string }).searchMode || 'advanced');
                } catch {
                    // Fallback to public smart search when auth token is stale or advanced search is unavailable.
                    res = await smartSearchRequest(params);
                    setSearchMode('basic');
                    setSearchError('Tìm kiếm nâng cao tạm thời không khả dụng, đã chuyển sang tìm kiếm thường.');
                }
            } else {
                res = await smartSearchRequest(params);
                setSearchMode('basic');
            }
            setResults((res.data || []).map(smartSearchItemToRoom));
            setLastCriteria(criteria);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Lỗi tìm kiếm';
            setSearchError(message);
            setResults([]);
        } finally {
            setIsSearching(false);
            setHasSearched(true);
        }
    }, [isLoggedIn, accessToken]);

    const searchNearby = useCallback(async (lat: number, lng: number, radius?: number) => {
        setIsSearching(true);
        setHasSearched(false);
        setImageSearchError(null);
        setSearchError(null);
        setSearchMode(null);

        try {
            const res = await nearbySearchRequest({ lat, lng, radius, limit: 100 }, { token: accessToken });
            setSearchMode('nearby');
            setResults((res.data || []).map(smartSearchItemToRoom));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Lỗi tìm kiếm gần bạn';
            setSearchError(message);
            setResults([]);
        } finally {
            setIsSearching(false);
            setHasSearched(true);
        }
    }, [accessToken]);

    const searchByImage = useCallback(
        async (imageFile: File, options?: { district?: string; textHint?: string }) => {
            setIsSearching(true);
            setHasSearched(false);
            setImageSearchError(null);
            setSearchError(null);
            setSearchMode(null);
            setTranslatedQuery(null);

            // Translate English text hint to Vietnamese for CLIP multimodal search
            let textHint = options?.textHint?.trim() || '';
            if (textHint) {
                const { text, wasTranslated } = await ensureVietnamese(textHint);
                textHint = text;
                if (wasTranslated) setTranslatedQuery(text);
            }

            // Reuse last advanced criteria so image becomes just one more factor,
            // falling back to district from options if no previous criteria.
            const base = lastCriteria || {};
            const paramsForImage = {
                text_hint: textHint || undefined,
                q: base.q || undefined,
                city: base.city?.trim() || undefined,
                district: (options?.district || base.district || base.location)?.trim() || undefined,
                address: base.address?.trim() || undefined,
                minPrice: base.minPrice,
                maxPrice: base.maxPrice,
                roomType: base.roomType || undefined,
                minArea: base.minArea,
                maxArea: base.maxArea,
                amenities: base.amenities?.length ? base.amenities : undefined,
                lat: base.lat,
                lng: base.lng,
            };

            searchByImageRequest(imageFile, { ...paramsForImage, token: accessToken })
                .then((res) => {
                    const items = res.data || [];
                    setSearchMode(res.searchMode || 'image');
                    setResults(
                        items.map((r) => ({
                            id: r.id,
                            title: r.title,
                            location: r.location
                                ? [r.location.district, r.location.city].filter(Boolean).join(', ')
                                : 'N/A',
                            price: r.price ?? 0,
                            area: (r as { area?: number | null }).area ?? 0,
                            roomType: ((r as { roomType?: Room['roomType'] }).roomType || 'apartment') as Room['roomType'],
                            amenities: (r as { amenities?: string[] }).amenities || [],
                            image: r.images?.[0] || '',
                            rating: (r as { rating?: number | null }).rating ?? 0,
                            available: (r as { available?: boolean }).available ?? true,
                            isNearlyAvailable: (r as { isNearlyAvailable?: boolean }).isNearlyAvailable ?? false,
                            availableFrom: (r as { availableFrom?: string | null }).availableFrom ?? null,
                            daysUntilAvailable: (r as { daysUntilAvailable?: number | null }).daysUntilAvailable ?? null,
                            rentalId: (r as { rentalId?: string }).rentalId || r.id,
                            matchScore: (r as { matchScore?: number }).matchScore,
                            clipSimilarity: (r as { clipSimilarity?: number }).clipSimilarity,
                            otherRoomsInRental: (r as { otherRoomsInRental?: Room['otherRoomsInRental'] }).otherRoomsInRental,
                        }))
                    );
                })
                .catch((err) => {
                    const message = err instanceof Error ? err.message : 'Lỗi tìm kiếm ảnh';
                    setImageSearchError(message);
                    setSearchError(message);
                    setResults([]);
                })
                .finally(() => {
                    setIsSearching(false);
                    setHasSearched(true);
                });
        },
        [accessToken, lastCriteria]
    );

    const resetSearch = useCallback(() => {
        setResults([]);
        setHasSearched(false);
        setImageSearchError(null);
        setSearchError(null);
        setSearchMode(null);
    }, []);

    // Auto-search from URL params (re-runs when auth level resolves or URL changes)
    useEffect(() => {
        const district = searchParams.get('district');
        const city = searchParams.get('city');
        const address = searchParams.get('address');
        const q = searchParams.get('q');
        const location = searchParams.get('location');
        const price = searchParams.get('price');
        const minPriceParam = searchParams.get('minPrice');
        const maxPriceParam = searchParams.get('maxPrice');
        const roomType = searchParams.get('roomType');
        const amenitiesParam = searchParams.get('amenities');
        const minAreaParam = searchParams.get('minArea');
        const maxAreaParam = searchParams.get('maxArea');
        // browse=1 is set by the home page when the user submits without any filters
        // so that an empty search is still triggered and all rooms are shown.
        const browse = searchParams.get('browse');
        if (district || city || address || q || location || price || minPriceParam || maxPriceParam || roomType || amenitiesParam || minAreaParam || maxAreaParam || browse) {
            const criteria: SearchCriteria = {
                q: q || undefined,
                city: normalizeAdminPrefix(city || undefined),
                district: normalizeAdminPrefix(district || undefined),
                address: address || undefined,
                location:
                    normalizeAdminPrefix(district || undefined) ||
                    normalizeAdminPrefix(city || undefined) ||
                    normalizeAdminPrefix(location || undefined),
                roomType: (roomType as SearchCriteria['roomType']) || undefined,
            };
            if (price) {
                const parts = price.split('-').map((s) => (s ? parseInt(s, 10) : undefined));
                if (parts[0] != null) criteria.minPrice = parts[0];
                if (parts[1] != null) criteria.maxPrice = parts[1];
            }
            if (minPriceParam && !Number.isNaN(Number(minPriceParam))) {
                criteria.minPrice = Number(minPriceParam);
            }
            if (maxPriceParam && !Number.isNaN(Number(maxPriceParam))) {
                criteria.maxPrice = Number(maxPriceParam);
            }
            if (amenitiesParam) {
                criteria.amenities = amenitiesParam.split(',').map((s) => s.trim()).filter(Boolean);
            }
            if (minAreaParam && !Number.isNaN(Number(minAreaParam))) criteria.minArea = Number(minAreaParam);
            if (maxAreaParam && !Number.isNaN(Number(maxAreaParam))) criteria.maxArea = Number(maxAreaParam);
            searchByText(criteria);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString(), searchByText]);

    return {
        results,
        isSearching,
        hasSearched,
        searchByText,
        searchByImage,
        searchNearby,
        resetSearch,
        imageSearchError,
        searchError,
        searchMode,
        translatedQuery,
    };
}
