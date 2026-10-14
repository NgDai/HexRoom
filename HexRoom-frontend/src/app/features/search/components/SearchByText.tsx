import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, DollarSign, Maximize, Home, AlertCircle, RotateCcw, Navigation, Loader2 } from 'lucide-react';
import type { SearchCriteria, RoomType } from '../types';
import { useProvinces } from '@/app/hooks/useProvinces';
import { useAmenities } from '@/app/hooks/useAmenities';
import { useRoomTypes } from '@/app/hooks/useRoomTypes';
import { VoiceSearchButton } from '@/app/components/VoiceSearchButton';
import { useGeolocation } from '@/app/hooks/useGeolocation';
import { useAuth } from '@/app/context/useAuth';

interface SearchByTextProps {
    onSearch: (criteria: SearchCriteria) => void;
    isSearching: boolean;
    /** Guest: only name, description, location, price, type. Tenant/VIP: full (area, amenities). */
    basicOnly?: boolean;
    /** Voice search: callback with transcribed text to fill q. */
    onVoiceResult?: (text: string) => void;
    /** Called when "use my location" toggle changes. Used to show/hide nearby search block. */
    onUseMyLocationChange?: (enabled: boolean) => void;
}

interface FormState {
    q: string;
    city: string;
    district: string;
    address: string;
    minPrice: string;
    maxPrice: string;
    minArea: string;
    maxArea: string;
    roomType: RoomType | '';
    selectedAmenities: string[];
}

const initialFormState: FormState = {
    q: '',
    city: '',
    district: '',
    address: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    roomType: '',
    selectedAmenities: [],
};

function normalizeAdminPrefix(value: string): string {
    if (!value) return '';
    return value
        .trim()
        .replace(/^(thành\s*phố|tp\.?|tỉnh)\s+/i, '');
}

function formStateFromSearchParams(searchParams: URLSearchParams): FormState {
    const q = searchParams.get('q') || '';
    const city = normalizeAdminPrefix(searchParams.get('city') || '');
    const district = normalizeAdminPrefix(searchParams.get('district') || '');
    const address = searchParams.get('address') || '';
    const roomType = searchParams.get('roomType') || '';
    const price = searchParams.get('price') || '';
    const minPriceParam = searchParams.get('minPrice') || '';
    const maxPriceParam = searchParams.get('maxPrice') || '';
    const amenitiesParam = searchParams.get('amenities');
    const minAreaParam = searchParams.get('minArea');
    const maxAreaParam = searchParams.get('maxArea');

    const [rawMinPrice, rawMaxPrice] = price
        .split('-')
        .map((s) => s.trim())
        .slice(0, 2);
    const parsedMin = rawMinPrice && !Number.isNaN(Number(rawMinPrice)) ? rawMinPrice : '';
    const parsedMax = rawMaxPrice && !Number.isNaN(Number(rawMaxPrice)) ? rawMaxPrice : '';
    const minPrice = minPriceParam && !Number.isNaN(Number(minPriceParam)) ? minPriceParam : parsedMin;
    const maxPrice = maxPriceParam && !Number.isNaN(Number(maxPriceParam)) ? maxPriceParam : parsedMax;
    const selectedAmenities = amenitiesParam
        ? amenitiesParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    return {
        ...initialFormState,
        q,
        city,
        district,
        address,
        minPrice,
        maxPrice,
        minArea: minAreaParam && !Number.isNaN(Number(minAreaParam)) ? minAreaParam : '',
        maxArea: maxAreaParam && !Number.isNaN(Number(maxAreaParam)) ? maxAreaParam : '',
        roomType: (roomType as RoomType | '') || '',
        selectedAmenities,
    };
}

const syncStateFromParams = (params: URLSearchParams, currentForm: FormState): FormState => {
    const city = normalizeAdminPrefix(params.get('city') || '');
    const district = normalizeAdminPrefix(params.get('district') || '');
    const address = params.get('address') || '';
    const amenitiesParam = params.get('amenities');
    const minAreaParam = params.get('minArea');
    const maxAreaParam = params.get('maxArea');

    if (!city && !district && !address && !amenitiesParam && !minAreaParam && !maxAreaParam) {
        return currentForm;
    }

    const next = { ...currentForm, city, district, address };
    if (amenitiesParam) next.selectedAmenities = amenitiesParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (minAreaParam) next.minArea = minAreaParam;
    if (maxAreaParam) next.maxArea = maxAreaParam;
    return next;
};

export function SearchByText({ onSearch, isSearching, basicOnly = false, onVoiceResult, onUseMyLocationChange }: SearchByTextProps) {
    const { t } = useTranslation();
    const { accessToken } = useAuth();
    const [searchParams] = useSearchParams();

    const currentParamsStr = searchParams.toString();
    const [prevParamsStr, setPrevParamsStr] = useState(currentParamsStr);

    const [formState, setFormState] = useState<FormState>(() => formStateFromSearchParams(searchParams));

    if (currentParamsStr !== prevParamsStr) {
        setPrevParamsStr(currentParamsStr);
        setFormState((prev) => syncStateFromParams(searchParams, prev));
    }
    const [error, setError] = useState('');
    const [useMyLocation, setUseMyLocation] = useState(false);
    const geo = useGeolocation();
    const { provinces, getWardsFor, loading: locationsLoading } = useProvinces();
    const { amenities: amenitiesList } = useAmenities();
    const { options: roomTypeOptions } = useRoomTypes();
    const effectiveRoomTypes = roomTypeOptions.length > 0 ? roomTypeOptions : [
        { value: 'single', label: t('search.roomType') },
        { value: 'double', label: t('search.roomType') },
        { value: 'studio', label: 'Studio' },
        { value: 'apartment', label: t('search.roomType') },
    ];
    const wardOptions = formState.city ? getWardsFor(formState.city) : [];

    const handleInputChange = (key: keyof FormState, value: string) => {
        setFormState((prev) => {
            const next = { ...prev, [key]: value };
            if (key === 'city') next.district = '';
            return next;
        });
    };

    const handleAmenityToggle = (amenityId: string) => {
        setFormState((prev) => ({
            ...prev,
            selectedAmenities: prev.selectedAmenities.includes(amenityId)
                ? prev.selectedAmenities.filter((id) => id !== amenityId)
                : [...prev.selectedAmenities, amenityId],
        }));
    };

    const validateInput = (): boolean => {
        const { minPrice, maxPrice, minArea, maxArea } = formState;

        if (minPrice && isNaN(Number(minPrice))) { setError(t('search.errors.minPriceInvalid')); return false; }
        if (maxPrice && isNaN(Number(maxPrice))) { setError(t('search.errors.maxPriceInvalid')); return false; }
        if (minPrice && Number(minPrice) < 0) { setError(t('search.errors.minPriceNegative')); return false; }
        if (maxPrice && Number(maxPrice) < 0) { setError(t('search.errors.maxPriceNegative')); return false; }
        if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) { setError(t('search.errors.priceRange')); return false; }

        if (minArea && isNaN(Number(minArea))) { setError(t('search.errors.minAreaInvalid')); return false; }
        if (maxArea && isNaN(Number(maxArea))) { setError(t('search.errors.maxAreaInvalid')); return false; }
        if (minArea && Number(minArea) < 0) { setError(t('search.errors.minAreaNegative')); return false; }
        if (maxArea && Number(maxArea) < 0) { setError(t('search.errors.maxAreaNegative')); return false; }
        if (minArea && maxArea && Number(minArea) > Number(maxArea)) { setError(t('search.errors.areaRange')); return false; }

        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateInput()) return;

        const criteria: SearchCriteria = {
            q: formState.q.trim() || undefined,
            city: formState.city.trim() || undefined,
            district: formState.district.trim() || undefined,
            address: formState.address.trim() || undefined,
            minPrice: formState.minPrice ? Number(formState.minPrice) : undefined,
            maxPrice: formState.maxPrice ? Number(formState.maxPrice) : undefined,
            minArea: basicOnly ? undefined : (formState.minArea ? Number(formState.minArea) : undefined),
            maxArea: basicOnly ? undefined : (formState.maxArea ? Number(formState.maxArea) : undefined),
            roomType: formState.roomType || undefined,
            amenities: basicOnly ? undefined : (formState.selectedAmenities.length > 0 ? formState.selectedAmenities : undefined),
            lat: useMyLocation && geo.hasLocation ? geo.latitude! : undefined,
            lng: useMyLocation && geo.hasLocation ? geo.longitude! : undefined,
        };

        onSearch(criteria);
    };

    const handleReset = () => {
        setFormState(initialFormState);
        setError('');
    };

    const handleVoiceResult = useCallback(
        (transcript: string) => {
            setError('');
            const merged = { ...formState, q: transcript };
            const { minPrice, maxPrice, minArea, maxArea } = merged;
            if (minPrice && isNaN(Number(minPrice))) {
                setError(t('search.errors.minPriceInvalid'));
                return;
            }
            if (maxPrice && isNaN(Number(maxPrice))) {
                setError(t('search.errors.maxPriceInvalid'));
                return;
            }
            if (minPrice && Number(minPrice) < 0) {
                setError(t('search.errors.minPriceNegative'));
                return;
            }
            if (maxPrice && Number(maxPrice) < 0) {
                setError(t('search.errors.maxPriceNegative'));
                return;
            }
            if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
                setError(t('search.errors.priceRange'));
                return;
            }
            if (minArea && isNaN(Number(minArea))) {
                setError(t('search.errors.minAreaInvalid'));
                return;
            }
            if (maxArea && isNaN(Number(maxArea))) {
                setError(t('search.errors.maxAreaInvalid'));
                return;
            }
            if (minArea && Number(minArea) < 0) {
                setError(t('search.errors.minAreaNegative'));
                return;
            }
            if (maxArea && Number(maxArea) < 0) {
                setError(t('search.errors.maxAreaNegative'));
                return;
            }
            if (minArea && maxArea && Number(minArea) > Number(maxArea)) {
                setError(t('search.errors.areaRange'));
                return;
            }

            setFormState(merged);
            onVoiceResult?.(transcript);
            const criteria: SearchCriteria = {
                q: transcript.trim() || undefined,
                city: merged.city.trim() || undefined,
                district: merged.district.trim() || undefined,
                address: merged.address.trim() || undefined,
                minPrice: merged.minPrice ? Number(merged.minPrice) : undefined,
                maxPrice: merged.maxPrice ? Number(merged.maxPrice) : undefined,
                minArea: basicOnly ? undefined : (merged.minArea ? Number(merged.minArea) : undefined),
                maxArea: basicOnly ? undefined : (merged.maxArea ? Number(merged.maxArea) : undefined),
                roomType: merged.roomType || undefined,
                amenities: basicOnly ? undefined : (merged.selectedAmenities.length > 0 ? merged.selectedAmenities : undefined),
                lat: useMyLocation && geo.hasLocation ? geo.latitude! : undefined,
                lng: useMyLocation && geo.hasLocation ? geo.longitude! : undefined,
            };
            onSearch(criteria);
        },
        [formState, basicOnly, onSearch, onVoiceResult, t, useMyLocation, geo.hasLocation, geo.latitude, geo.longitude]
    );

    return (
        <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 max-w-4xl mx-auto">
            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Search query + Voice */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 font-medium text-foreground">
                        <Search className="w-4 h-4 text-primary" />
                        {t('search.aiKeyword')}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={formState.q}
                            onChange={(e) => handleInputChange('q', e.target.value)}
                            placeholder={t('search.aiKeywordPlaceholder')}
                            disabled={isSearching}
                            className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                        />
                        <VoiceSearchButton
                            onResult={handleVoiceResult}
                            onInterim={(text) => setFormState((prev) => ({ ...prev, q: text }))}
                            disabled={isSearching}
                            size="md"
                            getAccessToken={accessToken ? async () => accessToken : undefined}
                        />
                    </div>
                </div>

                {/* Location – province → ward → detail */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 font-medium text-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        {t('search.locationLabel')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <select
                            value={formState.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            disabled={isSearching || locationsLoading}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                        >
                            <option value="">{t('search.selectProvince')}</option>
                            {provinces.map((p) => (
                                <option key={p.code} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                        <select
                            value={formState.district}
                            onChange={(e) => handleInputChange('district', e.target.value)}
                            disabled={!formState.city || isSearching || locationsLoading}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                        >
                            <option value="">{t('search.selectWard')}</option>
                            {wardOptions.map((w) => (
                                <option key={w.code} value={w.name}>{w.name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={formState.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            placeholder={t('search.detailAddress')}
                            disabled={isSearching}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Use My Location toggle */}
                {!basicOnly && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useMyLocation}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setUseMyLocation(checked);
                                    onUseMyLocationChange?.(checked);
                                    if (checked && !geo.hasLocation) {
                                        geo.requestLocation();
                                    }
                                }}
                                className="sr-only peer"
                                disabled={isSearching}
                            />
                            <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Navigation className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-medium text-foreground">{t('search.useMyLocation')}</span>
                            {geo.loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
                            {useMyLocation && geo.hasLocation && (
                                <span className="text-xs text-green-600 dark:text-green-400 shrink-0">{t('search.locationDetected')}</span>
                            )}
                            {useMyLocation && geo.error && (
                                <span className="text-xs text-destructive truncate">{geo.error}</span>
                            )}
                        </div>
                        {useMyLocation && geo.hasLocation && (
                            <span className="text-xs text-muted-foreground shrink-0">
                                {t('search.nearbyPriority')}
                            </span>
                        )}
                    </div>
                )}

                {/* Price Range */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 font-medium text-foreground">
                        <DollarSign className="w-4 h-4 text-primary" />
                        {t('search.priceRangeLabel')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={formState.minPrice}
                            onChange={(e) => handleInputChange('minPrice', e.target.value)}
                            placeholder={t('search.minPrice')}
                            disabled={isSearching}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                        />
                        <input
                            type="text"
                            value={formState.maxPrice}
                            onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                            placeholder={t('search.maxPrice')}
                            disabled={isSearching}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Area Range – tenant/VIP only */}
                {!basicOnly && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 font-medium text-foreground">
                            <Maximize className="w-4 h-4 text-primary" />
                            {t('search.areaLabel')}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={formState.minArea}
                                onChange={(e) => handleInputChange('minArea', e.target.value)}
                                placeholder={t('search.minArea')}
                                disabled={isSearching}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                            />
                            <input
                                type="text"
                                value={formState.maxArea}
                                onChange={(e) => handleInputChange('maxArea', e.target.value)}
                                placeholder={t('search.maxArea')}
                                disabled={isSearching}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>
                )}

                {/* Room Type */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 font-medium text-foreground">
                        <Home className="w-4 h-4 text-primary" />
                        {t('search.roomTypeLabel')}
                    </label>
                    <select
                        value={formState.roomType}
                        onChange={(e) => handleInputChange('roomType', e.target.value)}
                        disabled={isSearching}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                    >
                        <option value="">{t('search.selectRoomType')}</option>
                        {effectiveRoomTypes.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Amenities – tenant/VIP only */}
                {!basicOnly && (
                    <div className="space-y-3">
                        <label className="font-medium text-foreground">{t('search.amenitiesLabel')}</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {amenitiesList.map((amenity) => (
                                <label
                                    key={amenity.id}
                                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formState.selectedAmenities.includes(amenity.id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        } ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formState.selectedAmenities.includes(amenity.id)}
                                        onChange={() => handleAmenityToggle(amenity.id)}
                                        disabled={isSearching}
                                        className="w-4 h-4 text-primary accent-primary"
                                    />
                                    <span className="text-sm">{amenity.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        {isSearching ? t('search.searching') : t('search.search')}
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isSearching}
                        className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {t('search.reset')}
                    </button>
                </div>
            </form>
        </div>
    );
}
