import { useMemo } from 'react';
import type { PublicRental } from '@/lib/api';

export interface PopularArea {
    district: string;
    city: string;
    count: number;
    image: string;
}

/** Aggregates rentals by district/city into top N popular areas. */
export function usePopularAreas(rentals: PublicRental[], limit = 4): PopularArea[] {
    return useMemo(() => {
        const count: Record<string, PopularArea> = {};

        rentals.forEach((r) => {
            const d = r.location?.district?.trim() || 'N/A';
            const c = r.location?.city?.trim() || 'N/A';
            const key = `${d}|${c}`;

            if (!count[key]) {
                count[key] = { district: d, city: c, count: 0, image: r.images?.[0] || '' };
            }
            count[key].count += 1;
        });

        return Object.values(count)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }, [rentals, limit]);
}
