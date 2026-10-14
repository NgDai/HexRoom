import { useState, useEffect, useCallback } from 'react';
import {
    getProvincesV2,
    getProvincesWithWardsV2,
    type ProvinceItem,
    type WardItem,
} from '@/lib/provinces-api';

/** New address: v2 = 34 provinces → phường/xã (wards). Use across the app. */
export function useProvinces() {
    const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
    const [wardsByProvinceName, setWardsByProvinceName] = useState<Record<string, WardItem[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // Không cần set đồng bộ ở đây vì đã khởi tạo mặc định trong useState(true) và useState(null)
        Promise.all([getProvincesV2(), getProvincesWithWardsV2()])
            .then(([v2List, v2WithWards]) => {
                if (cancelled) return;
                setProvinces(v2List);
                const map: Record<string, WardItem[]> = {};
                v2WithWards.forEach((p) => {
                    map[p.name] = p.wards || [];
                });
                setWardsByProvinceName(map);
            })
            .catch((e) => {
                if (!cancelled) setError(e?.message || 'Không tải được danh sách địa điểm');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Wards (phường/xã) for the selected province. New address second level. */
    const getWardsFor = useCallback(
        (provinceName: string): WardItem[] => {
            if (!provinceName.trim()) return [];
            const key = provinceName.trim();
            if (wardsByProvinceName[key]) return wardsByProvinceName[key];
            const lower = key.toLowerCase();
            const found = Object.keys(wardsByProvinceName).find(
                (name) => name.toLowerCase() === lower || name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())
            );
            return found ? wardsByProvinceName[found] : [];
        },
        [wardsByProvinceName]
    );

    return {
        provinces,
        getWardsFor,
        loading,
        error,
    };
}
