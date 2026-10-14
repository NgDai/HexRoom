import { useState, useEffect, useMemo, useCallback } from 'react';//
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { Header, Footer } from '@/app/features/home/components';
import { getPublicRentalsRequest, type PublicRental, type PublicRentalsSort } from '@/lib/api';
import { useProvinces } from '@/app/hooks/useProvinces';

const PAGE_SIZE = 24;

export function BrowsePage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const sortOptions: { value: PublicRentalsSort; label: string }[] = useMemo(() => [
        { value: 'createdAt_desc', label: t('browse.sortNewest') },
        { value: 'createdAt_asc', label: t('browse.sortOldest') },
        { value: 'title_asc', label: t('browse.sortTitleAsc') },
        { value: 'title_desc', label: t('browse.sortTitleDesc') },
    ], [t]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [rentals, setRentals] = useState<PublicRental[]>([]);
    const { provinces, getWardsFor } = useProvinces();
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });

    const districtFromUrl = searchParams.get('district') || '';
    const cityFromUrl = searchParams.get('city') || '';
    const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const sortFromUrl = (searchParams.get('sort') as PublicRentalsSort) || 'createdAt_desc';

    const [showFilters, setShowFilters] = useState(false);

    // Generate a unique string to represent the current query state
    const currentParamsStr = `${pageFromUrl}|${districtFromUrl}|${cityFromUrl}|${sortFromUrl}`;
    const [lastFetchedParams, setLastFetchedParams] = useState<string>('');
    const loading = lastFetchedParams !== currentParamsStr;

    const fetchRentals = useCallback(async () => {
        try {
            const res = await getPublicRentalsRequest({
                page: pageFromUrl,
                limit: PAGE_SIZE,
                district: districtFromUrl || undefined,
                city: cityFromUrl || undefined,
                sort: sortFromUrl,
            });
            setRentals(res.data || []);
            setPagination(res.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
        } catch {
            setRentals([]);
            setPagination((p) => ({ ...p, total: 0, totalPages: 0 }));
        } finally {
            setLastFetchedParams(currentParamsStr);
        }
    }, [currentParamsStr, pageFromUrl, districtFromUrl, cityFromUrl, sortFromUrl]);

    useEffect(() => {
        fetchRentals();
    }, [fetchRentals]);

    const cityOptions = useMemo(() => provinces.map((p) => p.name), [provinces]);
    const wardOptions = useMemo(() => getWardsFor(cityFromUrl).map((w) => w.name), [getWardsFor, cityFromUrl]);

    const handleLogin = () => navigate('/login');
    const handleRegister = () => navigate('/register');
    const handleRentalClick = (id: string) => navigate(`/rental/${id}`);

    const updateParams = (updates: { district?: string; city?: string; page?: number; sort?: string }) => {
        const p = new URLSearchParams(searchParams);
        if (updates.district !== undefined) {
            if (updates.district) p.set('district', updates.district);
            else p.delete('district');
        }
        if (updates.city !== undefined) {
            if (updates.city) p.set('city', updates.city);
            else p.delete('city');
        }
        if (updates.page !== undefined) {
            if (updates.page > 1) p.set('page', String(updates.page));
            else p.delete('page');
        }
        if (updates.sort !== undefined) {
            if (updates.sort) p.set('sort', updates.sort);
            else p.delete('sort');
        }
        setSearchParams(p);
    };

    const applyFilters = (district: string, city: string) => {
        updateParams({ district, city, page: 1 });
    };

    const handleCityChange = (newCity: string) => {
        const wardsInNewCity = new Set(getWardsFor(newCity).map((w) => w.name));
        const validWard =
            newCity && districtFromUrl && wardsInNewCity.has(districtFromUrl) ? districtFromUrl : '';
        applyFilters(validWard, newCity);
    };

    const handleDistrictChange = (newDistrict: string) => {
        applyFilters(newDistrict, cityFromUrl);
    };

    const handleSortChange = (value: PublicRentalsSort) => {
        updateParams({ sort: value, page: 1 });
    };

    const goToPage = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        updateParams({ page: newPage });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={handleLogin} onRegister={handleRegister} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">{t('browse.allRentals')}</h1>
                    <p className="text-muted-foreground">
                        {t('browse.pageSummary', { page: pagination.page, total: pagination.totalPages || 1, count: pagination.total })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-3 py-2.5 sm:px-4 border border-border rounded-xl font-medium hover:bg-muted transition-all min-h-[44px] touch-manipulation"
                    >
                        <Filter className="w-4 h-4 shrink-0" />
                        <span className="text-sm sm:text-base">{t('browse.filterButton')}</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        <select
                            value={sortFromUrl}
                            onChange={(e) => handleSortChange(e.target.value as PublicRentalsSort)}
                            className="px-3 py-2.5 sm:px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 min-h-[44px] text-sm sm:text-base touch-manipulation"
                        >
                            {sortOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border mb-6 sm:mb-8">
                        <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">{t('browse.filterBy')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('browse.city')}
                                </label>
                                <select
                                    value={cityFromUrl}
                                    onChange={(e) => handleCityChange(e.target.value)}
                                    className="w-full px-3 py-2.5 sm:px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 min-h-[44px] touch-manipulation"
                                >
                                    <option value="">{t('browse.all')}</option>
                                    {cityOptions.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('browse.ward')}
                                </label>
                                <select
                                    value={
                                        districtFromUrl && wardOptions.includes(districtFromUrl)
                                            ? districtFromUrl
                                            : ''
                                    }
                                    onChange={(e) => handleDistrictChange(e.target.value)}
                                    className="w-full px-3 py-2.5 sm:px-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 min-h-[44px] touch-manipulation"
                                >
                                    <option value="">{t('browse.all')}</option>
                                    {wardOptions.map((w) => (
                                        <option key={w} value={w}>
                                            {w}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => applyFilters('', '')}
                                className="text-primary font-medium hover:underline"
                            >
                                {t('browse.clearFilters')}
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16 text-muted-foreground">{t('browse.loading')}</div>
                ) : rentals.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        {t('browse.noResults')}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {rentals.map((rental) => (
                                <div
                                    key={rental.id}
                                    onClick={() => handleRentalClick(rental.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRentalClick(rental.id)}
                                    className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="relative h-40 sm:h-48">
                                        <ImageWithFallback
                                            src={rental.images?.[0] || ''}
                                            alt={rental.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-heading font-semibold text-foreground truncate">
                                            {rental.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                                            <MapPin className="w-4 h-4 shrink-0" />
                                            <span className="truncate">
                                                {rental.location?.district}, {rental.location?.city}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="mt-3 w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
                                        >
                                            {t('browse.viewDetail')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => goToPage(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-3 rounded-xl border border-border hover:bg-muted disabled:opacity-50 disabled:pointer-events-none min-w-[44px] min-h-[44px] touch-manipulation"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="px-3 sm:px-4 py-2 text-sm text-muted-foreground">
                                    {t('browse.pageInfo', { page: pagination.page, total: pagination.totalPages })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goToPage(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-3 rounded-xl border border-border hover:bg-muted disabled:opacity-50 disabled:pointer-events-none min-w-[44px] min-h-[44px] touch-manipulation"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}
