import { useState, useEffect, useCallback } from 'react';
import { getPublicRentalsRequest, type PublicRental } from '@/lib/api';

const HANOI_BOUNDS = { latMin: 20.8, latMax: 21.2, lngMin: 105.6, lngMax: 106.0 };

const CACHE_TTL_MS = 60_000; // 1 minute
const homeCache: { key: string; data: PublicRental[]; ts: number } = { key: '', data: [], ts: 0 };

function cacheKey(opts: { district?: string; city?: string; limit?: number }) {
    return `limit=${opts.limit ?? 20}&district=${opts.district ?? ''}&city=${opts.city ?? ''}`;
}

/** Get distinct locations (district, city) from rentals */
export function getDistinctLocations(rentals: PublicRental[]): { district: string; city: string }[] {
    const set = new Set<string>();
    const out: { district: string; city: string }[] = [];
    rentals.forEach((r) => {
        const d = r.location?.district?.trim() || '';
        const c = r.location?.city?.trim() || '';
        if (d || c) {
            const key = `${d}|${c}`;
            if (!set.has(key)) {
                set.add(key);
                out.push({ district: d || 'N/A', city: c || 'N/A' });
            }
        }
    });
    return out;
}

/** Pick 3 locations. If user in Hanoi, use first 3; otherwise spread evenly across the list. */
export function pickThreeLocations(
    locations: { district: string; city: string }[],
    userInHanoi: boolean
): { district: string; city: string }[] {
    if (locations.length <= 3) return locations;
    if (userInHanoi) return locations.slice(0, 3);
    const step = Math.floor(locations.length / 3);
    return [locations[0], locations[step], locations[step * 2]];
}

export function usePublicRentals(options?: { district?: string; city?: string; limit?: number }) {
    const [rentals, setRentals] = useState<PublicRental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRentals = useCallback(async (params?: { district?: string; city?: string; limit?: number }) => {
        const key = cacheKey(params ?? {});
        const now = Date.now();
        if (homeCache.key === key && now - homeCache.ts < CACHE_TTL_MS) {
            setRentals(homeCache.data);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getPublicRentalsRequest({
                limit: params?.limit ?? 50,
                district: params?.district,
                city: params?.city,
            });
            const data = res.data || [];
            homeCache.key = key;
            homeCache.data = data;
            homeCache.ts = Date.now();
            setRentals(data);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Lỗi tải dữ liệu';
            console.error('[usePublicRentals]', msg, e);
            setError(msg);
            setRentals([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const district = options?.district;
    const city = options?.city;
    const limit = options?.limit ?? 20;

    useEffect(() => {
        fetchRentals({ district, city, limit });
    }, [district, city, limit, fetchRentals]);

    return { rentals, loading, error, refetch: fetchRentals };
}

export function useUserInHanoi(): { inHanoi: boolean; loading: boolean } {
    const [inHanoi, setInHanoi] = useState(false);
    const [loading, setLoading] = useState(() => typeof navigator !== 'undefined' && !!navigator.geolocation);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                const inBounds =
                    lat >= HANOI_BOUNDS.latMin &&
                    lat <= HANOI_BOUNDS.latMax &&
                    lng >= HANOI_BOUNDS.lngMin &&
                    lng <= HANOI_BOUNDS.lngMax;
                setInHanoi(inBounds);
                setLoading(false);
            },
            () => {
                setLoading(false);
            },
            { timeout: 5000, maximumAge: 300000 }
        );
    }, []);

    return { inHanoi, loading };
}
