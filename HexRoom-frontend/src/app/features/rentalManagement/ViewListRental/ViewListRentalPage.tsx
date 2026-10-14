import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, LayoutGrid, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RentalStatus } from '@/lib/models/rental.model';
import { getMyRentalsRequest } from '@/lib/api';
import { RENTAL_STATUS_OPTIONS } from '../shared/types';

const statusClassName: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    UNAVAILABLE: 'bg-slate-200 text-slate-600',
    HIDDEN: 'bg-orange-100 text-orange-700',
    VIOLATE: 'bg-rose-100 text-rose-700',
    PENDING: 'bg-amber-100 text-amber-700',
    SUSPEND: 'bg-red-100 text-red-700',
};

const ITEMS_PER_PAGE = 5;
const RENTAL_LIST_CACHE_KEY = 'ezroom:rental-list-cache:v1';

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStatusLabel(status: string) {
    return RENTAL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

const DEFAULT_THUMB =
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80';

interface RentalListItem {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: string;
    location: { id: string; address: string; district: string | null; city: string | null } | null;
    images: string[];
    imageCount: number;
}

export function ViewListRentalPage() {
    const navigate = useNavigate();
    const [rentals, setRentals] = useState<RentalListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RentalStatus>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');

    useEffect(() => {
        let active = true;
        let hasCache = false;

        try {
            const cachedRaw = sessionStorage.getItem(RENTAL_LIST_CACHE_KEY);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw) as { rentals?: RentalListItem[] };
                if (Array.isArray(cached?.rentals)) {
                    setRentals(cached.rentals);
                    setIsLoading(false);
                    hasCache = true;
                }
            }
        } catch {
            // Ignore cache parsing errors and continue with network fetch.
        }

        const load = async () => {
            if (!hasCache) {
                setIsLoading(true);
                setLoadError(null);
            }
            try {
                const result = await getMyRentalsRequest({ limit: 100 });
                if (!active) return;
                setRentals(result.data);
                setCurrentPage(1);
                setPageInput('1');
                sessionStorage.setItem(
                    RENTAL_LIST_CACHE_KEY,
                    JSON.stringify({ rentals: result.data, updatedAt: Date.now() })
                );
            } catch (err) {
                if (!active) return;
                if (!hasCache) {
                    setLoadError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
                }
            } finally {
                if (active && !hasCache) setIsLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, []);

    const filteredRentals = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        return rentals.filter((item) => {
            const matchesKeyword =
                normalizedKeyword.length === 0 ||
                item.title.toLowerCase().includes(normalizedKeyword) ||
                (item.location?.address && item.location.address.toLowerCase().includes(normalizedKeyword)) ||
                (item.location?.city && item.location.city.toLowerCase().includes(normalizedKeyword)) ||
                (item.location?.district && item.location.district.toLowerCase().includes(normalizedKeyword));
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesKeyword && matchesStatus;
        });
    }, [keyword, rentals, statusFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        setPageInput('1');
    }, [keyword, statusFilter]);

    const handlePageInputChange = (value: string) => {
        setPageInput(value);
    };

    const handleGoToPage = () => {
        const pageNum = parseInt(pageInput, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            setPageInput(String(currentPage));
            return;
        }
        setCurrentPage(pageNum);
    };

    const handlePreviousPage = () => {
        const newPage = Math.max(1, currentPage - 1);
        setCurrentPage(newPage);
        setPageInput(String(newPage));
    };

    const handleNextPage = () => {
        const newPage = Math.min(totalPages, currentPage + 1);
        setCurrentPage(newPage);
        setPageInput(String(newPage));
    };

    const totalPages = Math.ceil(filteredRentals.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedRentals = filteredRentals.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <section className="mx-auto w-full max-w-6xl">
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Danh sách nhà cho thuê</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Quản lý các bất động sản cho thuê của bạn
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/rental-management/rentals/create')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Thêm nhà cho thuê
                </button>
            </header>

            <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Tìm theo tên, địa chỉ, quận, thành phố..."
                        className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | RentalStatus)}
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="all">Tất cả trạng thái</option>
                    {RENTAL_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Đang tải danh sách...</p>
                </div>
            ) : loadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center shadow-sm">
                    <p className="text-rose-700 font-medium">Lỗi khi tải danh sách</p>
                    <p className="mt-1 text-sm text-rose-600">{loadError}</p>
                </div>
            ) : filteredRentals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                        <Building2 className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Chưa có nhà cho thuê nào</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Thêm bất động sản đầu tiên để bắt đầu quản lý
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/rental-management/rentals/create')}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm nhà cho thuê
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid gap-5">
                        {paginatedRentals.map((item) => (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="grid gap-5 p-5 md:grid-cols-[220px_1fr]">
                                    <img
                                        src={item.images?.[0] ?? DEFAULT_THUMB}
                                        alt={item.title}
                                        crossOrigin="anonymous"
                                        className="h-44 w-full rounded-xl object-cover border border-border"
                                    />
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-heading text-lg font-semibold text-foreground">
                                                {item.title}
                                            </h3>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[item.status] ?? 'bg-slate-100 text-slate-600'}`}
                                            >
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </div>
                                        {item.location && (
                                            <p className="text-sm text-muted-foreground">
                                                {[item.location.address, item.location.district, item.location.city].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {item.description ? (
                                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                                {item.description}
                                            </p>
                                        ) : null}
                                        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                                                <dt className="text-xs text-muted-foreground">Trạng thái</dt>
                                                <dd className="font-medium text-foreground">
                                                    {getStatusLabel(item.status)}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                                                <dt className="text-xs text-muted-foreground">Số ảnh</dt>
                                                <dd className="font-medium text-foreground">{item.imageCount ?? item.images?.length ?? 0}</dd>
                                            </div>
                                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                                                <dt className="text-xs text-muted-foreground">Ngày tạo</dt>
                                                <dd className="font-medium text-foreground">
                                                    {formatDateTime(item.createdAt)}
                                                </dd>
                                            </div>
                                        </dl>
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigate(`/rental-management/rentals/${item.id}`)
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Chi tiết
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigate(
                                                        `/rental-management/rentals/${item.id}/room-posts`
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                                            >
                                                <LayoutGrid className="h-4 w-4" />
                                                Danh sách phòng
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    type="button"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Trước
                                </button>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={pageInput}
                                        onChange={(e) => handlePageInputChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleGoToPage();
                                        }}
                                        className="w-14 rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="1"
                                    />
                                    <span className="text-sm font-medium text-muted-foreground">/ {totalPages}</span>
                                    <button
                                        onClick={handleGoToPage}
                                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                        type="button"
                                    >
                                        Đi
                                    </button>
                                </div>

                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    type="button"
                                >
                                    Tiếp
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Tổng cộng {filteredRentals.length} nhà trọ
                            </p>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
