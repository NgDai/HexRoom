/**
 * Builds search URL query string from filters.
 * Single responsibility: URL construction logic.
 */

export interface SearchFilters {
    city?: string;
    district?: string;
    address?: string;
    priceRange?: string;
    roomType?: string;
    amenities?: string[];
    minArea?: number;
    maxArea?: number;
}

/** Parses price range string (e.g. "3-5", "8+", "0-3000000") to min/max values in VND. */
function parsePriceRange(priceRange: string): { min: number; max?: number } | null {
    if (!priceRange?.trim()) return null;
    const [minStr, maxStr] = priceRange.split('-').map((s) => s?.trim());
    const parseMoneyToken = (token?: string): number | undefined => {
        if (!token) return undefined;
        const parsed = parseInt(token, 10);
        if (Number.isNaN(parsed)) return undefined;
        // Home page options are in millions (e.g. "3-5"), but URL can already be raw VND.
        return parsed < 1_000 ? parsed * 1_000_000 : parsed;
    };
    const minVal = parseMoneyToken(minStr) ?? 0;
    const maxVal = maxStr === '+' ? undefined : parseMoneyToken(maxStr);
    return { min: minVal, max: maxVal };
}

/**
 * Builds URLSearchParams from search query and filters.
 * @returns Search params string (without leading '?')
 */
export function buildSearchParams(query: string, filters: SearchFilters): string {
    const params = new URLSearchParams();

    if (query) params.set('q', query);
    if (filters.city) params.set('city', filters.city);
    if (filters.district) params.set('district', filters.district);
    if (filters.address?.trim()) params.set('address', filters.address.trim());

    if (filters.priceRange) {
        const parsed = parsePriceRange(filters.priceRange);
        if (parsed) {
            // Keep legacy `price` for backward compatibility, but add explicit min/max for safer parsing.
            params.set('price', parsed.max != null ? `${parsed.min}-${parsed.max}` : String(parsed.min));
            params.set('minPrice', String(parsed.min));
            if (parsed.max != null) {
                params.set('maxPrice', String(parsed.max));
            }
        }
    }

    if (filters.roomType) params.set('roomType', filters.roomType);
    if (filters.amenities?.length) params.set('amenities', filters.amenities.join(','));
    if (filters.minArea != null) params.set('minArea', String(filters.minArea));
    if (filters.maxArea != null) params.set('maxArea', String(filters.maxArea));

    return params.toString();
}

/** Builds full search URL path (e.g. /search?q=...&city=...) */
export function buildSearchUrl(query: string, filters: SearchFilters): string {
    const qs = buildSearchParams(query, filters);
    return `/search${qs ? `?${qs}` : ''}`;
}
