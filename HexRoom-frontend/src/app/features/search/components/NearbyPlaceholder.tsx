import { useState } from 'react';
import { MapPin, Navigation, Loader2, School, Utensils, Hospital, ShoppingBag, Bus, Trees, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '@/app/hooks/useGeolocation';
import type { NearbyPOICategory } from '../types';

interface NearbySearchBlockProps {
    onSearchNearby: (lat: number, lng: number, radius?: number) => void;
    isSearching: boolean;
    results?: Array<{ nearbyPOIs?: Record<string, NearbyPOICategory>; distanceKm?: number }>;
    isLoggedIn: boolean;
}

const RADIUS_OPTIONS = [
    { value: 1, label: '1 km' },
    { value: 2, label: '2 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 20, label: '20 km' },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    education: <School className="w-4 h-4" />,
    food: <Utensils className="w-4 h-4" />,
    healthcare: <Hospital className="w-4 h-4" />,
    shopping: <ShoppingBag className="w-4 h-4" />,
    transport: <Bus className="w-4 h-4" />,
    park: <Trees className="w-4 h-4" />,
    safety: <Shield className="w-4 h-4" />,
};

export function NearbyPlaceholder({ onSearchNearby, isSearching, isLoggedIn }: NearbySearchBlockProps) {
    const geo = useGeolocation();
    const { t } = useTranslation();
    const [radius, setRadius] = useState(5);
    const [showDetails, setShowDetails] = useState(false);

    if (!isLoggedIn) return null;

    const handleGetLocationAndSearch = () => {
        if (geo.hasLocation) {
            onSearchNearby(geo.latitude!, geo.longitude!, radius);
            return;
        }

        geo.requestLocation();
    };

    return (
        <div className="mb-8 p-6 rounded-2xl border border-border bg-card">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
                <Navigation className="w-5 h-5 text-primary" />
                {t('nearby.title')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
                {t('nearby.desc')}
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Radius selector */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('nearby.radius')}</label>
                    <select
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                        {RADIUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Find nearby button */}
                <button
                    onClick={handleGetLocationAndSearch}
                    disabled={isSearching || geo.loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {geo.loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('nearby.gettingLocation')}
                        </>
                    ) : isSearching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('search.searching')}
                        </>
                    ) : (
                        <>
                            <MapPin className="w-4 h-4" />
                            {t('nearby.findNearby')}
                        </>
                    )}
                </button>

                {/* Location status */}
                {geo.hasLocation && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium">
                        <MapPin className="w-3 h-3" />
                        {t('nearby.locationDetected')}
                        <button
                            onClick={geo.clearLocation}
                            className="ml-1 text-green-500 hover:text-green-700 transition-colors"
                            title={t('nearby.clearLocation')}
                        >
                            ✕
                        </button>
                    </span>
                )}
            </div>

            {/* Error message */}
            {geo.error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                    {geo.error}
                </div>
            )}

            {/* POI category legend */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {t('nearby.showCategories')}
            </button>

            {showDetails && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                        <span
                            key={key}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs"
                        >
                            {icon} {t(`nearby.categories.${key}`)}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// Previously this component auto-triggered a nearby search as soon as
// location was available. To ensure "Tìm phòng gần bạn" only runs when
// the user explicitly turns it on, all auto-trigger behavior has been removed.
