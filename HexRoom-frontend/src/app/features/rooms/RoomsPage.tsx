import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    MapPin, Camera, Search, SlidersHorizontal, ShieldCheck,
    CheckCircle2, Clock, AlertTriangle, Check, Users, Sparkles,
    ChevronRight, Zap, Phone, X, ChevronDown, ChevronUp, RotateCcw, Filter, Building,
    LayoutGrid, List, Calendar, Tag
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
import { useAuth } from '@/app/context/useAuth';
import { saveViewingAppointment } from '@/lib/room-viewing-history';
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

    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');
    const [bookingRoom, setBookingRoom] = useState<PublicRoomItem | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingData, setBookingData] = useState({
        date: 'tomorrow',
        timeSlot: '14:00 - 16:00',
        phone: '',
        name: '',
        note: '',
    });

    useEffect(() => {
        if (user) {
            setBookingData((prev) => ({
                ...prev,
                name: prev.name || user.fullName || '',
                phone: prev.phone || user.phone || '',
            }));
        }
    }, [user]);

    const [isFilterExpanded, setIsFilterExpanded] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
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
                const rawItems = res.data || [];
                setAllAvailableRooms(rawItems);
                let items = [...rawItems];

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
                    const uni = POPULAR_UNIVERSITIES.find((u) => u.id === universityFromUrl);
                    if (uni) {
                        const uniDist = uni.district.toLowerCase();
                        const uniTerm = uni.shortName.toLowerCase();
                        items = items.filter(
                            (r) =>
                                (r.district || '').toLowerCase().includes(uniDist) ||
                                (r.roomName || '').toLowerCase().includes(uniTerm) ||
                                (r.description || '').toLowerCase().includes(uniTerm) ||
                                (r.address || '').toLowerCase().includes(uniDist)
                        );
                    }
                }

                if (policiesFromUrl.length > 0) {
                    items = items.filter((r) => {
                        const text = (
                            (r.description || '') +
                            ' ' +
                            (r.amenities || []).map((a: any) => (typeof a === 'string' ? a : a.name)).join(' ')
                        ).toLowerCase();
                        return policiesFromUrl.every((pId) => {
                            const pol = FILTER_POLICIES.find((p) => p.id === pId);
                            return pol ? text.includes(pol.keyword.toLowerCase()) : true;
                        });
                    });
                }

                if (targetTenantFromUrl === 'female_only') {
                    items = items.filter((r) => (r.description || '').toLowerCase().includes('nữ'));
                } else if (targetTenantFromUrl === 'male_only') {
                    items = items.filter((r) => (r.description || '').toLowerCase().includes('nam'));
                } else if (targetTenantFromUrl === 'student') {
                    items = items.filter(
                        (r) => r.price <= 4500000 || (r.description || '').toLowerCase().includes('sinh viên')
                    );
                }

                if (amenitiesFromUrl.length > 0) {
                    items = items.filter((r) => {
                        const rAms = (r.amenities || []).map((a) => (typeof a === 'string' ? a : a.name));
                        return amenitiesFromUrl.every((req) =>
                            rAms.some((ra) => ra.toLowerCase().includes(req.toLowerCase()))
                        );
                    });
                }

                setRooms(items);
                setPagination(
                    res.pagination || {
                        page: pageFromUrl,
                        limit: PAGE_SIZE,
                        total: items.length,
                        pages: Math.ceil(items.length / PAGE_SIZE) || 1,
                    }
                );
            })
            .catch((err) => {
                if (!active) return;
                setRooms([]);
                setAllAvailableRooms([]);
                setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
                setLoadError(err?.message || 'Không thể tải danh sách phòng');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [
        pageFromUrl,
        roomTypeFromUrl,
        minPriceFromUrl,
        maxPriceFromUrl,
        minSizeFromUrl,
        maxSizeFromUrl,
        sortFromUrl,
        keywordFromUrl,
        cityFromUrl,
        districtFromUrl,
        amenitiesFromUrl,
        inspectionFromUrl,
        universityFromUrl,
        targetTenantFromUrl,
        policiesFromUrl,
        reload,
    ]);

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
        if (bookingRoom) {
            const apptDate = bookingData.date === 'today'
                ? new Date().toISOString().split('T')[0]
                : bookingData.date === 'tomorrow'
                    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    : new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

            saveViewingAppointment({
                tenantName: bookingData.name || user?.fullName || 'Khách xem phòng',
                tenantPhone: bookingData.phone || user?.phone || '0908 000 000',
                tenantEmail: user?.email || '',
                roomId: bookingRoom.id,
                roomName: bookingRoom.roomName || bookingRoom.title || 'Phòng trọ HexRoom',
                rentalTitle: bookingRoom.rental?.title || 'Tòa nhà căn hộ HexRoom',
                rentalAddress: bookingRoom.address || bookingRoom.rental?.location?.address || 'TP. Hồ Chí Minh',
                appointmentDate: apptDate,
                appointmentTimeSlot: bookingData.timeSlot,
                feedbackNote: bookingData.note || 'Khách hẹn xem phòng trực tiếp từ website HexRoom',
                status: 'CONFIRMED',
                outcome: 'PENDING',
                hostOrStaff: 'Chủ nhà trực tiếp',
            });

            try {
                const existingRaw = localStorage.getItem('hexroom_local_bookings');
                const existingList = existingRaw ? JSON.parse(existingRaw) : [];
                const newBookingItem = {
                    id: `HXR-BOOK-${Date.now().toString().slice(-6)}`,
                    userId: user?.id,
                    tenantId: user?.id,
                    roomId: bookingRoom.id,
                    roomName: bookingRoom.roomName || bookingRoom.title || 'Phòng trọ HexRoom',
                    propertyName: bookingRoom.rental?.title || 'Tòa nhà HexRoom',
                    propertyImage: bookingRoom.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
                    address: bookingRoom.address || bookingRoom.rental?.location?.address || 'TP. Hồ Chí Minh',
                    landlordName: 'Chủ trọ HexRoom',
                    landlordPhone: '0908 123 456',
                    tenantName: bookingData.name || user?.fullName || 'Khách xem phòng',
                    tenantPhone: bookingData.phone || user?.phone || '0908 000 000',
                    tenantEmail: user?.email || '',
                    startDate: apptDate,
                    endDate: apptDate,
                    appointmentDate: apptDate,
                    appointmentTime: bookingData.timeSlot,
                    bookingType: 'VIEWING' as const,
                    status: 'upcoming' as const,
                    price: bookingRoom.price,
                    notes: bookingData.note || 'Khách hẹn xem phòng trực tiếp từ website HexRoom',
                    hasReview: false,
                    canReview: false,
                };
                localStorage.setItem('hexroom_local_bookings', JSON.stringify([newBookingItem, ...(Array.isArray(existingList) ? existingList : [])]));
            } catch {
                // ignore
            }
        }
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

            <main className="w-full max-w-[100%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
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

                {/* 2-Column Full-Width Layout: Filter on LEFT, Rooms on RIGHT */}
                <div className="rooms-layout-wrap">
                    {/* Left Column: Filter Sidebar - Sát bên trái */}
                    <aside className="rooms-filter-sidebar-col">
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
                                <div className="rooms-price-chips rooms-size-chips">
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
                    </aside>

                    {/* Right Column: Rooms Content - Mở rộng hết sang bên phải */}
                    <div className="rooms-content-col">


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

                {/* Action Bar: Result count */}
                <div className="rooms-toolbar-action-row" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                            {universityFromUrl
                                ? `Phòng gần ${POPULAR_UNIVERSITIES.find(u => u.id === universityFromUrl)?.name}`
                                : cityFromUrl
                                    ? `Phòng trọ tại ${cityFromUrl}`
                                    : 'Danh sách phòng trọ'}
                        </span>
                        <span style={{ fontSize: 13, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 10px', borderRadius: 999, fontWeight: 700 }}>
                            {rooms.length} phòng khả dụng
                        </span>
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
                    <div className="rooms-card-grid">
                        {rooms.map((room) => {
                            const images = room.images || [];
                            const mainImg = images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80';
                            const loc = room.rental?.location;
                            const address = loc
                                ? [loc.address, loc.district, loc.city].filter(Boolean).join(', ')
                                : ((room as any).address
                                    ? (room as any).address
                                    : ((room as any).district ? `${(room as any).district}, ${(room as any).city || ''}` : 'TP. Hồ Chí Minh'));
                            const name = room.roomName || room.title || t('rooms.title');
                            const maxPeople = room.maxPeople || 2;
                            const sizeM2 = room.sizeM2 || 24;
                            const inspectionProfile = getRoomLandlordAndInspection(room)?.inspection;
                            const isInspected = Boolean(
                                inspectionProfile?.isInspected ||
                                (room as any).isInspected ||
                                (room as any).isVerified ||
                                inspectionProfile?.status === 'VERIFIED'
                            );

                            return (
                                <div
                                    key={room.id}
                                    className="room-card"
                                    onClick={() => handleRoomClick(room.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRoomClick(room.id)}
                                >
                                    {/* Image with Status Pill, Diagonal Ribbon & Favorite */}
                                    <div className="room-card-images">
                                        <img
                                            src={mainImg}
                                            alt={name}
                                            crossOrigin="anonymous"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80';
                                            }}
                                        />

                                        {/* Status pill top-left: • Còn trống */}
                                        <div className="room-badge-status-pill">
                                            <span className="status-dot" /> Còn trống
                                        </div>

                                        {/* Băng rôn chéo đánh dấu phòng đã kiểm định */}
                                        {isInspected && (
                                            <div
                                                className="room-corner-ribbon-wrap"
                                                title="Phòng đã được chuyên viên HexRoom đối chiếu & kiểm định thực tế"
                                            >
                                                <div className="room-corner-ribbon">
                                                    <ShieldCheck size={8} strokeWidth={2.4} />
                                                    <span>ĐÃ KIỂM ĐỊNH</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Heart favorite bottom-right */}
                                        <div className="card-floating-bottom-right" onClick={(e) => e.stopPropagation()}>
                                            <RoomFavoriteButton
                                                favoritePayload={mapPublicRoomToFavorite(room, name, address)}
                                                className="room-card-fav-btn"
                                            />
                                        </div>
                                    </div>

                                    {/* Card Body: Title, Location, Specs, Price */}
                                    <div className="room-card-body">
                                        <h3 className="room-card-title" title={name}>{name}</h3>

                                        <div className="room-card-location" title={address}>
                                            <MapPin size={13} className="shrink-0 text-slate-400" />
                                            <span className="truncate">{address}</span>
                                        </div>

                                        <div className="room-card-specs">
                                            <span className="spec-item">
                                                <Tag size={12} className="shrink-0" />
                                                <span>{sizeM2} m²</span>
                                            </span>
                                            <span className="spec-item">
                                                <Users size={12} className="shrink-0" />
                                                <span>{maxPeople} người</span>
                                            </span>
                                            <span className="spec-item">
                                                <span>{formatRoomTypeBadge(room.roomType)}</span>
                                            </span>
                                        </div>

                                        <div className="room-card-price-row">
                                            <span className="price-val">
                                                {Number(room.price).toLocaleString('vi-VN')} đ
                                            </span>
                                            <span className="price-unit">/tháng</span>
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
                    </div>
                </div>
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
