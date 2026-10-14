import { useState, useEffect } from 'react';
import { getRoomsAmenitiesRequest } from '@/lib/api';

export interface AmenityOption {
    id: string;
    name: string;
    icon?: string;
}

export function useAmenities() {
    const [list, setList] = useState<AmenityOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getRoomsAmenitiesRequest()
            .then((res) => setList(res.data || []))
            .catch((e) => setError(e?.message || 'Lỗi tải tiện nghi'))
            .finally(() => setLoading(false));
    }, []);

    return { amenities: list, loading, error };
}
