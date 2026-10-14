import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Maximize, Star, Heart, CheckCircle, Target, Navigation, School, Utensils, Hospital, ShoppingBag, Bus, Trees, Shield, Eye } from 'lucide-react';
import type { Room } from '../types';
import { formatPrice, getRoomTypeLabel } from '../utils';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { T } from '@/app/components/T';

const POI_ICONS: Record<string, React.ReactNode> = {
    education: <School className="w-3 h-3" />,
    food: <Utensils className="w-3 h-3" />,
    healthcare: <Hospital className="w-3 h-3" />,
    shopping: <ShoppingBag className="w-3 h-3" />,
    transport: <Bus className="w-3 h-3" />,
    park: <Trees className="w-3 h-3" />,
    safety: <Shield className="w-3 h-3" />,
};

interface SearchResultCardProps {
    room: Room;
    isFavorite?: boolean;
    onToggleFavorite?: (roomId: string) => void;
    onViewDetails?: (roomId: string) => void;
}

export function SearchResultCard({
    room,
    isFavorite = false,
    onToggleFavorite,
    onViewDetails,
}: SearchResultCardProps) {
    const { t } = useTranslation();
    return (
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow duration-300 group">
            <div className="relative h-48 overflow-hidden bg-muted">
                <ImageWithFallback
                    src={room.image}
                    alt={room.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {onToggleFavorite && (
                    <button
                        type="button"
                        onClick={() => onToggleFavorite(room.id)}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-card/95 border border-border flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                    >
                        <Heart
                            className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
                            strokeWidth={2}
                        />
                    </button>
                )}

                {/* Available + Match Score + CLIP Similarity */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm ${room.isNearlyAvailable
                            ? 'bg-amber-500 text-white'
                            : room.available
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-600/80 text-white'
                            }`}
                    >
                        {room.isNearlyAvailable
                            ? `Sắp trống${room.daysUntilAvailable != null ? ` (${room.daysUntilAvailable} ngày)` : ''}`
                            : room.available
                                ? t('listing.available')
                                : t('listing.rented')}
                    </span>
                    {room.clipSimilarity != null && room.clipSimilarity > 0 && (
                        <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm bg-violet-600 text-white"
                            title={`CLIP visual similarity: ${room.clipSimilarity.toFixed(1)}%`}
                        >
                            <Eye className="w-3 h-3" />
                            {room.clipSimilarity.toFixed(1)}%
                        </span>
                    )}
                    {room.matchScore != null && room.matchScore > 0 && room.clipSimilarity == null && (
                        <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm bg-amber-500 text-white"
                            title={`Match score: ${Math.round(room.matchScore)}%`}
                        >
                            <Target className="w-3 h-3" />
                            {Math.round(room.matchScore)}%
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
                {/* Title */}
                <h3 className="font-semibold text-foreground line-clamp-2 min-h-12">
                    <T>{room.title}</T>
                </h3>

                {/* Location + Distance */}
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span className="text-sm truncate"><T>{room.location}</T></span>
                    {room.distanceKm != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium shrink-0">
                            <Navigation className="w-3 h-3" />
                            {room.distanceKm < 1
                                ? `${Math.round(room.distanceKm * 1000)}m`
                                : `${room.distanceKm.toFixed(1)}km`}
                        </span>
                    )}
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Maximize className="w-4 h-4" />
                        <span>{room.area}m²</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span>{room.rating ? room.rating.toFixed(1) : '—'}</span>
                    </div>
                </div>

                {/* Room Type Badge */}
                <span className="inline-block px-2.5 py-1 rounded-xl border border-border text-xs font-medium text-muted-foreground">
                    <T>{getRoomTypeLabel(room.roomType)}</T>
                </span>

                {/* Amenities */}
                <div className="flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 3).map((amenity) => (
                        <div
                            key={amenity}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                        >
                            <CheckCircle className="w-3 h-3 text-primary" />
                            <T>{amenity}</T>
                        </div>
                    ))}
                    {room.amenities.length > 3 && (
                        <div className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs text-foreground/60">
                            +{room.amenities.length - 3} {t('listing.amenitiesMore')}
                        </div>
                    )}
                </div>

                {/* Nearby POIs */}
                {room.nearbyPOIs && Object.keys(room.nearbyPOIs).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(room.nearbyPOIs).map(([key, cat]) => (
                            <span
                                key={key}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 text-xs text-primary"
                            >
                                {POI_ICONS[key] || <MapPin className="w-3 h-3" />}
                                <T>{cat.label}</T> ({cat.count})
                            </span>
                        ))}
                    </div>
                )}

                {/* Other rooms in same rental */}
                {room.otherRoomsInRental && room.otherRoomsInRental.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('listing.otherRoomsInRental')}</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {room.otherRoomsInRental.map((r) => (
                                <Link
                                    key={r.id}
                                    to={`/rental/${room.rentalId}?room=${r.id}`}
                                    className="flex-shrink-0 w-20 rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors"
                                >
                                    <ImageWithFallback src={r.image} alt={r.roomName || 'Phòng'} className="w-20 h-14 object-cover" />
                                    <div className="p-1.5 text-center">
                                        <p className="text-xs font-medium truncate">{formatPrice(r.price)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Price */}
                <div className="pt-3 border-t border-border">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-2xl font-bold text-primary">{formatPrice(room.price)}</p>
                            <p className="text-xs text-muted-foreground">{t('listing.perMonth')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onViewDetails?.(room.id)}
                            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
                        >
                            {t('listing.viewDetail')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
