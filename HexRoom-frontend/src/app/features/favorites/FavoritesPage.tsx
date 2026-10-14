import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Trash2, MapPin, Maximize, GitCompare, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/app/context/useFavorites';
import { Header, Footer } from '@/app/features/home/components';

export function FavoritesPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { favorites, removeFavorite } = useFavorites();
    const [comparePick, setComparePick] = useState<string[]>([]);
    const [compareOpen, setCompareOpen] = useState(false);

    const toggleCompareRoom = (id: string) => {
        setComparePick((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length < 2) return [...prev, id];
            return [prev[1], id];
        });
    };

    const compareRooms = useMemo(
        () => favorites.filter((r) => comparePick.includes(r.id)),
        [favorites, comparePick],
    );

    const formatPriceShort = (price: number) => `${(price / 1000000).toFixed(1)}M`;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
            <header className="bg-card border-b border-border sticky top-14 sm:top-16 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                            {t('favorites.back')}
                        </button>
                        <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-accent fill-accent" strokeWidth={2} />
                            <span className="font-medium text-foreground">{t('favorites.savedCount', { count: favorites.length })}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10">
                    <h1 className="font-heading text-3xl font-bold text-foreground mb-2">{t('favorites.title')}</h1>
                    <p className="text-muted-foreground">{t('favorites.subtitle')}</p>
                </div>

                {favorites.length > 0 && (
                    <div className="mb-10 bg-accent/5 rounded-2xl border border-accent/20 p-6">
                        <div className="flex items-start gap-3">
                            <Heart className="w-5 h-5 text-accent fill-accent flex-shrink-0 mt-0.5" strokeWidth={2} />
                            <div>
                                <p className="font-semibold text-foreground mb-1">{t('favorites.tip')}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {t('favorites.tipDesc')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {favorites.length >= 2 && (
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
                        <div className="flex items-start gap-3">
                            <GitCompare className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                            <div>
                                <p className="font-semibold text-foreground">{t('favorites.compareTitle')}</p>
                                <p className="text-sm text-muted-foreground mt-0.5">{t('favorites.compareHint')}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={comparePick.length !== 2}
                            onClick={() => setCompareOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shrink-0"
                        >
                            <GitCompare className="w-4 h-4" strokeWidth={2} />
                            {t('favorites.compareOpen')}
                        </button>
                    </div>
                )}

                {favorites.length > 0 ? (
                    <div className="space-y-5">
                        {favorites.map((room) => {
                            const selected = comparePick.includes(room.id);
                            return (
                                <div
                                    key={room.id}
                                    className="bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border overflow-hidden"
                                >
                                    <div className="flex flex-col md:flex-row gap-5 p-5">
                                        <div className="relative w-full md:w-64 h-48 md:h-auto flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                                            <img src={room.image} alt={room.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                            {!room.available && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="bg-card text-foreground px-4 py-2 rounded-xl font-medium text-sm">
                                                        {t('favorites.rented')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between min-w-0">
                                            <div>
                                                <h3 className="font-heading text-lg font-semibold text-foreground mb-2 line-clamp-2">
                                                    {room.name}
                                                </h3>
                                                <div className="flex items-start gap-2 text-muted-foreground text-sm mb-4">
                                                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                                                    <p className="line-clamp-2">{room.address}</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                                    <span className="flex items-center gap-1">
                                                        <Maximize className="w-4 h-4" strokeWidth={2} />
                                                        {room.area}m²
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                                                <div>
                                                    <p className="text-2xl font-bold text-primary">{formatPriceShort(room.price)}</p>
                                                    <p className="text-sm text-muted-foreground">{t('favorites.perMonth')}</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 justify-end">
                                                    {favorites.length >= 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCompareRoom(room.id)}
                                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${selected
                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                : 'border-border text-foreground hover:border-primary/40'
                                                                }`}
                                                        >
                                                            {selected ? t('favorites.compareSelected') : t('favorites.compareSelect')}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFavorite(room.id)}
                                                        className="p-2.5 rounded-xl border border-border hover:border-destructive/50 hover:bg-destructive/5 transition-colors group"
                                                        title={t('favorites.removeTitle')}
                                                    >
                                                        <Trash2 className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" strokeWidth={2} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/room/${room.id}`)}
                                                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap shadow-sm"
                                                    >
                                                        {t('favorites.viewDetail')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-accent/10 mb-6">
                            <Heart className="w-12 h-12 text-accent" strokeWidth={2} />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-foreground mb-2">{t('favorites.empty')}</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                            {t('favorites.emptyDesc')}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/search')}
                            className="px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            {t('favorites.explore')}
                        </button>
                    </div>
                )}
            </main>

            {compareOpen && compareRooms.length === 2 && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="favorites-compare-title"
                    onClick={() => setCompareOpen(false)}
                >
                    <div
                        className="bg-card rounded-2xl border border-border shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h2 id="favorites-compare-title" className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                                <GitCompare className="w-5 h-5 text-primary" strokeWidth={2} />
                                {t('favorites.compareModalTitle')}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setCompareOpen(false)}
                                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                                aria-label={t('favorites.compareClose')}
                            >
                                <X className="w-5 h-5" strokeWidth={2} />
                            </button>
                        </div>
                        <div className="overflow-x-auto p-5">
                            <table className="w-full text-sm border-collapse min-w-[480px]">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 pr-4 font-semibold text-muted-foreground w-28">{t('favorites.compareField')}</th>
                                        <th className="text-left py-3 px-2 font-semibold text-foreground w-[40%]">{t('favorites.compareRoomA')}</th>
                                        <th className="text-left py-3 pl-2 font-semibold text-foreground w-[40%]">{t('favorites.compareRoomB')}</th>
                                    </tr>
                                </thead>
                                <tbody className="text-foreground">
                                    <tr className="border-b border-border/80 align-top">
                                        <td className="py-3 pr-4 text-muted-foreground font-medium">{t('favorites.fieldName')}</td>
                                        <td className="py-3 px-2 font-medium">{compareRooms[0].name}</td>
                                        <td className="py-3 pl-2 font-medium">{compareRooms[1].name}</td>
                                    </tr>
                                    <tr className="border-b border-border/80 align-top">
                                        <td className="py-3 pr-4 text-muted-foreground font-medium">{t('favorites.fieldAddress')}</td>
                                        <td className="py-3 px-2 text-muted-foreground">{compareRooms[0].address}</td>
                                        <td className="py-3 pl-2 text-muted-foreground">{compareRooms[1].address}</td>
                                    </tr>
                                    <tr className="border-b border-border/80 align-top">
                                        <td className="py-3 pr-4 text-muted-foreground font-medium">{t('favorites.fieldArea')}</td>
                                        <td className="py-3 px-2">{compareRooms[0].area} m²</td>
                                        <td className="py-3 pl-2">{compareRooms[1].area} m²</td>
                                    </tr>
                                    <tr className="border-b border-border/80 align-top">
                                        <td className="py-3 pr-4 text-muted-foreground font-medium">{t('favorites.fieldPrice')}</td>
                                        <td className="py-3 px-2 font-semibold text-primary">
                                            {formatPriceShort(compareRooms[0].price)}
                                            <span className="text-xs font-normal text-muted-foreground"> {t('favorites.perMonth')}</span>
                                        </td>
                                        <td className="py-3 pl-2 font-semibold text-primary">
                                            {formatPriceShort(compareRooms[1].price)}
                                            <span className="text-xs font-normal text-muted-foreground"> {t('favorites.perMonth')}</span>
                                        </td>
                                    </tr>
                                    <tr className="align-top">
                                        <td className="py-3 pr-4 text-muted-foreground font-medium">{t('favorites.fieldStatus')}</td>
                                        <td className="py-3 px-2">
                                            {compareRooms[0].available ? t('favorites.statusAvailable') : t('favorites.statusUnavailable')}
                                        </td>
                                        <td className="py-3 pl-2">
                                            {compareRooms[1].available ? t('favorites.statusAvailable') : t('favorites.statusUnavailable')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="px-5 py-4 border-t border-border bg-muted/20 flex flex-wrap gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => navigate(`/room/${compareRooms[0].id}`)}
                                className="px-4 py-2 rounded-xl border border-border font-medium text-sm hover:bg-muted transition-colors"
                            >
                                {t('favorites.openDetailA')}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/room/${compareRooms[1].id}`)}
                                className="px-4 py-2 rounded-xl border border-border font-medium text-sm hover:bg-muted transition-colors"
                            >
                                {t('favorites.openDetailB')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

export default FavoritesPage;
