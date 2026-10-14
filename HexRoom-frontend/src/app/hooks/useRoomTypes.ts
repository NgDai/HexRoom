import { useState, useEffect } from 'react';
import { getPublicRoomTypesRequest } from '@/lib/api';

export function useRoomTypes() {
    const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getPublicRoomTypesRequest()
            .then((res) => setOptions(res.data || []))
            .catch((e) => setError(e?.message || 'Lỗi tải loại phòng'))
            .finally(() => setLoading(false));
    }, []);

    return { options, loading, error };
}
