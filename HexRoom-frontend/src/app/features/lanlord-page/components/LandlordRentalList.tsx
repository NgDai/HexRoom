import { useMemo, useState } from 'react';
import { Tag, Typography, Empty, Select, Input, Checkbox, InputNumber, Button } from 'antd';
import {
    EnvironmentOutlined,
    HeartOutlined,
    HeartFilled,
    PictureOutlined,
    LeftOutlined,
    RightOutlined,
    HomeOutlined,
    TeamOutlined,
    ExpandOutlined,
    SearchOutlined,
    FilterOutlined,
    DownOutlined,
    UpOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';

const { Text, Title } = Typography;

/* ───── Types ───── */

interface RentalItem {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    location: { address: string; district: string | null; city: string | null } | null;
    images: string[];
    roomCount: number;
}

interface RoomItem {
    id: string;
    rentalId: string;
    rentalTitle: string;
    roomName: string | null;
    description: string | null;
    roomType: string | null;
    price: number;
    sizeM2: number | null;
    maxPeople: number | null;
    status: string;
    createdAt: string;
    location: { address: string; district: string | null; city: string | null } | null;
    images: string[];
    amenities: string[];
}

interface LandlordRentalListProps {
    rentals: RentalItem[];
    rooms: RoomItem[];
    stats: {
        totalRentals: number;
        activeRentals: number;
        totalRooms: number;
        availableRooms: number;
    };
}

/* ───── Constants ───── */

const ROOM_TYPE_LABELS: Record<string, string> = {
    PRIVATE: 'Phòng riêng',
    SHARED: 'Phòng ghép',
    STUDIO: 'Studio',
    APARTMENT: 'Chung cư mini',
};

const PRICE_RANGES = [
    { value: 'all', label: 'Tất cả mức giá' },
    { value: '0-2000000', label: 'Dưới 2 triệu' },
    { value: '2000000-3000000', label: '2 - 3 triệu' },
    { value: '3000000-5000000', label: '3 - 5 triệu' },
    { value: '5000000-7000000', label: '5 - 7 triệu' },
    { value: '7000000-10000000', label: '7 - 10 triệu' },
    { value: '10000000-99999999', label: 'Trên 10 triệu' },
];

const ITEMS_PER_PAGE = 8;

/* ───── Helpers ───── */

function formatPrice(price: number): string {
    if (price >= 1_000_000) {
        const m = price / 1_000_000;
        return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} triệu`;
    }
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Hôm qua';
    if (days < 30) return `${days} ngày trước`;
    return `${Math.floor(days / 30)} tháng trước`;
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export function LandlordRentalList({ rentals, rooms, stats }: LandlordRentalListProps) {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    /* ── Filter state ── */
    const [searchText, setSearchText] = useState('');
    const [selectedRental, setSelectedRental] = useState<string>('all');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedPrice, setSelectedPrice] = useState<string>('all');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [minArea, setMinArea] = useState<number | null>(null);
    const [maxArea, setMaxArea] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const toggleFavorite = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    /* ── Derived data ── */
    const allAmenities = useMemo(() => {
        const set = new Set<string>();
        rooms.forEach((r) => r.amenities.forEach((a) => set.add(a)));
        return Array.from(set).sort();
    }, [rooms]);

    const districts = useMemo(() => {
        const set = new Set<string>();
        rooms.forEach((r) => { if (r.location?.district) set.add(r.location.district); });
        return Array.from(set).sort();
    }, [rooms]);

    const roomTypes = useMemo(() => {
        const set = new Set<string>();
        rooms.forEach((r) => { if (r.roomType) set.add(r.roomType); });
        return Array.from(set).sort();
    }, [rooms]);

    /* ── Filter logic ── */
    const filteredRooms = useMemo(() => {
        let list = rooms;

        // Search text
        if (searchText.trim()) {
            const q = searchText.trim().toLowerCase();
            list = list.filter((r) =>
                (r.roomName || '').toLowerCase().includes(q) ||
                (r.rentalTitle || '').toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q) ||
                r.amenities.some((a) => a.toLowerCase().includes(q)) ||
                (r.location?.address || '').toLowerCase().includes(q) ||
                (r.location?.district || '').toLowerCase().includes(q)
            );
        }

        // By rental project
        if (selectedRental !== 'all') {
            list = list.filter((r) => r.rentalId === selectedRental);
        }

        // By district
        if (selectedDistrict !== 'all') {
            list = list.filter((r) => r.location?.district === selectedDistrict);
        }

        // By type
        if (selectedType !== 'all') {
            list = list.filter((r) => r.roomType === selectedType);
        }

        // By price range
        if (selectedPrice !== 'all') {
            const [lo, hi] = selectedPrice.split('-').map(Number);
            list = list.filter((r) => r.price >= lo && r.price <= hi);
        }

        // By amenities
        if (selectedAmenities.length > 0) {
            list = list.filter((r) =>
                selectedAmenities.every((a) => r.amenities.includes(a))
            );
        }

        // By area
        if (minArea != null) list = list.filter((r) => (r.sizeM2 ?? 0) >= minArea);
        if (maxArea != null) list = list.filter((r) => (r.sizeM2 ?? Infinity) <= maxArea);

        return list;
    }, [rooms, searchText, selectedRental, selectedDistrict, selectedType, selectedPrice, selectedAmenities, minArea, maxArea]);

    /* ── Pagination ── */
    const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ITEMS_PER_PAGE));
    const pageRooms = filteredRooms.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const resetFilters = () => {
        setSearchText('');
        setSelectedRental('all');
        setSelectedDistrict('all');
        setSelectedType('all');
        setSelectedPrice('all');
        setSelectedAmenities([]);
        setMinArea(null);
        setMaxArea(null);
        setCurrentPage(1);
    };

    const hasActiveFilters = searchText || selectedRental !== 'all' || selectedDistrict !== 'all' ||
        selectedType !== 'all' || selectedPrice !== 'all' || selectedAmenities.length > 0 ||
        minArea != null || maxArea != null;

    return (
        <div className="space-y-6">
            {/* ╔══════════════════════════════════════════════════╗
               ║  SECTION 1: DỰ ÁN NHÀ TRỌ (Rentals)            ║
               ╚══════════════════════════════════════════════════╝ */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6">
                <Title level={4} className="!mb-4 !mt-0 !font-heading flex items-center gap-2">
                    <HomeOutlined className="text-primary" />
                    Dự án nhà trọ ({stats.activeRentals}/{stats.totalRentals})
                </Title>

                {rentals.length === 0 ? (
                    <Empty description="Chưa có dự án nhà trọ nào" className="py-6" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rentals.map((rental) => {
                            const loc = rental.location
                                ? [rental.location.address, rental.location.district, rental.location.city].filter(Boolean).join(', ')
                                : '';
                            return (
                                <div
                                    key={rental.id}
                                    className="group cursor-pointer bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all overflow-hidden"
                                    onClick={() => navigate(`/rental/${rental.id}`)}
                                >
                                    <div className="relative aspect-[16/9] overflow-hidden">
                                        <ImageWithFallback
                                            src={rental.images[0]}
                                            alt={rental.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute top-2 right-2">
                                            <Tag className="bg-primary/90 text-white border-0 text-xs rounded-md font-medium">
                                                {rental.roomCount} phòng
                                            </Tag>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <Text className="block text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                            {rental.title}
                                        </Text>
                                        {loc && (
                                            <Text type="secondary" className="block text-xs mt-1 truncate">
                                                <EnvironmentOutlined className="mr-1" />
                                                {loc}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ╔══════════════════════════════════════════════════╗
               ║  SECTION 2: PHÒNG CHO THUÊ                      ║
               ╚══════════════════════════════════════════════════╝ */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6">
                <Title level={4} className="!mb-4 !mt-0 !font-heading flex items-center gap-2">
                    <SearchOutlined className="text-primary" />
                    Phòng cho thuê ({stats.availableRooms}/{stats.totalRooms})
                </Title>

                {/* ── FILTER PANEL ── */}
                <div className="bg-muted/30 rounded-xl border border-border/50 p-4 sm:p-5 mb-5 space-y-4">
                    {/* Row 1: Search bar */}
                    <Input
                        size="large"
                        placeholder="Nhập địa điểm, tiện nghi hoặc mô tả phòng (vd: Phòng có ban công ...)"
                        prefix={<SearchOutlined className="text-muted-foreground" />}
                        value={searchText}
                        onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                        className="rounded-xl [&_input]:!bg-transparent"
                        allowClear
                    />

                    {/* Row 2: Location filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* By rental project (replaces Tỉnh/TP) */}
                        <Select
                            value={selectedRental}
                            onChange={(v) => { setSelectedRental(v); setCurrentPage(1); }}
                            className="w-full [&_.ant-select-selector]:!rounded-xl"
                            size="large"
                            options={[
                                { value: 'all', label: 'Tất cả dự án' },
                                ...rentals.map((r) => ({ value: r.id, label: r.title })),
                            ]}
                        />
                        {/* District */}
                        <Select
                            value={selectedDistrict}
                            onChange={(v) => { setSelectedDistrict(v); setCurrentPage(1); }}
                            className="w-full [&_.ant-select-selector]:!rounded-xl"
                            size="large"
                            placeholder="Quận / Huyện"
                            options={[
                                { value: 'all', label: 'Tất cả quận/huyện' },
                                ...districts.map((d) => ({ value: d, label: d })),
                            ]}
                        />
                        {/* Detailed address search (already covered by search bar, so just decorative) */}
                        <Input
                            size="large"
                            placeholder="Địa chỉ chi tiết (đường, phố, ...)"
                            className="rounded-xl [&_input]:!bg-transparent"
                            value={searchText}
                            onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    {/* Row 3: Price range + Room type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            value={selectedPrice}
                            onChange={(v) => { setSelectedPrice(v); setCurrentPage(1); }}
                            className="w-full [&_.ant-select-selector]:!rounded-xl"
                            size="large"
                            placeholder="Khoảng giá"
                            options={PRICE_RANGES}
                        />
                        <Select
                            value={selectedType}
                            onChange={(v) => { setSelectedType(v); setCurrentPage(1); }}
                            className="w-full [&_.ant-select-selector]:!rounded-xl"
                            size="large"
                            placeholder="Loại phòng"
                            options={[
                                { value: 'all', label: 'Tất cả loại phòng' },
                                ...roomTypes.map((t) => ({ value: t, label: ROOM_TYPE_LABELS[t] || t })),
                            ]}
                        />
                    </div>

                    {/* Row 4: Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button
                            type="primary"
                            size="large"
                            icon={<SearchOutlined />}
                            className="rounded-xl px-8 min-w-[160px] shadow-sm"
                            style={{ background: '#5a9e8f' }}
                            onClick={() => setCurrentPage(1)}
                        >
                            Tìm kiếm
                        </Button>
                        <Button
                            size="large"
                            icon={showAdvanced ? <UpOutlined /> : <FilterOutlined />}
                            className="rounded-xl px-6"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            Tìm kiếm nâng cao {showAdvanced ? '' : ''}
                            {showAdvanced ? <UpOutlined className="ml-1 text-xs" /> : <DownOutlined className="ml-1 text-xs" />}
                        </Button>
                        {hasActiveFilters && (
                            <Button
                                size="large"
                                className="rounded-xl text-muted-foreground"
                                onClick={resetFilters}
                            >
                                Xóa bộ lọc
                            </Button>
                        )}
                    </div>

                    {/* ── Advanced section ── */}
                    {showAdvanced && (
                        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-5 space-y-5 mt-2 animate-in slide-in-from-top-2 duration-200">
                            {/* Amenities */}
                            {allAmenities.length > 0 && (
                                <div>
                                    <Text strong className="block mb-3 text-sm">Tiện nghi</Text>
                                    <Checkbox.Group
                                        value={selectedAmenities}
                                        onChange={(vals) => { setSelectedAmenities(vals as string[]); setCurrentPage(1); }}
                                        className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5"
                                    >
                                        {allAmenities.map((a) => (
                                            <Checkbox key={a} value={a} className="!ml-0 text-sm">
                                                {a}
                                            </Checkbox>
                                        ))}
                                    </Checkbox.Group>
                                </div>
                            )}

                            {/* Area range */}
                            <div>
                                <Text strong className="block mb-3 text-sm">Diện tích (m²)</Text>
                                <div className="grid grid-cols-2 gap-3 max-w-md">
                                    <InputNumber
                                        size="large"
                                        placeholder="Tối thiểu"
                                        min={0}
                                        value={minArea}
                                        onChange={(v) => { setMinArea(v); setCurrentPage(1); }}
                                        className="w-full [&_input]:!rounded-xl rounded-xl"
                                        addonAfter="m²"
                                    />
                                    <InputNumber
                                        size="large"
                                        placeholder="Tối đa"
                                        min={0}
                                        value={maxArea}
                                        onChange={(v) => { setMaxArea(v); setCurrentPage(1); }}
                                        className="w-full [&_input]:!rounded-xl rounded-xl"
                                        addonAfter="m²"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Results info ── */}
                {hasActiveFilters && (
                    <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
                        <span>
                            Tìm thấy <span className="font-semibold text-foreground">{filteredRooms.length}</span> phòng
                        </span>
                        {selectedRental !== 'all' && (
                            <Tag closable onClose={() => setSelectedRental('all')} className="rounded-full text-xs">
                                {rentals.find((r) => r.id === selectedRental)?.title}
                            </Tag>
                        )}
                        {selectedDistrict !== 'all' && (
                            <Tag closable onClose={() => setSelectedDistrict('all')} className="rounded-full text-xs">
                                {selectedDistrict}
                            </Tag>
                        )}
                        {selectedType !== 'all' && (
                            <Tag closable onClose={() => setSelectedType('all')} className="rounded-full text-xs">
                                {ROOM_TYPE_LABELS[selectedType] || selectedType}
                            </Tag>
                        )}
                        {selectedPrice !== 'all' && (
                            <Tag closable onClose={() => setSelectedPrice('all')} className="rounded-full text-xs">
                                {PRICE_RANGES.find((p) => p.value === selectedPrice)?.label}
                            </Tag>
                        )}
                        {selectedAmenities.map((a) => (
                            <Tag key={a} closable onClose={() => setSelectedAmenities((prev) => prev.filter((x) => x !== a))} className="rounded-full text-xs">
                                {a}
                            </Tag>
                        ))}
                    </div>
                )}

                {/* ── Room Grid ── */}
                {rooms.length === 0 ? (
                    <Empty description="Chưa có phòng nào" className="py-8" />
                ) : pageRooms.length === 0 ? (
                    <Empty description="Không có phòng phù hợp với bộ lọc" className="py-8" />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {pageRooms.map((room) => {
                            const isFav = favorites.has(room.id);
                            const loc = room.location
                                ? [room.location.district, room.location.city].filter(Boolean).join(', ')
                                : '';

                            return (
                                <div
                                    key={room.id}
                                    className="group cursor-pointer"
                                    onClick={() => navigate(`/room/${room.id}`)}
                                >
                                    {/* Image */}
                                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 ring-1 ring-border/30">
                                        <ImageWithFallback
                                            src={room.images[0]}
                                            alt={room.roomName || room.rentalTitle}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        {/* Favorite */}
                                        <button
                                            type="button"
                                            onClick={(e) => toggleFavorite(e, room.id)}
                                            className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                                        >
                                            {isFav ? (
                                                <HeartFilled className="text-sm" style={{ color: '#ff4d4f' }} />
                                            ) : (
                                                <HeartOutlined className="text-sm" />
                                            )}
                                        </button>

                                        {/* Time */}
                                        <div className="absolute bottom-2 left-2">
                                            <Tag className="bg-black/50 backdrop-blur-sm text-white border-0 text-xs rounded-md">
                                                {timeAgo(room.createdAt)}
                                            </Tag>
                                        </div>

                                        {/* Image count */}
                                        {room.images.length > 1 && (
                                            <div className="absolute bottom-2 right-2">
                                                <Tag className="bg-black/50 backdrop-blur-sm text-white border-0 text-xs rounded-md flex items-center gap-1">
                                                    {room.images.length}
                                                    <PictureOutlined className="text-[10px]" />
                                                </Tag>
                                            </div>
                                        )}

                                        {/* Room type badge */}
                                        {room.roomType && (
                                            <div className="absolute top-2 left-2">
                                                <Tag className="bg-primary/80 backdrop-blur-sm text-white border-0 text-[10px] rounded-md">
                                                    {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                                                </Tag>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <Text className="block text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                        {room.roomName || room.rentalTitle}
                                    </Text>
                                    <Text strong className="block text-primary text-sm mt-0.5">
                                        {formatPrice(room.price)}/tháng
                                    </Text>

                                    {/* Meta */}
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                        {room.sizeM2 && (
                                            <span className="flex items-center gap-0.5">
                                                <ExpandOutlined className="text-[10px]" />
                                                {room.sizeM2}m²
                                            </span>
                                        )}
                                        {room.maxPeople && (
                                            <span className="flex items-center gap-0.5">
                                                <TeamOutlined className="text-[10px]" />
                                                {room.maxPeople} người
                                            </span>
                                        )}
                                    </div>

                                    {loc && (
                                        <Text type="secondary" className="block text-xs mt-0.5 truncate">
                                            <EnvironmentOutlined className="mr-1" />
                                            {loc}
                                        </Text>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-6">
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <LeftOutlined className="text-xs" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                            <button
                                key={pg}
                                type="button"
                                onClick={() => setCurrentPage(pg)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === pg
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'border border-border bg-card text-foreground hover:bg-muted hover:border-primary/30'
                                    }`}
                            >
                                {pg}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <RightOutlined className="text-xs" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
