/**
 * Vietnam Provinces Open API – https://provinces.open-api.vn/
 * - v2: After merger 07/2025 (34 provinces). New address = Tỉnh/TP → Phường/Xã (wards).
 * - v1: Old address (63 provinces, quận/huyện) – kept for legacy mapping only.
 */

const V1_BASE = 'https://provinces.open-api.vn/api/v1';
const V2_BASE = 'https://provinces.open-api.vn/api/v2';

export interface ProvinceItem {
    name: string;
    code: number;
    division_type?: string;
    codename?: string;
    phone_code?: number;
}

/** Phường / Xã (ward) – second level in new address (v2). */
export interface WardItem {
    name: string;
    code: number;
    division_type?: string;
    codename?: string;
    short_codename?: string;
}

/** @deprecated Old address used quận/huyện. New address uses phường/xã (WardItem). */
export interface DistrictItem {
    name: string;
    code: number;
    division_type?: string;
    codename?: string;
    province_code?: number;
}

/** v2: 34 provinces (after merger). */
export async function fetchProvincesV2(): Promise<ProvinceItem[]> {
    const res = await fetch(`${V2_BASE}/?depth=1`, { cache: 'default' });
    if (!res.ok) throw new Error('Failed to load provinces');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/** v2 depth=2: 34 provinces with wards (phường/xã). Use for new address second level. */
export async function fetchProvincesWithWardsV2(): Promise<
    Array<{ name: string; code: number; wards: WardItem[] }>
> {
    const res = await fetch(`${V2_BASE}/?depth=2`, { cache: 'default' });
    if (!res.ok) throw new Error('Failed to load wards');
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((p: { name: string; code: number; wards?: WardItem[] }) => ({
        name: p.name,
        code: p.code,
        wards: Array.isArray(p.wards) ? p.wards : [],
    }));
}

/** v1: 63 provinces with districts (quận/huyện). Legacy only. */
export async function fetchProvincesWithDistrictsV1(): Promise<
    Array<{ name: string; code: number; districts: DistrictItem[] }>
> {
    const res = await fetch(`${V1_BASE}/?depth=2`, { cache: 'default' });
    if (!res.ok) throw new Error('Failed to load districts');
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((p: { name: string; code: number; districts?: DistrictItem[] }) => ({
        name: p.name,
        code: p.code,
        districts: Array.isArray(p.districts) ? p.districts : [],
    }));
}

const cache = {
    v2Provinces: null as ProvinceItem[] | null,
    v2ProvincesWithWards: null as Array<{ name: string; code: number; wards: WardItem[] }> | null,
    v1ProvincesWithDistricts: null as Array<{ name: string; code: number; districts: DistrictItem[] }> | null,
};

/** Get 34 provinces (v2, post-merger). Cached. */
export async function getProvincesV2(): Promise<ProvinceItem[]> {
    if (cache.v2Provinces) return cache.v2Provinces;
    cache.v2Provinces = await fetchProvincesV2();
    return cache.v2Provinces;
}

/** Get 34 provinces with wards (phường/xã). Cached. New address second level. */
export async function getProvincesWithWardsV2(): Promise<
    Array<{ name: string; code: number; wards: WardItem[] }>
> {
    if (cache.v2ProvincesWithWards) return cache.v2ProvincesWithWards;
    cache.v2ProvincesWithWards = await fetchProvincesWithWardsV2();
    return cache.v2ProvincesWithWards;
}

/** Wards (phường/xã) for a given province. New address. */
export async function getWardsForProvince(provinceName: string): Promise<WardItem[]> {
    const list = await getProvincesWithWardsV2();
    const normalized = provinceName.trim();
    const found = list.find(
        (p) => p.name === normalized || p.name.replace(/\s+/g, ' ').toLowerCase() === normalized.replace(/\s+/g, ' ').toLowerCase()
    );
    return found ? found.wards : [];
}

/** @deprecated Use getWardsForProvince for new address (phường/xã). */
export async function getDistrictsForProvince(provinceName: string): Promise<DistrictItem[]> {
    if (!cache.v1ProvincesWithDistricts) cache.v1ProvincesWithDistricts = await fetchProvincesWithDistrictsV1();
    const list = cache.v1ProvincesWithDistricts;
    const normalized = provinceName.trim();
    const found = list.find(
        (p) => p.name === normalized || p.name.replace(/\s+/g, ' ').toLowerCase() === normalized.replace(/\s+/g, ' ').toLowerCase()
    );
    return found ? found.districts : [];
}
