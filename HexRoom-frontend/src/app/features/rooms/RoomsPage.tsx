import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    MapPin, Camera, Search, SlidersHorizontal, ShieldCheck,
    CheckCircle2, Clock, AlertTriangle, Check, Users, Sparkles,
    ChevronRight, Zap, Phone, X, ChevronDown, ChevronUp, RotateCcw, Filter, Building,
    LayoutGrid, List, Calendar
} from 'lucide-react';
import { Header, Footer } from '@/app/features/home/components';
import { RoomFavoriteButton } from '@/app/components/RoomFavoriteButton';
import { getPublicRoomsRequest, type PublicRoomItem, type PublicRoomsSort } from '@/lib/api';
import { useRoomTypes } from '@/app/hooks/useRoomTypes';
import {
    POPULAR_LOCATIONS,
    FILTER_ROOM_TYPES,
    FILTER_PRICE_PRESETS,
    FILTER_SIZE_PRESETS,
    FILTER_AMENITIES,
    FILTER_SORT_OPTIONS,
    POPULAR_UNIVERSITIES,
    FILTER_POLICIES,
    FILTER_TARGET_TENANTS,
    type UniversityOption,
    type PolicyFilterItem,
    type PricePresetItem,
    type SizePresetItem,
    type AmenityFilterItem
} from '@/lib/constants/room-filters';
import { mapPublicRoomToFavorite } from '@/lib/utils/mapPublicRoomToFavorite';
import { MOCK_ROOMS_DATA } from '@/lib/mock-data';
import { adaptRoom } from '@/lib/room-adapter';
import {
    getRoomLandlordAndInspection,
    getRoomCostHighlights
} from '@/lib/room-landlord-data';
import './RoomsPage.css';

const PAGE_SIZE = 12;

const SORT_OPTIONS: { value: PublicRoomsSort; labelKey: string }[] = [
    { value: 'newest', labelKey: 'rooms.sortNewest' },
    { value: 'price_asc', labelKey: 'rooms.sortPriceAsc' },
    { value: 'price_desc', labelKey: 'rooms.sortPriceDesc' },
];

type PricePreset = { id: string; min?: number; max?: number; labelKey: string };

const PRICE_PRESETS: PricePreset[] = [
    { id: 'any', labelKey: 'rooms.priceAny' },
    { id: 'lt3m', max: 3_000_000, labelKey: 'rooms.priceUnder3m' },
    { id: '3_7m', min: 3_000_000, max: 7_000_000, labelKey: 'rooms.price3to7m' },
    { id: '7_15m', min: 7_000_000, max: 15_000_000, labelKey: 'rooms.price7to15m' },
    { id: 'gt15m', min: 15_000_000, labelKey: 'rooms.priceOver15m' },
];

function formatPrice(price: number, tPerMillion: string, tPerDong: string): string {
    if (price >= 1_000_000) {
        const millions = price / 1_000_000;
        return `${Number.isInteger(millions) ? millions : millions.toFixed(1)} ${tPerMillion}`;
    }
    return `${price.toLocaleString('vi-VN')} ${tPerDong}`;
}

function parseSortParam(raw: string | null): PublicRoomsSort {
    if (raw === 'recommended' || raw === 'price_asc' || raw === 'price_desc') return raw;
    return 'newest';
}

function parsePriceQuery(value: string | null): number | undefined {
    if (value == null || value === '') return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return Math.round(n);
}

function presetForRange(min?: number, max?: number): PricePreset | null {
    for (const p of PRICE_PRESETS) {
        if (p.id === 'any') {
            if (min == null && max == null) return p;
            continue;
        }
        if (p.min === min && p.max === max) return p;
    }
    return null;
}

function formatRoomTypeBadge(type?: string): string {
    if (!type) return 'Phòng trọ';
    const t = type.toUpperCase();
    if (t.includes('STUDIO')) return 'Studio';
    if (t.includes('APARTMENT') || t.includes('CĂN HỘ')) return 'Căn hộ mini';
    if (t.includes('SHARED') || t.includes('GHÉP') || t.includes('COLIVING')) return 'Ở ghép / Coliving';
    if (t.includes('PRIVATE') || t.includes('SINGLE') || t.includes('ĐƠN')) return 'Phòng khép kín';
    return 'Phòng trọ';
}

export function RoomsPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { options: roomTypeOptions } = useRoomTypes();

    const [rooms, setRooms] = useState<PublicRoomItem[]>([]);
    const [allAvailableRooms, setAllAvailableRooms] = useState<PublicRoomItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reload, setReload] = useState(0);
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });

    const roomTypeFromUrl = searchParams.get('roomType') || '';
    const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const keywordFromUrl = searchParams.get('keyword') || '';
    const cityFromUrl = searchParams.get('city') || '';
    const districtFromUrl = searchParams.get('district') || '';
    const sortFromUrl = parseSortParam(searchParams.get('sort'));
    const minPriceFromUrl = parsePriceQuery(searchParams.get('minPrice'));
    const maxPriceFromUrl = parsePriceQuery(searchParams.get('maxPrice'));
    const minSizeFromUrl = parsePriceQuery(searchParams.get('minSize'));
    const maxSizeFromUrl = parsePriceQuery(searchParams.get('maxSize'));
    const amenitiesFromUrl = useMemo(() => {
        const raw = searchParams.get('amenities');
        return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    }, [searchParams]);
    const inspectionFromUrl = (searchParams.get('inspection') || 'all') as 'all' | 'verified' | 'pending';
    const universityFromUrl = searchParams.get('university') || '';
    const targetTenantFromUrl = searchParams.get('targetTenant') || '';
    const policiesFromUrl = useMemo(() => {
        const raw = searchParams.get('policies');
        return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    }, [searchParams]);

    const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');
    const [bookingRoom, setBookingRoom] = useState<PublicRoomItem | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingData, setBookingData] = useState({ date: 'tomorrow', timeSlot: '14:00 - 16:00', phone: '', name: '', note: '' });

    const [isFilterExpanded, setIsFilterExpanded] = useState(true);
    const [draftMinSize, setDraftMinSize] = useState(minSizeFromUrl != null ? String(minSizeFromUrl) : '');
    const [draftMaxSize, setDraftMaxSize] = useState(maxSizeFromUrl != null ? String(maxSizeFromUrl) : '');
    const [searchCity, setSearchCity] = useState(cityFromUrl);
    const [searchDistrict, setSearchDistrict] = useState(districtFromUrl);

    useEffect(() => {
        setSearchCity(cityFromUrl);
        setSearchDistrict(districtFromUrl);
    }, [cityFromUrl, districtFromUrl]);

    const [draftMinPrice, setDraftMinPrice] = useState(minPriceFromUrl != null ? String(minPriceFromUrl) : '');
    const [draftMaxPrice, setDraftMaxPrice] = useState(maxPriceFromUrl != null ? String(maxPriceFromUrl) : '');
    const [priceApplyError, setPriceApplyError] = useState('');
    const [prevMinPrice, setPrevMinPrice] = useState(minPriceFromUrl);
    const [prevMaxPrice, setPrevMaxPrice] = useState(maxPriceFromUrl);

    if (minPriceFromUrl !== prevMinPrice || maxPriceFromUrl !== prevMaxPrice) {
        setPrevMinPrice(minPriceFromUrl);
        setPrevMaxPrice(maxPriceFromUrl);
        setDraftMinPrice(minPriceFromUrl != null ? String(minPriceFromUrl) : '');
        setDraftMaxPrice(maxPriceFromUrl != null ? String(maxPriceFromUrl) : '');
        setPriceApplyError('');
    }

    const typeTabs = useMemo(() => {
        const fallback = [
            { value: 'single', label: t('rooms.typeSingle') },
            { value: 'shared', label: t('rooms.typeShared') },
            { value: 'studio', label: t('rooms.typeStudio') },
            { value: 'apartment', label: t('rooms.typeApartment') },
        ];
        const fromApi = roomTypeOptions.length > 0 ? roomTypeOptions : fallback;
        return [{ value: '', label: t('rooms.typeAll') }, ...fromApi];
    }, [roomTypeOptions, t]);

    useEffect(() => {
        setLoading(true);
        let active = true;
        setLoadError('');

        const fallbackToMock = () => {
            let list = [...MOCK_ROOMS_DATA];

            // Prepend locally created rooms from this browser
            try {
                const customRooms = JSON.parse(localStorage.getItem('hexroom_custom_rooms') || '[]');
                if (Array.isArray(customRooms) && customRooms.length > 0) {
                    list = [...customRooms, ...list];
                }
            } catch {
                // ignore
            }

            const allAdapted = list.map(adaptRoom);
            setAllAvailableRooms(allAdapted);

            if (roomTypeFromUrl) {
                const rt = roomTypeFromUrl.toLowerCase();
                list = list.filter((r) => r.roomType.toLowerCase().includes(rt) || rt.includes(r.roomType.toLowerCase()));
            }
            if (minPriceFromUrl != null) {
                list = list.filter((r) => r.price >= minPriceFromUrl);
            }
            if (maxPriceFromUrl != null) {
                list = list.filter((r) => r.price <= maxPriceFromUrl);
            }
            if (minSizeFromUrl != null) {
                list = list.filter((r) => (r.sizeM2 ?? 0) >= minSizeFromUrl);
            }
            if (maxSizeFromUrl != null) {
                list = list.filter((r) => (r.sizeM2 ?? 0) <= maxSizeFromUrl);
            }
            if (keywordFromUrl) {
                const q = keywordFromUrl.toLowerCase();
                list = list.filter((r) =>
                    (r.roomName || '').toLowerCase().includes(q) ||
                    (r.description || '').toLowerCase().includes(q) ||
                    (r.district || '').toLowerCase().includes(q) ||
                    (r.address || '').toLowerCase().includes(q)
                );
            }
            if (cityFromUrl) {
                const c = cityFromUrl.toLowerCase();
                list = list.filter((r) => (r.city || '').toLowerCase().includes(c));
            }
            if (districtFromUrl) {
                const d = districtFromUrl.toLowerCase();
                list = list.filter((r) => (r.district || '').toLowerCase().includes(d));
            }
            if (universityFromUrl) {
                const uni = POPULAR_UNIVERSITIES.find(u => u.id === universityFromUrl);
                if (uni) {
                    const uniTerm = uni.shortName.toLowerCase();
                    const uniDist = uni.district.toLowerCase();
                    list = list.filter(r => 
                        (r.district || '').toLowerCase().includes(uniDist) ||
                        (r.roomName || '').toLowerCase().includes(uniTerm) ||
                        (r.description || '').toLowerCase().includes(uniTerm) ||
                        (r.address || '').toLowerCase().includes(uniDist)
                    );
                }
            }

            if (policiesFromUrl.length > 0) {
                list = list.filter(r => {
                    const text = ((r.description || '') + ' ' + (r.amenities || []).map((a: any) => typeof a === 'string' ? a : a.name).join(' ')).toLowerCase();
                    return policiesFromUrl.every(pId => {
                        const pol = FILTER_POLICIES.find(p => p.id === pId);
                        return pol ? text.includes(pol.keyword.toLowerCase()) : true;
                    });
                });
            }

            if (targetTenantFromUrl === 'female_only') {
                list = list.filter(r => (r.description || '').toLowerCase().includes('nữ'));
            } else if (targetTenantFromUrl === 'male_only') {
                list = list.filter(r => (r.description || '').toLowerCase().includes('nam'));
            } else if (targetTenantFromUrl === 'student') {
                list = list.filter(r => (r.price <= 4500000) || (r.description || '').toLowerCase().includes('sinh viên'));
            }

            if (amenitiesFromUrl.length > 0) {
                list = list.filter((r) => {
                    const roomAmenities = (r.amenities || []).map(a => typeof a === 'string' ? a : (a as any).name);
                    return amenitiesFromUrl.every(req =>
                        roomAmenities.some(ra => ra.toLowerCase().includes(req.toLowerCase()))
                    );
                });
            }

            // Filter by inspection status
            if (inspectionFromUrl === 'verified') {
                list = list.filter((r) => getRoomLandlordAndInspection(r).inspection.isInspected);
            } else if (inspectionFromUrl === 'pending') {
                list = list.filter((r) => !getRoomLandlordAndInspection(r).inspection.isInspected);
            }

            if (sortFromUrl === 'price_asc') {
                list = [...list].sort((a, b) => a.price - b.price);
            } else if (sortFromUrl === 'price_desc') {
                list = [...list].sort((a, b) => b.price - a.price);
            } else if (sortFromUrl === 'size_desc') {
                list = [...list].sort((a, b) => (b.sizeM2 ?? 0) - (a.sizeM2 ?? 0));
            }

            const adapted = list.map(adaptRoom);
            setRooms(adapted);
            setPagination({ page: 1, limit: PAGE_SIZE, total: adapted.length, pages: Math.ceil(adapted.length / PAGE_SIZE) });
        };

        getPublicRoomsRequest({
            page: pageFromUrl,
            limit: PAGE_SIZE,
            roomType: roomTypeFromUrl || undefined,
            minPrice: minPriceFromUrl,
            maxPrice: maxPriceFromUrl,
            minSize: minSizeFromUrl,
            maxSize: maxSizeFromUrl,
            district: districtFromUrl || undefined,
            sort: sortFromUrl,
            keyword: keywordFromUrl || undefined,
            city: cityFromUrl || undefined,
        })
            .then((res) => {
                if (!active) return;
                if (res.data && res.data.length > 0) {
                    setAllAvailableRooms(res.data);
                    let items = res.data;
                    if (inspectionFromUrl === 'verified') {
                        items = items.filter((r) => getRoomLandlordAndInspection(r).inspection.isInspected);
                    } else if (inspectionFromUrl === 'pending') {
                        items = items.filter((r) => !getRoomLandlordAndInspection(r).inspection.isInspected);
                    }
                    if (districtFromUrl) {
                        const d = districtFromUrl.toLowerCase();
                        items = items.filter((r) => (r.district || '').toLowerCase().includes(d));
                    }
                    if (universityFromUrl) {
                        const uni = POPULAR_UNIVERSITIES.find(u => u.id === universityFromUrl);
                        if (uni) {
                            const uniDist = uni.district.toLowerCase();
                            const uniTerm = uni.shortName.toLowerCase();
                            items = items.filter(r => 
                                (r.district || '').toLowerCase().includes(uniDist) ||
                                (r.roomName || '').toLowerCase().includes(uniTerm) ||
                                (r.description || '').toLowerCase().includes(uniTerm) ||
                                (r.address || '').toLowerCase().includes(uniDist)
                            );
                        }
                    }

                    if (policiesFromUrl.length > 0) {
                        items = items.filter(r => {
                            const text = ((r.description || '') + ' ' + (r.amenities || []).map((a: any) => typeof a === 'string' ? a : a.name).join(' ')).toLowerCase();
                            return policiesFromUrl.every(pId => {
                                const pol = FILTER_POLICIES.find(p => p.id === pId);
                                return pol ? text.includes(pol.keyword.toLowerCase()) : true;
                            });
                        });
                    }

                    if (amenitiesFromUrl.length > 0) {
                        items = items.filter((r) => {
                            const rAms = (r.amenities || []).map(a => typeof a === 'string' ? a : a.name);
                            return amenitiesFromUrl.every(req => rAms.some(ra => ra.toLowerCase().includes(req.toLowerCase())));
                        });
                    }
                    setRooms(items);
                    setPagination(res.pagination || { page: 1, limit: PAGE_SIZE, total: items.length, pages: Math.ceil(items.length / PAGE_SIZE) });
                } else {
                    fallbackToMock();
                }
            })
            .catch(() => {
                if (!active) return;
                fallbackToMock();
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [pageFromUrl, roomTypeFromUrl, minPriceFromUrl, maxPriceFromUrl, minSizeFromUrl, maxSizeFromUrl, sortFromUrl, keywordFromUrl, cityFromUrl, districtFromUrl, amenitiesFromUrl, inspectionFromUrl, universityFromUrl, targetTenantFromUrl, policiesFromUrl, reload]);

    const updateParams = useCallback(
        (updates: Record<string, string | undefined>) => {
            setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                for (const [key, val] of Object.entries(updates)) {
                    if (val) p.set(key, val);
                    else p.delete(key);
                }
                return p;
            });
        },
        [setSearchParams]
    );

    const handleTypeChange = (type: string) => {
        updateParams({ roomType: type || undefined, page: undefined });
    };

    const handleInspectionFilterChange = (status: 'all' | 'verified' | 'pending') => {
        updateParams({
            inspection: status === 'all' ? undefined : status,
            page: undefined,
        });
    };

    const handleSortChange = (sort: PublicRoomsSort) => {
        updateParams({
            sort: sort === 'newest' ? undefined : sort,
            page: undefined,
        });
    };

    const handlePricePreset = (preset: PricePreset) => {
        setPriceApplyError('');
        if (preset.id === 'any') {
            updateParams({ minPrice: undefined, maxPrice: undefined, page: undefined });
            return;
        }
        updateParams({
            minPrice: preset.min != null ? String(preset.min) : undefined,
            maxPrice: preset.max != null ? String(preset.max) : undefined,
            page: undefined,
        });
    };

    const handleApplyCustomPrice = () => {
        setPriceApplyError('');
        const rawMin = draftMinPrice.replace(/\D/g, '');
        const rawMax = draftMaxPrice.replace(/\D/g, '');
        const min = rawMin ? Number(rawMin) : undefined;
        const max = rawMax ? Number(rawMax) : undefined;
        if (min != null && max != null && min > max) {
            setPriceApplyError('invalid');
            return;
        }
        updateParams({
            minPrice: min != null ? String(min) : undefined,
            maxPrice: max != null ? String(max) : undefined,
            page: undefined,
        });
    };

    const handleClearPrice = () => {
        setPriceApplyError('');
        updateParams({ minPrice: undefined, maxPrice: undefined, page: undefined });
    };

    const handleSizePreset = (preset: SizePresetItem) => {
        if (preset.id === 'any') {
            updateParams({ minSize: undefined, maxSize: undefined, page: undefined });
            return;
        }
        updateParams({
            minSize: preset.min != null ? String(preset.min) : undefined,
            maxSize: preset.max != null ? String(preset.max) : undefined,
            page: undefined,
        });
    };

    const handleApplyCustomSize = () => {
        const rawMin = draftMinSize.replace(/\D/g, '');
        const rawMax = draftMaxSize.replace(/\D/g, '');
        const min = rawMin ? Number(rawMin) : undefined;
        const max = rawMax ? Number(rawMax) : undefined;
        updateParams({
            minSize: min != null ? String(min) : undefined,
            maxSize: max != null ? String(max) : undefined,
            page: undefined,
        });
    };

    const handleUniversitySelect = (uniId: string) => {
        updateParams({
            university: universityFromUrl === uniId ? undefined : uniId,
            page: undefined,
        });
    };

    const handlePolicyToggle = (policyId: string) => {
        const next = policiesFromUrl.includes(policyId)
            ? policiesFromUrl.filter(p => p !== policyId)
            : [...policiesFromUrl, policyId];
        updateParams({
            policies: next.length > 0 ? next.join(',') : undefined,
            page: undefined,
        });
    };

    const handleTargetTenantChange = (target: string) => {
        updateParams({
            targetTenant: target || undefined,
            page: undefined,
        });
    };

    const handleConfirmBooking = (e: React.FormEvent) => {
        e.preventDefault();
        setBookingSuccess(true);
    };

    const handleAmenityToggle = (name: string) => {
        const next = amenitiesFromUrl.includes(name)
            ? amenitiesFromUrl.filter(a => a !== name)
            : [...amenitiesFromUrl, name];
        updateParams({
            amenities: next.length > 0 ? next.join(',') : undefined,
            page: undefined,
        });
    };

    const handleCitySelectChange = (city: string) => {
        setSearchCity(city);
        setSearchDistrict('');
        updateParams({
            city: city || undefined,
            district: undefined,
            page: undefined,
        });
    };

    const handleDistrictSelectChange = (district: string) => {
        setSearchDistrict(district);
        updateParams({
            district: district || undefined,
            page: undefined,
        });
    };

    const handleResetAllFilters = () => {
        setPriceApplyError('');
        const p = new URLSearchParams();
        setSearchParams(p);
    };

    const goToPage = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.pages) return;
        updateParams({ page: newPage > 1 ? String(newPage) : undefined });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRoomClick = (id: string) => navigate(`/room/${id}`);

    const pageNumbers = useMemo(() => {
        const total = pagination.pages;
        const current = pagination.page;
        const range: number[] = [];
        const start = Math.max(1, current - 2);
        const end = Math.min(total, current + 2);
        for (let i = start; i <= end; i++) range.push(i);
        return range;
    }, [pagination]);

    // Calculate dynamic counts for inspection filter tabs
    const pool = allAvailableRooms.length > 0 ? allAvailableRooms : rooms;
    const verifiedCount = useMemo(() => {
        return pool.filter(r => getRoomLandlordAndInspection(r).inspection.isInspected).length;
    }, [pool]);

    const pendingCount = useMemo(() => {
        return pool.filter(r => !getRoomLandlordAndInspection(r).inspection.isInspected).length;
    }, [pool]);

    const totalCount = pool.length;

    const activePreset = presetForRange(minPriceFromUrl, maxPriceFromUrl);
    const hasCustomPrice =
        (minPriceFromUrl != null || maxPriceFromUrl != null) && activePreset == null;
    const activeTypeLabel =
        typeTabs.find((tab) => tab.value === roomTypeFromUrl)?.label || t('rooms.typeAll');
    const activeCityObj = POPULAR_LOCATIONS.find(c => c.name.toLowerCase() === (searchCity || cityFromUrl).toLowerCase());
    const currentDistricts = activeCityObj?.districts || [];

    const activeSizePreset = FILTER_SIZE_PRESETS.find(p => {
        if (p.id === 'any') return minSizeFromUrl == null && maxSizeFromUrl == null;
        return p.min === minSizeFromUrl && p.max === maxSizeFromUrl;
    });

    let activeFilterCount = 0;
    if (keywordFromUrl) activeFilterCount++;
    if (cityFromUrl) activeFilterCount++;
    if (districtFromUrl) activeFilterCount++;
    if (roomTypeFromUrl) activeFilterCount++;
    if (minPriceFromUrl != null || maxPriceFromUrl != null) activeFilterCount++;
    if (minSizeFromUrl != null || maxSizeFromUrl != null) activeFilterCount++;
    if (amenitiesFromUrl.length > 0) activeFilterCount += amenitiesFromUrl.length;
    if (inspectionFromUrl !== 'all') activeFilterCount++;
    if (sortFromUrl !== 'newest') activeFilterCount++;
    if (universityFromUrl) activeFilterCount++;
    if (targetTenantFromUrl) activeFilterCount++;
    if (policiesFromUrl.length > 0) activeFilterCount += policiesFromUrl.length;

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <div className="rooms-page">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            {/* Hero Banner with Modern Emerald Mesh & Trust Indicators */}
            <div className="rooms-hero">
                <div className="rooms-hero-badge">
                    <ShieldCheck size={16} />
                    <span>NỀN TẢNG THUÊ PHÒNG MINH BẠCH · TIÊU CHUẨN ĐỐI CHIẾU 4 BƯỚC</span>
                </div>
                <h1>{t('rooms.title')}</h1>
                <p>Khám phá hệ sinh thái phòng trọ được đối chiếu thực tế tận nơi, công khai 100% biểu phí và xác minh danh tính chủ trọ uy tín.</p>

                <div className="rooms-hero-trust-row">
                    <span className="hero-trust-item"><CheckCircle2 size={14} /> 100% Đo đạc & ảnh chụp thực địa</span>
                    <span className="hero-trust-item"><CheckCircle2 size={14} /> Minh bạch không phụ phí ẩn</span>
                    <span className="hero-trust-item"><CheckCircle2 size={14} /> Xác thực CCCD / Sổ đỏ chính chủ</span>
                    <span className="hero-trust-item"><CheckCircle2 size={14} /> Hợp đồng chuẩn pháp lý 3.E</span>
                </div>
            </div>

            <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-6">
                {/* Multi-Field Search Bar: Keyword, City, District */}
                <form
                    className="rooms-search-form-v2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        updateParams({
                            keyword: String(form.get('keyword') || ''),
                            city: searchCity || undefined,
                            district: searchDistrict || undefined,
                            page: undefined
                        });
                    }}
                >
                    <div className="rooms-search-input-wrap">
                        <Search size={18} color="#10B981" />
                        <input
                            name="keyword"
                            aria-label="Từ khóa tìm phòng"
                            placeholder="Tìm theo tên phòng, đường, trường ĐH gần bạn (ĐH Ngoại Thương, RMIT, HUTECH, Bách Khoa…)"
                            defaultValue={keywordFromUrl}
                            key={'keyword-' + keywordFromUrl}
                        />
                    </div>

                    <div className="rooms-search-select-wrap">
                        <Building size={16} color="#64748B" style={{ marginRight: 6 }} />
                        <select
                            className="rooms-search-select"
                            value={searchCity}
                            onChange={(e) => handleCitySelectChange(e.target.value)}
                        >
                            <option value="">Tất cả thành phố</option>
                            {POPULAR_LOCATIONS.map(c => (
                                <option key={c.name} value={c.name}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="rooms-search-select-wrap">
                        <MapPin size={16} color="#64748B" style={{ marginRight: 6 }} />
                        <select
                            className="rooms-search-select"
                            value={searchDistrict}
                            onChange={(e) => handleDistrictSelectChange(e.target.value)}
                        >
                            <option value="">Tất cả quận / huyện</option>
                            {currentDistricts.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <button className="rooms-search-submit-btn" type="submit">
                        <Search size={16} /> Tìm phòng
                    </button>
                </form>

                {/* Quick Universities & Landmarks Strip */}
                <div className="rooms-uni-bar" aria-label="Lọc nhanh theo trường đại học">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#047857", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                        🎓 Gần trường ĐH:
                    </span>
                    <button
                        type="button"
                        className={`rooms-uni-chip ${!universityFromUrl ? "active" : ""}`}
                        onClick={() => handleUniversitySelect("")}
                    >
                        Tất cả trường
                    </button>
                    {POPULAR_UNIVERSITIES.map(u => (
                        <button
                            key={u.id}
                            type="button"
                            className={`rooms-uni-chip ${universityFromUrl === u.id ? "active" : ""}`}
                            onClick={() => handleUniversitySelect(u.id)}
                            title={`${u.name} (${u.district}, ${u.city})`}
                        >
                            {u.shortName}
                        </button>
                    ))}
                </div>

                {/* Inspection Segment Filter Bar (Core HexRoom USP) */}
                <div className="rooms-inspection-bar-wrap">
                    <div className="rooms-inspection-pills">
                        <button
                            type="button"
                            className={`rooms-insp-tab ${inspectionFromUrl === 'all' ? 'active' : ''}`}
                            onClick={() => handleInspectionFilterChange('all')}
                        >
                            <span>Tất cả phòng ({totalCount})</span>
                        </button>
                        <button
                            type="button"
                            className={`rooms-insp-tab verified ${inspectionFromUrl === 'verified' ? 'active' : ''}`}
                            onClick={() => handleInspectionFilterChange('verified')}
                        >
                            <ShieldCheck size={16} />
                            <span>100% Đã kiểm định 4 bước ({verifiedCount})</span>
                        </button>
                        <button
                            type="button"
                            className={`rooms-insp-tab pending ${inspectionFromUrl === 'pending' ? 'active' : ''}`}
                            onClick={() => handleInspectionFilterChange('pending')}
                        >
                            <Clock size={16} />
                            <span>Chờ đối chiếu thực địa ({pendingCount})</span>
                        </button>
                    </div>

                    <div className="rooms-inspection-guarantee-note">
                        <CheckCircle2 size={15} />
                        <span>Quy trình chuẩn: <strong>Hiện trạng · Giá & Phụ phí · Ảnh chụp · Quyền cho thuê</strong></span>
                    </div>
                </div>

                {/* Categories Bar */}
                <div className="rooms-toolbar-top">
                    <div className="rooms-category-bar">
                        {typeTabs.map((tab) => (
                            <button
                                key={tab.value || 'all'}
                                type="button"
                                className={`rooms-cat-btn ${roomTypeFromUrl === tab.value ? 'active' : ''}`}
                                onClick={() => handleTypeChange(tab.value)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {hasActiveFilters && (
                        <button type="button" className="rooms-reset-filters" onClick={handleResetAllFilters}>
                            <RotateCcw size={13} style={{ display: 'inline', marginRight: 4 }} />
                            {t('rooms.resetAllFilters')}
                        </button>
                    )}
                </div>

                {/* Comprehensive Advanced Filter Box */}
                <div className={`rooms-advanced-filter-card ${isFilterExpanded ? 'expanded' : ''}`}>
                    <div
                        className="rooms-advanced-filter-header"
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    >
                        <div className="rooms-advanced-title">
                            <SlidersHorizontal size={18} color="#10B981" />
                            <span>Bộ lọc chi tiết & Tiện nghi phòng</span>
                            {activeFilterCount > 0 && (
                                <span className="rooms-filter-badge-count">{activeFilterCount} đang chọn</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#059669', fontWeight: 600 }}>
                            <span>{isFilterExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc chi tiết'}</span>
                            {isFilterExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </div>

                    {isFilterExpanded && (
                        <div className="rooms-advanced-filter-body">
                            {/* Section 1: Khoảng giá thuê */}
                            <div>
                                <div className="rooms-filter-section-title">
                                    <span>💰 Mức giá thuê tháng:</span>
                                </div>
                                <div className="rooms-price-chips">
                                    {FILTER_PRICE_PRESETS.map((preset) => {
                                        const isSelected = preset.id === 'any'
                                            ? minPriceFromUrl == null && maxPriceFromUrl == null
                                            : activePreset?.id === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                className={`rooms-price-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => handlePricePreset(preset as any)}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="rooms-custom-price" style={{ marginTop: 8 }}>
                                    <span className="rooms-custom-price-label">Hoặc nhập khoảng giá (VNĐ):</span>
                                    <div className="rooms-custom-price-inputs">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="rooms-price-input"
                                            placeholder="Tối thiểu (VND)"
                                            value={draftMinPrice}
                                            onChange={(e) => setDraftMinPrice(e.target.value)}
                                        />
                                        <span className="rooms-price-input-sep">—</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="rooms-price-input"
                                            placeholder="Tối đa (VND)"
                                            value={draftMaxPrice}
                                            onChange={(e) => setDraftMaxPrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="rooms-custom-price-actions">
                                        <button type="button" className="rooms-price-action-primary" onClick={handleApplyCustomPrice}>
                                            Áp dụng
                                        </button>
                                        <button type="button" className="rooms-price-action-secondary" onClick={handleClearPrice}>
                                            Đặt lại
                                        </button>
                                    </div>
                                    {priceApplyError && (
                                        <p className="rooms-price-error" role="alert">Khoảng giá không hợp lệ (tối thiểu phải nhỏ hơn tối đa)</p>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Diện tích phòng */}
                            <div>
                                <div className="rooms-filter-section-title">
                                    <span>📐 Diện tích không gian:</span>
                                </div>
                                <div className="rooms-price-chips">
                                    {FILTER_SIZE_PRESETS.map((preset) => {
                                        const isSelected = preset.id === 'any'
                                            ? minSizeFromUrl == null && maxSizeFromUrl == null
                                            : activeSizePreset?.id === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                className={`rooms-price-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => handleSizePreset(preset)}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="rooms-custom-price" style={{ marginTop: 8 }}>
                                    <span className="rooms-custom-price-label">Hoặc nhập diện tích (m²):</span>
                                    <div className="rooms-custom-price-inputs">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="rooms-price-input"
                                            placeholder="Min m²"
                                            value={draftMinSize}
                                            onChange={(e) => setDraftMinSize(e.target.value)}
                                        />
                                        <span className="rooms-price-input-sep">—</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="rooms-price-input"
                                            placeholder="Max m²"
                                            value={draftMaxSize}
                                            onChange={(e) => setDraftMaxSize(e.target.value)}
                                        />
                                    </div>
                                    <div className="rooms-custom-price-actions">
                                        <button type="button" className="rooms-price-action-primary" onClick={handleApplyCustomSize}>
                                            Áp dụng diện tích
                                        </button>
                                        <button
                                            type="button"
                                            className="rooms-price-action-secondary"
                                            onClick={() => {
                                                setDraftMinSize('');
                                                setDraftMaxSize('');
                                                updateParams({ minSize: undefined, maxSize: undefined, page: undefined });
                                            }}
                                        >
                                            Đặt lại
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Chính sách & An ninh phòng trọ */}
                            <div>
                                <div className="rooms-filter-section-title">
                                    <span>🔑 Chính sách & Quy định phòng trọ:</span>
                                </div>
                                <div className="rooms-amenities-grid">
                                    {FILTER_POLICIES.map((pol) => {
                                        const isPolActive = policiesFromUrl.includes(pol.id);
                                        return (
                                            <button
                                                key={pol.id}
                                                type="button"
                                                className={`rooms-amenity-toggle ${isPolActive ? "active" : ""}`}
                                                onClick={() => handlePolicyToggle(pol.id)}
                                            >
                                                <span>{pol.icon}</span>
                                                <span>{pol.label}</span>
                                                {isPolActive && <Check size={14} color="#059669" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 4: Đối tượng người thuê */}
                            <div>
                                <div className="rooms-filter-section-title">
                                    <span>👥 Đối tượng người thuê ưu tiên:</span>
                                </div>
                                <div className="rooms-price-chips">
                                    {FILTER_TARGET_TENANTS.map((tg) => {
                                        const isTargetActive = (targetTenantFromUrl || "") === tg.value;
                                        return (
                                            <button
                                                key={tg.value || "all"}
                                                type="button"
                                                className={`rooms-price-chip ${isTargetActive ? "active" : ""}`}
                                                onClick={() => handleTargetTenantChange(tg.value)}
                                            >
                                                {tg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 5: Tiện nghi & Nội thất */}
                            <div>
                                <div className="rooms-filter-section-title">
                                    <Sparkles size={16} color="#10B981" />
                                    <span>Tiện nghi & Trang thiết bị (chọn nhiều tiện ích):</span>
                                </div>
                                <div className="rooms-amenities-grid">
                                    {FILTER_AMENITIES.map((am) => {
                                        const isActive = amenitiesFromUrl.includes(am.name);
                                        return (
                                            <button
                                                key={am.id}
                                                type="button"
                                                className={`rooms-amenity-toggle ${isActive ? 'active' : ''}`}
                                                onClick={() => handleAmenityToggle(am.name)}
                                            >
                                                <span>{am.icon}</span>
                                                <span>{am.name}</span>
                                                {isActive && <Check size={14} color="#059669" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 4: Sắp xếp kết quả */}
                            <div>
                                <div className="rooms-filter-section-title">
                                    <span>⚡ Sắp xếp kết quả:</span>
                                </div>
                                <div className="rooms-sort-row" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
                                    {FILTER_SORT_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`rooms-sort-tab ${sortFromUrl === opt.value ? 'active' : ''}`}
                                            onClick={() => handleSortChange(opt.value as any)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Active Filters Badges Strip */}
                {hasActiveFilters && (
                    <div className="rooms-active-tags-strip">
                        <span className="rooms-filter-results-info">
                            Tìm thấy <strong>{rooms.length}</strong> phòng phù hợp:
                        </span>

                        {keywordFromUrl && (
                            <span className="rooms-active-tag">
                                Từ khóa: "{keywordFromUrl}"
                                <button className="rooms-active-tag-remove" onClick={() => updateParams({ keyword: undefined, page: undefined })}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {cityFromUrl && (
                            <span className="rooms-active-tag">
                                Thành phố: {cityFromUrl}
                                <button className="rooms-active-tag-remove" onClick={() => updateParams({ city: undefined, district: undefined, page: undefined })}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {districtFromUrl && (
                            <span className="rooms-active-tag">
                                {districtFromUrl}
                                <button className="rooms-active-tag-remove" onClick={() => updateParams({ district: undefined, page: undefined })}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {roomTypeFromUrl && (
                            <span className="rooms-active-tag">
                                {activeTypeLabel}
                                <button className="rooms-active-tag-remove" onClick={() => updateParams({ roomType: undefined, page: undefined })}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {(minPriceFromUrl != null || maxPriceFromUrl != null) && (
                            <span className="rooms-active-tag">
                                Giá: {minPriceFromUrl != null ? `Từ ${(minPriceFromUrl / 1e6).toFixed(1)}tr` : ''} {maxPriceFromUrl != null ? `Đến ${(maxPriceFromUrl / 1e6).toFixed(1)}tr` : ''}
                                <button className="rooms-active-tag-remove" onClick={() => handleClearPrice()}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {(minSizeFromUrl != null || maxSizeFromUrl != null) && (
                            <span className="rooms-active-tag">
                                Diện tích: {minSizeFromUrl != null ? `Từ ${minSizeFromUrl}m²` : ''} {maxSizeFromUrl != null ? `Đến ${maxSizeFromUrl}m²` : ''}
                                <button className="rooms-active-tag-remove" onClick={() => updateParams({ minSize: undefined, maxSize: undefined, page: undefined })}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {amenitiesFromUrl.map(am => (
                            <span key={am} className="rooms-active-tag">
                                ✓ {am}
                                <button className="rooms-active-tag-remove" onClick={() => handleAmenityToggle(am)}>
                                    <X size={14} />
                                </button>
                            </span>
                        ))}

                        {inspectionFromUrl !== 'all' && (
                            <span className="rooms-active-tag">
                                {inspectionFromUrl === 'verified' ? 'Đã kiểm định 100%' : 'Chờ đối chiếu'}
                                <button className="rooms-active-tag-remove" onClick={() => handleInspectionFilterChange('all')}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {universityFromUrl && (
                            <span className="rooms-active-tag">
                                🎓 Gần: {POPULAR_UNIVERSITIES.find(u => u.id === universityFromUrl)?.shortName}
                                <button className="rooms-active-tag-remove" onClick={() => handleUniversitySelect('')}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {targetTenantFromUrl && (
                            <span className="rooms-active-tag">
                                👥 {FILTER_TARGET_TENANTS.find(t => t.value === targetTenantFromUrl)?.label}
                                <button className="rooms-active-tag-remove" onClick={() => handleTargetTenantChange('')}>
                                    <X size={14} />
                                </button>
                            </span>
                        )}

                        {policiesFromUrl.map(pId => (
                            <span key={pId} className="rooms-active-tag">
                                {FILTER_POLICIES.find(p => p.id === pId)?.icon} {FILTER_POLICIES.find(p => p.id === pId)?.label}
                                <button className="rooms-active-tag-remove" onClick={() => handlePolicyToggle(pId)}>
                                    <X size={14} />
                                </button>
                            </span>
                        ))}

                        <button type="button" className="rooms-reset-filters" onClick={handleResetAllFilters}>
                            <RotateCcw size={12} style={{ display: 'inline', marginRight: 4 }} />
                            Xóa tất cả
                        </button>
                    </div>
                )}

                {/* Scope link */}
                <button
                    type="button"
                    className="rooms-advanced-link"
                    onClick={() => navigate('/how-it-works')}
                >
                    <SlidersHorizontal size={16} aria-hidden />
                    Tìm hiểu quy trình khảo sát đối chiếu 4 bước tại chỗ của HexRoom
                </button>

                {/* Detailed Action Bar: Result count + View Mode Switcher */}
                <div className="rooms-toolbar-action-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                            {universityFromUrl
                                ? `Phòng gần ${POPULAR_UNIVERSITIES.find(u => u.id === universityFromUrl)?.name}`
                                : cityFromUrl
                                    ? `Phòng trọ tại ${cityFromUrl}`
                                    : 'Danh sách phòng trọ đã xác thực'}
                        </span>
                        <span style={{ fontSize: 13, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 10px', borderRadius: 999, fontWeight: 700 }}>
                            {rooms.length} phòng khả dụng
                        </span>
                    </div>

                    <div className="rooms-view-toggle-wrap">
                        <button
                            type="button"
                            className={`rooms-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Xem dạng lưới"
                        >
                            <LayoutGrid size={15} />
                            <span>Dạng lưới</span>
                        </button>
                        <button
                            type="button"
                            className={`rooms-view-toggle-btn ${viewMode === 'detailed' ? 'active' : ''}`}
                            onClick={() => setViewMode('detailed')}
                            title="Xem chi tiết biểu phí & kiểm định"
                        >
                            <List size={15} />
                            <span>Chi tiết biểu phí</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="rooms-stats">
                    <span>
                        {loading
                            ? 'Đang tải danh sách phòng trọ...'
                            : roomTypeFromUrl
                                ? t('rooms.showingFiltered', {
                                    total: pagination.total,
                                    type: activeTypeLabel,
                                })
                                : t('rooms.showing', { total: pagination.total })}
                    </span>
                    <span>{t('rooms.page', { page: pagination.page, total: pagination.pages || 1 })}</span>
                </div>

                {loadError ? (
                    <div className="hx-empty" role="alert">
                        <p>{loadError}</p>
                        <button className="hx-button" onClick={() => setReload(reload + 1)}>Thử lại</button>
                    </div>
                ) : loading ? (
                    <div className="rooms-card-grid" style={viewMode === 'detailed' ? { gridTemplateColumns: '1fr' } : undefined}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="room-card-skeleton">
                                <div className="skel-img" />
                                <div className="skel-body">
                                    <div className="skel-line w80" />
                                    <div className="skel-line w60" />
                                    <div className="skel-line w40" />
                                    <div className="skel-line w80" />
                                    <div className="skel-line w30" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="rooms-empty">
                        <div className="rooms-empty-icon">
                            <Search size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mt-3">Không tìm thấy phòng phù hợp</h3>
                        <p className="text-muted-foreground text-sm mt-1">{t('rooms.empty')}</p>
                        <button
                            type="button"
                            className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
                            onClick={() => handleResetAllFilters()}
                        >
                            {t('rooms.viewAll')}
                        </button>
                    </div>
                ) : (
                    <div className={`rooms-card-grid ${viewMode === 'detailed' ? 'detailed-view' : ''}`}>
                        {rooms.map((room) => {
                            const { landlord, inspection } = getRoomLandlordAndInspection(room);
                            const costHighlights = getRoomCostHighlights(room);
                            const images = room.images || [];
                            const mainImg = images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80';
                            const loc = room.rental?.location;
                            const address = loc ? [loc.district, loc.city].filter(Boolean).join(', ') : ((room as any).district ? `${(room as any).district}, ${(room as any).city || ''}` : '');
                            const name = room.roomName || room.title || t('rooms.title');
                            const desc = room.description || '';
                            const amenities = room.amenities || [];
                            const maxPeople = room.maxPeople || 2;

                            return (
                                <div
                                    key={room.id}
                                    className={`room-card ${inspection.isInspected ? 'is-inspected' : 'is-pending'}`}
                                    onClick={() => handleRoomClick(room.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRoomClick(room.id)}
                                >
                                    {/* Images Grid with Overlays */}
                                    <div className="room-card-images">
                                        <div className="img-main">
                                            <img
                                                src={mainImg}
                                                alt={name}
                                                crossOrigin="anonymous"
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80';
                                                }}
                                            />
                                        </div>
                                        {images.length > 1 && (
                                            <div className="img-sub">
                                                <img
                                                    src={images[1]}
                                                    alt=""
                                                    crossOrigin="anonymous"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80';
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {images.length > 2 && (
                                            <div className="img-sub">
                                                <img
                                                    src={images[2]}
                                                    alt=""
                                                    crossOrigin="anonymous"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80';
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Floating Top Left: Inspection Badge & Room Type */}
                                        <div className="card-floating-top-left">
                                            {inspection.isInspected ? (
                                                <span className="room-badge-insp verified" title="Đã qua kiểm định thực tế 4 bước tại chỗ">
                                                    <ShieldCheck size={13} className="badge-icon-verified" />
                                                    <span>100% ĐÃ ĐỐI CHIẾU 4 BƯỚC</span>
                                                </span>
                                            ) : (
                                                <span className="room-badge-insp pending" title="Tin do chủ trọ tự khai, đang xếp lịch kiểm định thực tế">
                                                    <Clock size={13} className="badge-icon-pending" />
                                                    <span>CHỜ ĐỐI CHIẾU THỰC ĐỊA</span>
                                                </span>
                                            )}
                                            {room.roomType && (
                                                <span className="room-badge-type">
                                                    {formatRoomTypeBadge(room.roomType)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Floating Top Right: Heart favorite */}
                                        <div className="card-floating-top-right" onClick={(e) => e.stopPropagation()}>
                                            <RoomFavoriteButton
                                                favoritePayload={mapPublicRoomToFavorite(room, name, address)}
                                                className="room-card-fav-btn"
                                            />
                                        </div>

                                        {/* Floating Bottom Left: Photo Counter */}
                                        <div className="card-floating-bottom-left">
                                            {images.length > 0 && (
                                                <div className="img-count">
                                                    <Camera size={12} />
                                                    <span>{images.length} ảnh thực tế</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Floating Bottom Right: Available status */}
                                        <div className="card-floating-bottom-right">
                                            <span className="room-badge-available">
                                                <span className="available-dot" /> Còn phòng trống
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="room-card-body">
                                        <h3 className="room-card-title" title={name}>{name}</h3>

                                        {/* Price · Area · Capacity · Location */}
                                        <div className="room-card-meta">
                                            <span className="room-card-price">
                                                {formatPrice(room.price, t('listing.pricePerMillion'), t('listing.pricePerDong'))}
                                            </span>
                                            {room.sizeM2 && <span className="room-card-area">{room.sizeM2} m²</span>}
                                            <span className="room-card-capacity">
                                                <Users size={13} /> Tối đa {maxPeople} người
                                            </span>
                                            {address && (
                                                <span className="room-card-location" title={address}>
                                                    <MapPin size={13} />
                                                    {address}
                                                </span>
                                            )}
                                        </div>

                                        {/* Transparent Costs Highlight Strip (HexRoom Value) */}
                                        <div className="room-card-costs-strip">
                                            {costHighlights.isAllInclusive ? (
                                                <span className="cost-tag inclusive">
                                                    <Sparkles size={12} /> Bao trọn gói Điện, Nước & Wifi
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="cost-tag" title="Giá điện niêm yết">
                                                        <Zap size={12} className="cost-icon-zap" /> Điện: <strong>{costHighlights.electricity}</strong>
                                                    </span>
                                                    <span className="cost-tag" title="Giá nước sinh hoạt">
                                                        💧 Nước: <strong>{costHighlights.water}</strong>
                                                    </span>
                                                    <span className="cost-tag" title="Tiền đặt cọc phòng">
                                                        🛡️ Cọc: <strong>{costHighlights.deposit}</strong>
                                                    </span>
                                                    {costHighlights.parking && (
                                                        <span className="cost-tag" title="Phí gửi xe">
                                                            🛵 Xe: <strong>{costHighlights.parking}</strong>
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* 4-Step Inspection Micro Checklist Bar (Core HexRoom Value) */}
                                        {inspection.isInspected ? (
                                            <div className="room-inspection-status-bar verified">
                                                <div className="insp-bar-top">
                                                    <span className="insp-bar-status-text">
                                                        <ShieldCheck size={14} className="text-emerald-600" />
                                                        ĐÃ ĐỐI CHIẾU 4 BƯỚC BỞI HEXROOM INSPECTOR
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                                                        {inspection.inspectedDate && (
                                                            <span className="insp-bar-date">Ngày {inspection.inspectedDate}</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="rooms-book-tour-chip"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBookingRoom(room);
                                                                setBookingSuccess(false);
                                                            }}
                                                            title="Hẹn lịch xem phòng tận nơi cùng Inspector"
                                                        >
                                                            <Calendar size={12} /> Hẹn xem phòng
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="insp-checklist-mini-grid">
                                                    <span className="insp-check-item">
                                                        <Check size={11} /> 1. Hiện trạng phòng
                                                    </span>
                                                    <span className="insp-check-item">
                                                        <Check size={11} /> 2. Giá & Phụ phí
                                                    </span>
                                                    <span className="insp-check-item">
                                                        <Check size={11} /> 3. 100% Ảnh thực tế
                                                    </span>
                                                    <span className="insp-check-item">
                                                        <Check size={11} /> 4. Quyền cho thuê
                                                    </span>
                                                </div>
                                                {inspection.summary && (
                                                    <p className="insp-summary-text">
                                                        “{inspection.summary}”
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="room-inspection-status-bar pending">
                                                <div className="insp-bar-top">
                                                    <span className="insp-bar-status-text-pending">
                                                        <AlertTriangle size={14} className="text-amber-600" />
                                                        CHƯA QUA ĐỐI CHIẾU THỰC ĐỊA (CHỦ NHÀ TỰ KHAI)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="rooms-book-tour-chip pending"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBookingRoom(room);
                                                            setBookingSuccess(false);
                                                        }}
                                                        title="Hẹn lịch xem phòng cùng Inspector đối chiếu"
                                                    >
                                                        <Calendar size={12} /> Hẹn xem phòng
                                                    </button>
                                                </div>
                                                <p className="insp-pending-note">
                                                    Thông tin và hình ảnh do chủ phòng tự đăng tải. HexRoom đang xếp lịch cử Inspector đến đo đạc kiểm tra tại chỗ.
                                                </p>
                                            </div>
                                        )}

                                        {/* Amenities */}
                                        {amenities.length > 0 && (
                                            <div className="room-card-amenities">
                                                {amenities.slice(0, 5).map((a) => (
                                                    <span key={a.id} className="room-card-amenity">
                                                        {a.name}
                                                    </span>
                                                ))}
                                                {amenities.length > 5 && (
                                                    <span className="room-card-amenity more">+{amenities.length - 5} tiện ích</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Description */}
                                        {desc && <p className="room-card-desc">{desc}</p>}

                                        {/* Detailed Fee Breakdown Box (Hiển thị khi chọn chế độ Xem chi tiết biểu phí) */}
                                        {viewMode === 'detailed' && (
                                            <div className="rooms-detail-breakdown-box">
                                                <div className="rooms-detail-fee-item">
                                                    <span>⚡ Điện sinh hoạt</span>
                                                    <span>{costHighlights.electricity}</span>
                                                </div>
                                                <div className="rooms-detail-fee-item">
                                                    <span>💧 Nước sinh hoạt</span>
                                                    <span>{costHighlights.water}</span>
                                                </div>
                                                <div className="rooms-detail-fee-item">
                                                    <span>🛡️ Tiền đặt cọc</span>
                                                    <span>{costHighlights.deposit}</span>
                                                </div>
                                                <div className="rooms-detail-fee-item">
                                                    <span>🛵 Phí gửi xe</span>
                                                    <span>{costHighlights.parking || 'Miễn phí'}</span>
                                                </div>
                                                <div className="rooms-detail-fee-item">
                                                    <span>🌐 Dịch vụ / Wifi</span>
                                                    <span>{costHighlights.service || 'Miễn phí'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Landlord / Host Profile Section */}
                                        <div className="room-card-landlord-container">
                                            <div className="landlord-main-info">
                                                <div className="landlord-avatar-wrapper">
                                                    <img
                                                        src={landlord.avatarUrl}
                                                        alt={landlord.fullName}
                                                        className="landlord-avatar-image"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80';
                                                        }}
                                                    />
                                                    <span className={`landlord-badge-dot ${landlord.isIdentityVerified ? 'verified' : ''}`} />
                                                </div>
                                                <div className="landlord-text-col">
                                                    <div className="landlord-heading-row">
                                                        <span className="landlord-full-name">{landlord.fullName}</span>
                                                        <span className="landlord-rating-pill">
                                                            ⭐ {landlord.rating} <small>({landlord.reviewCount})</small>
                                                        </span>
                                                    </div>
                                                    <div className="landlord-sub-row">
                                                        {landlord.isIdentityVerified ? (
                                                            <span className="landlord-id-status verified">
                                                                <ShieldCheck size={12} /> {landlord.identityBadge}
                                                            </span>
                                                        ) : (
                                                            <span className="landlord-id-status pending">
                                                                <Clock size={12} /> {landlord.identityBadge}
                                                            </span>
                                                        )}
                                                        <span className="sub-sep">·</span>
                                                        <span className="landlord-response-time">{landlord.responseTime}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Column: Số điện thoại với Xem chi tiết xếp thành một cột */}
                                            <div className="landlord-action-wrapper" onClick={(e) => e.stopPropagation()}>
                                                <a
                                                    href={`tel:${landlord.phone}`}
                                                    className="btn-call-landlord"
                                                    title={`Gọi cho ${landlord.fullName}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Phone size={13} />
                                                    <span>{landlord.phone}</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    className="btn-view-transparency"
                                                    onClick={() => handleRoomClick(room.id)}
                                                    title="Xem chi tiết hồ sơ minh bạch phòng"
                                                >
                                                    <span>Xem chi tiết</span>
                                                    <ChevronRight size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="rooms-pagination">
                        <button
                            type="button"
                            className="rooms-page-btn"
                            disabled={pagination.page <= 1}
                            onClick={() => goToPage(pagination.page - 1)}
                            aria-label="Trang trước"
                        >
                            ‹
                        </button>
                        {pageNumbers.map((num) => (
                            <button
                                key={num}
                                type="button"
                                className={`rooms-page-btn ${num === pagination.page ? 'active' : ''}`}
                                onClick={() => goToPage(num)}
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="rooms-page-btn"
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => goToPage(pagination.page + 1)}
                            aria-label="Trang tiếp"
                        >
                            ›
                        </button>
                    </div>
                )}
                {/* Quick Appointment Modal */}
                {bookingRoom && (
                    <div className="hx-modal-backdrop" onClick={() => setBookingRoom(null)}>
                        <div className="hx-modal-dialog" onClick={(e) => e.stopPropagation()}>
                            <div className="hx-modal-header">
                                <div>
                                    <h3 className="hx-modal-title">Hẹn lịch xem phòng trực tiếp</h3>
                                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>
                                        {bookingRoom.roomName || bookingRoom.title}
                                    </p>
                                </div>
                                <button className="hx-modal-close" onClick={() => setBookingRoom(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            {bookingSuccess ? (
                                <div style={{ textAlign: "center", padding: "20px 0" }}>
                                    <div style={{ width: 60, height: 60, background: "#ECFDF5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#10B981" }}>
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>
                                        Đặt lịch hẹn xem phòng thành công!
                                    </h4>
                                    <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 16px" }}>
                                        Yêu cầu xem phòng vào <strong>{bookingData.timeSlot}</strong> ngày <strong>{bookingData.date === "today" ? "Hôm nay" : bookingData.date === "tomorrow" ? "Ngày mai" : bookingData.date}</strong> đã được gửi tới chủ nhà và điều phối viên HexRoom.
                                    </p>
                                    <div style={{ background: "#F8FAFC", padding: 14, borderRadius: 12, textAlign: "left", marginBottom: 20 }}>
                                        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>ĐỊA CHỈ XEM PHÒNG:</div>
                                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
                                            {bookingRoom.address || bookingRoom.rental?.location?.address || "Quận Bình Thạnh, TP.HCM"}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#059669", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                            <ShieldCheck size={14} /> Có biên bản kiểm định 4 bước đối chiếu tại chỗ
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="hx-hero-submit-btn"
                                        style={{ width: "100%" }}
                                        onClick={() => setBookingRoom(null)}
                                    >
                                        Đã hiểu & Đóng
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleConfirmBooking} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                                            1. Chọn ngày xem phòng:
                                        </label>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            {["today", "tomorrow", "weekend"].map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    className={`rooms-price-chip ${bookingData.date === d ? "active" : ""}`}
                                                    style={{ flex: 1, padding: "8px 0", textAlign: "center" }}
                                                    onClick={() => setBookingData(prev => ({ ...prev, date: d }))}
                                                >
                                                    {d === "today" ? "Hôm nay" : d === "tomorrow" ? "Ngày mai" : "Cuối tuần"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                                            2. Chọn khung giờ thuận tiện:
                                        </label>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                                            {["09:00 - 11:30", "14:00 - 16:30", "18:00 - 20:00"].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    className={`rooms-price-chip ${bookingData.timeSlot === t ? "active" : ""}`}
                                                    style={{ padding: "8px 0", textAlign: "center", fontSize: 12 }}
                                                    onClick={() => setBookingData(prev => ({ ...prev, timeSlot: t }))}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                            3. Họ và tên của bạn:
                                        </label>
                                        <input
                                            required
                                            className="rooms-price-input"
                                            style={{ width: "100%", padding: "9px 12px" }}
                                            placeholder="Nguyễn Văn A"
                                            value={bookingData.name}
                                            onChange={e => setBookingData(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                                            4. Số điện thoại nhận xác nhận (Zalo/SMS):
                                        </label>
                                        <input
                                            required
                                            type="tel"
                                            className="rooms-price-input"
                                            style={{ width: "100%", padding: "9px 12px" }}
                                            placeholder="0912 345 678"
                                            value={bookingData.phone}
                                            onChange={e => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                    </div>

                                    <div style={{ background: "#ECFDF5", padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "#047857", display: "flex", alignItems: "center", gap: 6 }}>
                                        <ShieldCheck size={16} />
                                        <span>HexRoom cam kết: Không thu bất kỳ phí dẫn khách nào, bảo mật SĐT 100%.</span>
                                    </div>

                                    <button type="submit" className="hx-hero-submit-btn" style={{ width: "100%", padding: "12px 0", marginTop: 6 }}>
                                        Xác nhận lịch hẹn xem phòng miễn phí
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
                </main>

            <Footer />
        </div>
    );
}
